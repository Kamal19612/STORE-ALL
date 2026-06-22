package com.storeall.api.dto;

import java.math.BigDecimal;
import java.util.List;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * DTO pour la création ou modification d'un produit (Admin).
 */
@Data
public class ProductRequest {

    @NotBlank(message = "Le nom est obligatoire")
    private String name;

    @NotBlank(message = "Le slug est obligatoire")
    private String slug;

    @Size(max = 500, message = "La description courte ne doit pas dépasser 500 caractères")
    private String shortDescription;
    private String description;

    private String volumeWeight; // Volume/Poids (ex: "50ml", "100g")

    @NotNull(message = "Le prix est obligatoire")
    @PositiveOrZero(message = "Le prix doit être positif ou nul")
    @Min(0)
    private BigDecimal price;

    private BigDecimal oldPrice;

    @NotNull(message = "Le stock est obligatoire")
    @Min(0)
    private Integer stock;

    // Pour l'image, on reçoit soit une URL (String), soit un fichier via Multipart dans le Controller
    // Ce champ sert si l'admin fournit une URL directe
    private String imageUrl;

    /**
     * Liste des URLs d'images secondaires conservées (utile lors d'une mise à jour).
     * Les nouvelles images sont envoyées via Multipart et concaténées côté backend.
     */
    private List<String> secondaryImages;

    // Modifié : categoryId n'est plus @NotNull car on peut fournir un Nom
    private Long categoryId;

    // Nouveau champ pour la création dynamique ou recherche par nom
    private String categoryName;

    // ID externe (provenant de Google Sheets) pour identification stable
    private String externalId;

    private boolean active = true;

    /**
     * Autorisation de vente (import / admin). Distinct du stock (rupture).
     */
    private boolean purchaseAllowed = true;

    /**
     * Exiger le remplissage du PDF modèle avant achat.
     */
    private boolean requiresPdfForm = false;

    /**
     * En édition : supprimer le PDF modèle existant.
     */
    private boolean removeTemplatePdf = false;

    /**
     * Import Sheet/CSV : URL vers un PDF modèle AcroForm (Google Drive, lien direct…).
     */
    private String templatePdfSourceUrl;

    /**
     * Import Sheet/CSV : true si la colonne « formulaire pdf » / « exiger pdf » était renseignée.
     */
    private boolean requiresPdfFormImportSpecified = false;
}
