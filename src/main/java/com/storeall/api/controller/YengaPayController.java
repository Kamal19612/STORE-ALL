package com.storeall.api.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.storeall.api.dto.PaymentStatusResponse;
import com.storeall.api.service.OrderService;
import com.storeall.api.service.YengaPayWebhookService;
import com.storeall.api.util.PublicSiteUrlResolver;

import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;

import lombok.RequiredArgsConstructor;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequiredArgsConstructor
public class YengaPayController {

  private final YengaPayWebhookService webhookService;
  private final OrderService orderService;
  private final PublicSiteUrlResolver publicSiteUrlResolver;

  /**
   * Webhook YengaPay — à configurer dans le dashboard YengaPay.
   * Vérifie la signature HMAC via l'en-tête {@code X-Webhook-Hash}.
   */
  @PostMapping("/api/payments/yengapay/webhook")
  public ResponseEntity<Map<String, String>> webhook(
      @RequestBody String rawPayload,
      @RequestHeader(value = "X-Webhook-Hash", required = false) String webhookHash) {
    try {
      webhookService.handleWebhook(rawPayload, webhookHash);
      return ResponseEntity.ok(Map.of("status", "ok"));
    } catch (SecurityException ex) {
      return ResponseEntity.status(403).body(Map.of("error", ex.getMessage()));
    } catch (IllegalArgumentException ex) {
      return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
    } catch (Exception ex) {
      return ResponseEntity.internalServerError().body(Map.of("error", "Erreur traitement webhook"));
    }
  }

  /**
   * Statut paiement public — utilisé par la page de retour après checkout YengaPay.
   */
  @GetMapping("/api/public/payments/status/{orderNumber}")
  public ResponseEntity<PaymentStatusResponse> paymentStatus(@PathVariable String orderNumber) {
    return ResponseEntity.ok(orderService.getPaymentStatus(orderNumber));
  }

  /**
   * Résolution paiement YengaPay (retour checkout avec {@code yengapay_payment_id}).
   */
  @GetMapping("/api/public/payments/yengapay/resolve")
  public ResponseEntity<PaymentStatusResponse> resolveYengapayReturn(
      @RequestParam(name = "yengapay_payment_id") String paymentId,
      @RequestParam(name = "yengapay_status", required = false) String status) {
    return ResponseEntity.ok(orderService.resolveYengapayReturn(paymentId, status));
  }

  /**
   * Redirection HTTP directe après paiement YengaPay → WhatsApp (ou page retour boutique).
   * À configurer dans la console YengaPay si {@code redirectionUrl} par intent n'est pas pris en charge.
   */
  @GetMapping("/api/public/payments/yengapay/return")
  public void yengapayBrowserReturn(
      @RequestParam(name = "yengapay_payment_id", required = false) String paymentId,
      @RequestParam(name = "yengapay_status", required = false) String status,
      @RequestParam(name = "reference", required = false) String reference,
      HttpServletResponse response) throws IOException {
    if ((paymentId == null || paymentId.isBlank()) && (reference == null || reference.isBlank())) {
      response.sendRedirect("/");
      return;
    }
    try {
      PaymentStatusResponse ps = (paymentId != null && !paymentId.isBlank())
          ? orderService.resolveYengapayReturn(paymentId, status)
          : orderService.getPaymentStatus(reference.trim());
      boolean paid = "PAID".equalsIgnoreCase(ps.getPaymentStatus())
          || OrderService.isSuccessfulYengapayReturnStatus(status);
      if (paid) {
        String bridge = publicSiteUrlResolver.buildStorePaymentWhatsAppBridgeUrl(
            ps.getStoreCode(), ps.getOrderNumber());
        if (bridge != null && !bridge.isBlank()) {
          response.sendRedirect(appendYengapayQuery(bridge, paymentId, status));
          return;
        }
      }
      String fallback = publicSiteUrlResolver.buildStorePaymentReturnUrl(ps.getStoreCode(), ps.getOrderNumber());
      if (fallback != null && !fallback.isBlank()) {
        response.sendRedirect(appendYengapayQuery(fallback, paymentId, status));
        return;
      }
    } catch (RuntimeException ex) {
      if (reference != null && !reference.isBlank()) {
        try {
          PaymentStatusResponse ps = orderService.getPaymentStatus(reference.trim());
          String bridge = publicSiteUrlResolver.buildStorePaymentWhatsAppBridgeUrl(
              ps.getStoreCode(), ps.getOrderNumber());
          if (bridge != null && !bridge.isBlank()) {
            response.sendRedirect(appendYengapayQuery(bridge, paymentId, status));
            return;
          }
        } catch (RuntimeException ignored) {
          // no-op
        }
      }
    }
    response.sendRedirect("/");
  }

  private static String appendYengapayQuery(String baseUrl, String paymentId, String status) {
    if (baseUrl == null || baseUrl.isBlank()) {
      return baseUrl;
    }
    StringBuilder sb = new StringBuilder(baseUrl);
    if (paymentId != null && !paymentId.isBlank()) {
      sb.append(baseUrl.contains("?") ? "&" : "?");
      sb.append("yengapay_payment_id=");
      sb.append(java.net.URLEncoder.encode(paymentId.trim(), java.nio.charset.StandardCharsets.UTF_8));
    }
    if (status != null && !status.isBlank()) {
      sb.append(sb.indexOf("?") >= 0 ? "&" : "?");
      sb.append("yengapay_status=");
      sb.append(java.net.URLEncoder.encode(status.trim(), java.nio.charset.StandardCharsets.UTF_8));
    }
    return sb.toString();
  }
}
