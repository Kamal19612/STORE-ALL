package com.storeall.api.entity;

import jakarta.persistence.*;
import jakarta.persistence.Index;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(
    name = "app_settings",
    indexes = {
        @Index(name = "idx_app_settings_store_id", columnList = "store_id")
    },
    uniqueConstraints = {
        @UniqueConstraint(name = "ux_app_settings_store_key", columnNames = {"store_id", "key"})
    }
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AppSetting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Store owner (tenant). NULL means global setting (legacy).
     */
    @ManyToOne
    @JoinColumn(name = "store_id")
    private Store store;

    @Column(nullable = false)
    private String key;

    @Column(columnDefinition = "TEXT")
    private String value;

    private String description;
}
