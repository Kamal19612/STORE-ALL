package com.storeall.api.service;

import java.nio.charset.StandardCharsets;
import java.util.HexFormat;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.storeall.api.entity.Order;
import com.storeall.api.entity.PaymentMethod;
import com.storeall.api.entity.PaymentStatus;
import com.storeall.api.repository.OrderRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class YengaPayWebhookService {

  private static final Logger log = LoggerFactory.getLogger(YengaPayWebhookService.class);

  private final OrderRepository orderRepository;
  private final YengaPayService yengaPayService;
  private final OrderService orderService;
  private final ObjectMapper objectMapper;

  @Transactional
  public void handleWebhook(String rawPayload, String webhookHash) throws Exception {
    if (rawPayload == null || rawPayload.isBlank()) {
      throw new IllegalArgumentException("Payload webhook vide");
    }

    JsonNode data = objectMapper.readTree(rawPayload);
    String reference = text(data, "reference");
    String paymentStatus = text(data, "paymentStatus");
    if (reference == null || paymentStatus == null) {
      throw new IllegalArgumentException("Webhook incomplet (reference ou paymentStatus manquant)");
    }

    Order order = orderRepository.findWithDetailsByOrderNumber(reference)
        .orElseThrow(() -> new IllegalArgumentException("Commande introuvable : " + reference));

    if (order.getPaymentMethod() != PaymentMethod.YENGAPAY) {
      log.warn("Webhook YengaPay ignoré pour commande non YengaPay : {}", reference);
      return;
    }

    Long storeId = order.getStore() != null ? order.getStore().getId() : null;
    String secret = yengaPayService.getWebhookSecretForStore(storeId)
        .orElseThrow(() -> new IllegalStateException("Webhook secret YengaPay non configuré"));

    if (webhookHash == null || webhookHash.isBlank()) {
      throw new IllegalArgumentException("En-tête X-Webhook-Hash manquant");
    }

    String calculated = hmacSha256(rawPayload, secret);
    if (!constantTimeEquals(calculated, webhookHash)) {
      throw new SecurityException("Signature webhook YengaPay invalide");
    }

    String transactionId = text(data, "id");
    switch (paymentStatus.toUpperCase()) {
      case "DONE" -> orderService.confirmYengaPayPayment(order, transactionId);
      case "FAILED" -> orderService.cancelYengaPayPayment(order, PaymentStatus.FAILED, "Paiement YengaPay échoué");
      case "CANCELLED" -> orderService.cancelYengaPayPayment(order, PaymentStatus.CANCELLED, "Paiement YengaPay annulé");
      case "PENDING" -> {
        order.setPaymentStatus(PaymentStatus.PENDING);
        if (transactionId != null) {
          order.setYengapayTransactionId(transactionId);
        }
        orderRepository.save(order);
      }
      default -> log.warn("Statut YengaPay non géré pour {} : {}", reference, paymentStatus);
    }
  }

  private static String text(JsonNode node, String field) {
    JsonNode child = node.get(field);
    return child != null && !child.isNull() ? child.asText() : null;
  }

  private static String hmacSha256(String payload, String secret) throws Exception {
    Mac mac = Mac.getInstance("HmacSHA256");
    mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
    byte[] hash = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
    return HexFormat.of().formatHex(hash);
  }

  private static boolean constantTimeEquals(String a, String b) {
    if (a == null || b == null) {
      return false;
    }
    return java.security.MessageDigest.isEqual(
        a.toLowerCase().getBytes(StandardCharsets.UTF_8),
        b.toLowerCase().getBytes(StandardCharsets.UTF_8));
  }
}
