package com.storeall.api.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

import com.storeall.api.entity.Order;
import com.storeall.api.entity.User;

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
    private BigDecimal deliveryCost;
    private String deliveryType;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String customerName;
    private Long storeId;
    private String storeCode;
    private String storeName;
    private Map<String, Object> deliveryAgent;
}
