package com.storeall.api.dto;

import java.math.BigDecimal;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Ligne produit pour le dashboard super admin (toutes boutiques). */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SupervisionProductRow {

    private Long id;
    private String name;
    private String slug;
    private BigDecimal price;
    private boolean active;
    private Long storeId;
    private String storeCode;
    private String storeName;
}
