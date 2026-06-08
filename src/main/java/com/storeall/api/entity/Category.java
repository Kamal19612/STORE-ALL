package com.storeall.api.entity;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
 * Entité représentant une catégorie de produits (ex: "Gadgets", "Lingerie").
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
    name = "categories",
    indexes = {
        @Index(name = "idx_categories_store_id", columnList = "store_id")
    },
    uniqueConstraints = {
        @UniqueConstraint(name = "ux_categories_store_name", columnNames = {"store_id", "name"}),
        @UniqueConstraint(name = "ux_categories_store_slug", columnNames = {"store_id", "slug"})
    }
)
public class Category {

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

    /**
     * Nom de la catégorie (ex: "Bien-être"). Unique.
     */
    @Column(nullable = false, length = 100)
    private String name;

    /**
     * Slug pour l'URL (ex: "bien-etre"). Unique.
     */
    @Column(nullable = false, length = 100)
    private String slug;

    /**
     * Description optionnelle pour le SEO ou l'affichage
     */
    @Column(columnDefinition = "TEXT")
    private String description;

    /**
     * URL de l'image d'illustration
     */
    private String imageUrl;

    /**
     * Catégorie visible ou non sur le site
     */
    @Builder.Default
    private boolean active = true;

    /* Relations (Optionnel selon besoin)
    @OneToMany(mappedBy = "category")
    private List<Product> products;
     */
    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
