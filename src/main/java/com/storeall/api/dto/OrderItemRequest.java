package com.storeall.api.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * DTO représentant un article dans une requête de commande.
 */
@Data
public class OrderItemRequest {

    @NotNull(message = "L'ID du produit est obligatoire")
    private Long productId;

    @Min(value = 1, message = "La quantité doit être au moins 1")
    private int quantity;

    /**
     * Valeurs des champs PDF remplis par le client (JSON).
     */
    private String pdfFieldValues;
}
