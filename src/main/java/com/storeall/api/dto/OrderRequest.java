package com.storeall.api.dto;

import java.math.BigDecimal;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * DTO pour la création d'une commande (Checkout). Contient les infos client et
 * la liste des articles.
 */
@Data
public class OrderRequest {

    // Infos Client (Guest Checkout)
    @NotBlank(message = "Le nom est obligatoire")
    @Size(max = 120, message = "Le nom est trop long (max 120 caractères)")
    private String customerName;

    @NotBlank(message = "Le téléphone est obligatoire")
    @Size(max = 30, message = "Le téléphone est trop long (max 30 caractères)")
    private String customerPhone; // WhatsApp number

    /** Obligatoire pour {@code DELIVERY} ; ignorée pour {@code PICKUP} (défaut côté serveur). */
    @Size(max = 500, message = "L'adresse est trop longue (max 500 caractères)")
    private String customerAddress;

    @Size(max = 1000, message = "Les notes sont trop longues (max 1000 caractères)")
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
