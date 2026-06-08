package com.storeall.api.dto;

import java.util.Map;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.Data;

/**
 * Mise à jour boutique (super-admin uniquement). Inclut modèle vitrine et config JSON.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class SuperStoreUpdateRequest {

    private String name;
    private String phone;
    private String contactEmail;
    private String mapsUrl;
    private String telegramId;
    private String domain;
    private String logoUrl;
    private Boolean active;

    @JsonProperty("vitrineTemplate")
    private String vitrineTemplate;

    @JsonProperty("vitrineConfig")
    private Map<String, Object> vitrineConfig;

    /** Copie vers le DTO partagé {@link StoreUpdateRequest} pour {@link com.storeall.api.service.StoreService}. */
    public StoreUpdateRequest toStoreUpdateRequest() {
        StoreUpdateRequest r = new StoreUpdateRequest();
        r.setName(name);
        r.setPhone(phone);
        r.setContactEmail(contactEmail);
        r.setMapsUrl(mapsUrl);
        r.setTelegramId(telegramId);
        r.setDomain(domain);
        r.setLogoUrl(logoUrl);
        r.setActive(active);
        r.setVitrineTemplate(vitrineTemplate);
        r.setVitrineConfig(vitrineConfig);
        return r;
    }
}
