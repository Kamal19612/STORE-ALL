 package com.storeall.api.entity;

import java.util.ArrayList;
import java.util.List;
import java.math.BigDecimal;
import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Index;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Entité représentant un produit vendu sur la boutique.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
    name = "products",
    indexes = {
        @Index(name = "idx_products_store_id", columnList = "store_id"),
        @Index(name = "idx_products_store_active", columnList = "store_id,active")
    },
    uniqueConstraints = {
        @UniqueConstraint(name = "ux_products_store_slug", columnNames = {"store_id", "slug"}),
        @UniqueConstraint(name = "ux_products_store_external_id", columnNames = {"store_id", "external_id"})
    }
)
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Store owner (tenant).
     * Nullable for backward compatibility until migrator attaches existing rows.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id")
    private Store store;

    /**
     * Nom du produit
     */
    @Column(nullable = false, length = 200)
    private String name;

    /**
     * Slug unique pour l'URL (ex: "mon-super-produit")
     */
    @Column(nullable = false, length = 200)
    private String slug;

    /**
     * Description courte pour les listes
     */
    @Column(length = 500)
    private String shortDescription;

    /**
     * Description détaillée (HTML possible)
     */
    @Column(columnDefinition = "TEXT")
    private String description;

    /**
     * Information volume/poids (ex: "50ml", "100g", "5 pièces") Mappé depuis la
     * colonne E du Google Sheet
     */
    @Column(name = "volume_weight", length = 255)
    private String volumeWeight;

    /**
     * Prix de vente unitaire
     */
    @Column(nullable = false)
    private BigDecimal price;

    /**
     * Prix barré (optionnel, pour les promotions)
     */
    private BigDecimal oldPrice;

    /**
     * Quantité en stock
     */
    @Column(nullable = false)
    private Integer stock;

    /**
     * URL de l'image principale
     */
    private String mainImage;

    /**
     * URLs des images secondaires (optionnelles)
     */
    @ElementCollection
    @CollectionTable(name = "product_secondary_images", joinColumns = @JoinColumn(name = "product_id"))
    @Column(name = "image_url", length = 2048)
    @Builder.Default
    private List<String> secondaryImages = new ArrayList<>();

    /**
     * ID externe provenant de Google Sheets (identifiant stable) Permet
     * d'identifier un produit de manière unique même si son nom change
     */
    @Column(length = 50)
    private String externalId;

    /**
     * Produit actif (visible) ou archivé
     */
    @Builder.Default
    private boolean active = true;

    /**
     * Autorisation d'achat (aligné DISPONIBILITÉ PHP : DISPONIBLE, OUI, 1, TRUE).
     * Distinct du stock (rupture) et de {@link #active} (fiche retirée / INACTIF).
     */
    // NOTE: this column was added after initial deploys; default=true avoids startup failures
    // when using schema auto-update against existing rows.
    @Column(name = "purchase_allowed", nullable = false, columnDefinition = "boolean default true")
    @Builder.Default
    private boolean purchaseAllowed = true;

    /**
     * Catégorie parente
     */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
