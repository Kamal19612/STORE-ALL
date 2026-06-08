package com.storeall.api.dto;

import java.math.BigDecimal;

import lombok.Builder;
import lombok.Data;

/**
 * DTO de réponse après création d'une commande. Contient le lien pour finaliser
 * sur WhatsApp.
 */
@Data
@Builder
public class OrderResponse {

    private String orderNumber;
    private BigDecimal totalAmount;
    private String status;
    private String whatsappLink; // Le lien généré
}
