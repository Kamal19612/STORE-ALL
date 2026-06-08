package com.storeall.api.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.storeall.api.entity.Order;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Ligne commande pour le dashboard super admin (toutes boutiques). */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SupervisionOrderRow {

    private Long id;
    private String orderNumber;
    private Order.Status status;
    private BigDecimal total;
    private LocalDateTime createdAt;
    private String customerName;
    private Long storeId;
    private String storeCode;
    private String storeName;
}
