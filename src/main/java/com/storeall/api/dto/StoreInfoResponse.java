package com.storeall.api.dto;

import java.util.Map;

import com.storeall.api.entity.Store;
import com.storeall.api.vitrine.VitrineConfigJson;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Fiche boutique exposée au front (catalogue public ou admin).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StoreInfoResponse {

    private Long id;
    private String name;
    private String code;
    private String domain;
    private String phone;
    /** Alias JSON {@code email} pour l’email de contact boutique ({@link Store#getContactEmail()}). */
    private String email;
    private String mapsUrl;
    private String telegramId;
    private String logoUrl;
    private boolean active;
    /** Slug modèle vitrine (ex. {@code default}). */
    private String vitrineTemplate;

    /** Options d’affichage propres au modèle (JSON parsé). */
    private Map<String, Object> vitrineConfig;

    public static StoreInfoResponse fromEntity(Store s) {
        if (s == null) {
            return null;
        }
        return StoreInfoResponse.builder()
            .id(s.getId())
            .name(s.getName())
            .code(s.getCode())
            .domain(s.getDomain())
            .phone(s.getPhone())
            .email(s.getContactEmail())
            .mapsUrl(s.getMapsUrl())
            .telegramId(s.getTelegramId())
            .logoUrl(s.getLogoUrl())
            .active(s.isActive())
            .vitrineTemplate(s.getVitrineTemplate())
            .vitrineConfig(VitrineConfigJson.parseToMap(s.getVitrineConfig()))
            .build();
    }
}
