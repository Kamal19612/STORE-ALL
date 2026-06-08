package com.storeall.api.vitrine;

import java.util.Collections;
import java.util.Map;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Sérialisation JSON de {@code stores.vitrine_config}.
 */
public final class VitrineConfigJson {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private VitrineConfigJson() {
    }

    public static Map<String, Object> parseToMap(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            Map<String, Object> m = MAPPER.readValue(raw.trim(), new TypeReference<>() {});
            return m == null || m.isEmpty() ? null : m;
        } catch (Exception e) {
            throw new IllegalArgumentException("vitrine_config JSON invalide : " + e.getMessage());
        }
    }

    public static String serialize(Map<String, Object> config) {
        if (config == null || config.isEmpty()) {
            return null;
        }
        try {
            return MAPPER.writeValueAsString(config);
        } catch (Exception e) {
            throw new IllegalArgumentException("vitrine_config : " + e.getMessage());
        }
    }

    public static String serializeFromObject(Object config) {
        if (config == null) {
            return null;
        }
        if (config instanceof String s) {
            if (s.isBlank()) {
                return null;
            }
            parseToMap(s);
            return s.trim();
        }
        if (config instanceof Map<?, ?> m) {
            @SuppressWarnings("unchecked")
            Map<String, Object> map = (Map<String, Object>) m;
            return serialize(map);
        }
        throw new IllegalArgumentException("vitrine_config : type non supporté");
    }
}
