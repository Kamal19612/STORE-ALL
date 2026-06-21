package com.storeall.api.entity;

/**
 * Statut du paiement d'une commande.
 */
public enum PaymentStatus {
  /** Paiement hors ligne (livraison / retrait) — non encore encaissé. */
  UNPAID,
  /** Paiement YengaPay initié, en attente de confirmation. */
  PENDING,
  /** Paiement confirmé (YengaPay webhook DONE). */
  PAID,
  /** Paiement échoué. */
  FAILED,
  /** Paiement annulé par le client ou expiré. */
  CANCELLED
}
