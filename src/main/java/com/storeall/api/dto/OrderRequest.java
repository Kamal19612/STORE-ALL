package com.storeall.api.dto;

import java.math.BigDecimal;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

/**
 * DTO pour la création d'une commande (Checkout). Contient les infos client et
 * la liste des articles.
 */
@Data
public class OrderRequest {

    // Infos Client (Guest Checkout)
    @NotBlank(message = "Le nom est obligatoire")
    private String customerName;

    @NotBlank(message = "Le téléphone est obligatoire")
    private String customerPhone; // WhatsApp number

    /** Obligatoire pour {@code DELIVERY} ; ignorée pour {@code PICKUP} (défaut côté serveur). */
    private String customerAddress;

    private String customerNotes;

    /** {@code DELIVERY} (défaut) ou {@code PICKUP}. */
    private String fulfillmentType;
    private BigDecimal customerLatitude;
    private BigDecimal customerLongitude;

    // Infos Livraison
    private String deliveryType;
    private String scheduledTime;
    private String manualLocationLink;
    private BigDecimal deliveryCost;
    private BigDecimal distance;

    // Panier
    @NotEmpty(message = "Le panier ne peut pas être vide")
    @Valid
    private List<OrderItemRequest> items;

    private BigDecimal totalAmount;

    /** {@code COD} (défaut) ou {@code YENGAPAY}. */
    private String paymentMethod;
}
