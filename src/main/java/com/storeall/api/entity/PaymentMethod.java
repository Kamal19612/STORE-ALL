package com.storeall.api.entity;

/**
 * Mode de paiement choisi par le client au checkout.
 */
public enum PaymentMethod {
  /** Paiement à la livraison ou au retrait (flux historique). */
  COD,
  /** Paiement en ligne via YengaPay (Mobile Money, etc.). */
  YENGAPAY;

  public static PaymentMethod fromRequest(String raw) {
    if (raw == null || raw.isBlank()) {
      return COD;
    }
    try {
      return PaymentMethod.valueOf(raw.trim().toUpperCase());
    } catch (IllegalArgumentException ex) {
      return COD;
    }
  }
}
