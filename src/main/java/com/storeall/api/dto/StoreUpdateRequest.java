package com.storeall.api.dto;

import java.util.Map;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.Data;

/**
 * Mise à jour partielle de la fiche boutique (admin). Champs {@code null} ou vides après trim : inchangés.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class StoreUpdateRequest {

    private String name;
    private String phone;
    private String contactEmail;
    private String mapsUrl;
    private String telegramId;
    /** Optionnel : domaine unique par boutique. */
    private String domain;

    /**
     * URL du logo (JSON). Si présent (y compris chaîne vide après trim → effacement), remplace la valeur actuelle.
     * L’upload multipart super-admin peut aussi renseigner ce champ côté serveur.
     */
    private String logoUrl;

    /**
     * Activer / désactiver la vitrine de la boutique. Réservé au super-admin (ignoré pour l’API manager).
     */
    private Boolean active;

    /**
     * Modèle de vitrine (slug). Réservé au super-admin (ignoré pour l’API manager).
     */
    @JsonProperty("vitrineTemplate")
    private String vitrineTemplate;

    /**
     * Paramètres JSON du modèle vitrine. Réservé au super-admin.
     * {@code null} = inchangé ; map vide = effacer la config.
     */
    @JsonProperty("vitrineConfig")
    private Map<String, Object> vitrineConfig;
}
