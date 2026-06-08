package com.storeall.api.util;

/**
 * Normalise les IDs externes (Sheet / CSV) pour comparer base ↔ fichier.
 */
public final class ExternalIdNormalizer {

    private ExternalIdNormalizer() {}

    public static String normalize(String raw) {
        if (raw == null) {
            return "";
        }
        String t = raw.trim();
        if (t.isEmpty()) {
            return "";
        }
        try {
            if (t.matches("^-?\\d+(\\.0+)?$")) {
                return String.valueOf((long) Double.parseDouble(t));
            }
        } catch (NumberFormatException ignored) {
            // keep t
        }
        return t;
    }
}
