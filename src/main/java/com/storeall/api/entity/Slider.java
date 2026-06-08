package com.storeall.api.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Index;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "sliders", indexes = {
    @Index(name = "idx_sliders_store_id", columnList = "store_id"),
    @Index(name = "idx_sliders_store_active", columnList = "store_id,active")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Slider {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Store owner (tenant).
     * Nullable for backward compatibility until migrator attaches existing rows.
     */
    @ManyToOne
    @JoinColumn(name = "store_id")
    private Store store;

    private String title;
    private String description;
    private String imageUrl;

    // Ordre d'affichage
    private Integer displayOrder;

    private boolean active;
}
