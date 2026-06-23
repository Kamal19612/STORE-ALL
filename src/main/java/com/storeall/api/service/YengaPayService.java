package com.storeall.api.service;

import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.storeall.api.dto.YengaPayIntentResponse;
import com.storeall.api.entity.Order;
import com.storeall.api.entity.OrderItem;
import com.storeall.api.tenant.StoreContext;
import com.storeall.api.util.PublicSiteUrlResolver;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class YengaPayService {

  private static final Logger log = LoggerFactory.getLogger(YengaPayService.class);
  private static final String API_BASE = "https://api.yengapay.com/api/v1/groups";

  private final AppSettingService appSettingService;
  private final PublicSiteUrlResolver publicSiteUrlResolver;
  private final ObjectMapper objectMapper;
  private final RestTemplate restTemplate = new RestTemplate();

  public boolean isEnabledForCurrentStore() {
    return isTruthy(appSettingService.getSettingValue("yengapay_enabled").orElse("false"));
  }

  public boolean isConfiguredForStore(Long storeId) {
    return hasText(appSettingService.getSettingValueForStore(storeId, "yengapay_group_id").orElse(""))
        && hasText(appSettingService.getSettingValueForStore(storeId, "yengapay_project_id").orElse(""))
        && hasText(appSettingService.getSettingValueForStore(storeId, "yengapay_api_key").orElse(""));
  }

  /**
   * Crée un payment intent YengaPay pour une commande déjà enregistrée.
   */
  public YengaPayIntentResponse createPaymentIntent(Order order) {
    Long storeId = order.getStore() != null ? order.getStore().getId() : StoreContext.getStoreIdOrNull();
    if (storeId == null) {
      throw new IllegalStateException("Boutique introuvable pour le paiement YengaPay");
    }
    if (!isConfiguredForStore(storeId)) {
      throw new IllegalStateException("YengaPay n'est pas configuré pour cette boutique");
    }

    String groupId = requireSetting(storeId, "yengapay_group_id");
    String projectId = requireSetting(storeId, "yengapay_project_id");
    String apiKey = requireSetting(storeId, "yengapay_api_key");
    String apiEnv = appSettingService.getSettingValueForStore(storeId, "yengapay_api_env").orElse("test");

    long amount = order.getTotal().setScale(0, RoundingMode.HALF_UP).longValue();
    if (amount <= 0) {
      throw new IllegalArgumentException("Montant de paiement invalide");
    }

    Map<String, Object> body = new HashMap<>();
    body.put("paymentAmount", amount);
    body.put("reference", order.getOrderNumber());
    body.put("apiEnv", apiEnv);
    body.put("customerNumber", normalizePhone(order.getCustomerPhone()));
    body.put("articles", buildArticles(order));

    String storeCode = order.getStore() != null ? order.getStore().getCode() : null;
    // Page pont SPA : ouvre WhatsApp (nouvel onglet) + vide le panier — évite une 302 API
    // si nginx ne relaie pas /api vers Spring.
    String returnUrl = publicSiteUrlResolver.buildStorePaymentWhatsAppBridgeUrl(
        storeCode, order.getOrderNumber());
    if (returnUrl == null || returnUrl.isBlank()) {
      returnUrl = publicSiteUrlResolver.buildYengapayApiReturnUrl();
    }
    if (returnUrl == null || returnUrl.isBlank()) {
      returnUrl = publicSiteUrlResolver.buildStorePaymentReturnUrl(storeCode, order.getOrderNumber());
    }
    if (returnUrl != null && !returnUrl.isBlank()) {
      body.put("redirectionUrl", returnUrl);
      log.info("YengaPay redirectionUrl pour {} : {}", order.getOrderNumber(), returnUrl);
    } else {
      log.warn(
          "YengaPay redirectionUrl absent pour {} — définir APP_PUBLIC_URL ou public_base_url",
          order.getOrderNumber());
    }

    String url = API_BASE + "/" + groupId + "/payment-intent/" + projectId;

    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_JSON);
    headers.set("x-api-key", apiKey);
    headers.setAccept(List.of(MediaType.APPLICATION_JSON));

    try {
      ResponseEntity<String> response = restTemplate.exchange(
          url,
          HttpMethod.POST,
          new HttpEntity<>(body, headers),
          String.class);

      if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
        throw new IllegalStateException("Réponse YengaPay invalide (" + response.getStatusCode() + ")");
      }

      JsonNode json = objectMapper.readTree(response.getBody());
      String checkoutUrl = textOrNull(json, "checkoutPageUrlWithPaymentToken");
      if (checkoutUrl == null || checkoutUrl.isBlank()) {
        throw new IllegalStateException("URL de paiement YengaPay absente dans la réponse");
      }

      return YengaPayIntentResponse.builder()
          .id(textOrNull(json, "id"))
          .status(textOrNull(json, "status"))
          .checkoutPageUrlWithPaymentToken(checkoutUrl)
          .paymentAmount(amount)
          .currency(textOrNull(json, "currency"))
          .build();
    } catch (RestClientException ex) {
      log.error("Erreur API YengaPay pour {}: {}", order.getOrderNumber(), ex.getMessage());
      throw new IllegalStateException("Impossible de contacter YengaPay : " + ex.getMessage(), ex);
    } catch (IllegalStateException ex) {
      throw ex;
    } catch (Exception ex) {
      log.error("Erreur parsing YengaPay pour {}: {}", order.getOrderNumber(), ex.getMessage());
      throw new IllegalStateException("Réponse YengaPay illisible", ex);
    }
  }

  public Optional<String> getWebhookSecretForStore(Long storeId) {
    return appSettingService.getSettingValueForStore(storeId, "yengapay_webhook_secret")
        .filter(YengaPayService::hasText);
  }

  private String requireSetting(Long storeId, String key) {
    return appSettingService.getSettingValueForStore(storeId, key)
        .filter(YengaPayService::hasText)
        .orElseThrow(() -> new IllegalStateException("Paramètre YengaPay manquant : " + key));
  }

  private List<Map<String, Object>> buildArticles(Order order) {
    List<Map<String, Object>> articles = new ArrayList<>();
    for (OrderItem item : order.getItems()) {
      Map<String, Object> article = new HashMap<>();
      String title = item.getProduct() != null ? item.getProduct().getName() : "Article";
      article.put("title", title);
      article.put("description", title);
      long linePrice = item.getTotalPrice() != null
          ? item.getTotalPrice().setScale(0, RoundingMode.HALF_UP).longValue()
          : 0L;
      article.put("price", linePrice);
      articles.add(article);
    }
    return articles;
  }

  private static String textOrNull(JsonNode json, String field) {
    JsonNode node = json.get(field);
    return node != null && !node.isNull() ? node.asText() : null;
  }

  private static String normalizePhone(String phone) {
    if (phone == null) {
      return "";
    }
    return phone.replaceAll("[^0-9+]", "").trim();
  }

  private static boolean hasText(String value) {
    return value != null && !value.isBlank();
  }

  private static boolean isTruthy(String value) {
    if (value == null) {
      return false;
    }
    String v = value.trim().toLowerCase();
    return "true".equals(v) || "1".equals(v) || "yes".equals(v) || "on".equals(v);
  }
}
