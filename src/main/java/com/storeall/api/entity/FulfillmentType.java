package com.storeall.api.entity;

/**
 * Mode de réception de la commande : livraison à domicile ou retrait en boutique.
 */
public enum FulfillmentType {
    DELIVERY,
    PICKUP;

    public static FulfillmentType fromRequest(String raw) {
        if (raw == null || raw.isBlank()) {
            return DELIVERY;
        }
        try {
            return FulfillmentType.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return DELIVERY;
        }
    }

    public boolean isPickup() {
        return this == PICKUP;
    }
}
