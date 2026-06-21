package com.storeall.api.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.storeall.api.dto.PaymentStatusResponse;
import com.storeall.api.service.OrderService;
import com.storeall.api.service.YengaPayWebhookService;

import lombok.RequiredArgsConstructor;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequiredArgsConstructor
public class YengaPayController {

  private final YengaPayWebhookService webhookService;
  private final OrderService orderService;

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
}
