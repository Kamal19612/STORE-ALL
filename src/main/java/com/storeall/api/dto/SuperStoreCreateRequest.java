package com.storeall.api.dto;

import java.util.Map;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.Data;

/**
 * Création boutique (super admin). {@code code} = identifiant stable {@code X-Store-Code} (minuscules, sans espaces).
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class SuperStoreCreateRequest {

    private String name;
    /** Code unique boutique (ex. spirit, ma-boutique). */
    private String code;
    private String phone;
    private String contactEmail;
    private String mapsUrl;
    private String telegramId;
    /** Optionnel : résolution par host (ex. spiritstore.example.com). */
    private String domain;

    /** Optionnel : URL logo (si pas de fichier en multipart). */
    private String logoUrl;

    /** Optionnel : créer la boutique désactivée (défaut : active). */
    private Boolean active;

    /** Optionnel : modèle de vitrine (slug, ex. {@code default}). */
    @JsonProperty("vitrineTemplate")
    private String vitrineTemplate;

    /** Optionnel : paramètres JSON du modèle vitrine. */
    @JsonProperty("vitrineConfig")
    private Map<String, Object> vitrineConfig;
}
