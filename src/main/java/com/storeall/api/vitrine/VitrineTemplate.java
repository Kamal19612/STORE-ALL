package com.storeall.api.vitrine;

import java.util.regex.Pattern;

/**
 * Identifiant de modèle de vitrine publique ({@code /:storeCode}).
 * Les layouts React correspondants sont enregistrés côté frontend ; ici on ne valide que le format du slug.
 */
public final class VitrineTemplate {

    public static final String DEFAULT = "default";

    private static final Pattern SLUG = Pattern.compile("^[a-z][a-z0-9_-]{0,31}$");

    private VitrineTemplate() {
    }

    /**
     * @return slug normalisé, ou {@link #DEFAULT} si vide
     */
    public static String normalize(String raw) {
        if (raw == null || raw.isBlank()) {
            return DEFAULT;
        }
        String s = raw.trim().toLowerCase().replaceAll("\\s+", "-");
        if (!SLUG.matcher(s).matches()) {
            throw new IllegalArgumentException(
                "Modèle de vitrine invalide : lettres minuscules, chiffres ou tirets (ex. default, minimal).");
        }
        return s;
    }
}
