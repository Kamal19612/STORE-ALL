package com.storeall.api.dto;

import java.math.BigDecimal;
import java.util.List;

import lombok.Builder;
import lombok.Data;

/**
 * DTO représentant un produit renvoyé par l'API (pour le catalogue).
 */
@Data
@Builder
public class ProductResponse {

    private Long id;
    private String name;
    private String slug;
    private String shortDescription;
    private String description;
    private String volumeWeight; // Volume/Poids (ex: "50ml", "100g")
    private BigDecimal price;
    private BigDecimal oldPrice;
    private String mainImage;
    private List<String> secondaryImages;
    private String categoryName;
    private String categorySlug;
    private Long categoryId; // Ajouté pour l'édition Admin
    private Integer stock; // Ajouté pour l'édition Admin
    private String externalId; // ID externe de Google Sheets
    /** Peut-on ajouter au panier : {@code purchaseAllowed && stock > 0 && active}. */
    private boolean available;
    /** DISPONIBILITÉ sheet / admin : autorisé à la vente (distinct de la rupture stock). */
    private boolean purchaseAllowed;
    private boolean active; // Statut actif réel (pour l'édition Admin)
    private boolean created; // Utilisé pour l'import (vrai si créé, faux si mis à jour)

    /** Le produit exige un formulaire PDF avant achat. */
    private boolean requiresPdfForm;

    /** Un PDF modèle est rattaché (URL non exposée au public). */
    private boolean hasPdfTemplate;

    /** Admin uniquement : nom du fichier modèle pour affichage. */
    private String templatePdfName;
}
