package com.storeall.api.security;

/**
 * Canal de session JWT : web (admin STORE-ALL) et mobile (SPIRIT-LIVRAISON).
 * Chaque canal possède sa propre version de token pour autoriser des connexions parallèles.
 */
public final class ClientSessionType {

    public static final String WEB = "web";
    public static final String MOBILE = "mobile";

    private ClientSessionType() {
    }

    public static String normalize(String raw) {
        if (raw == null || raw.isBlank()) {
            return WEB;
        }
        String v = raw.trim().toLowerCase();
        if (MOBILE.equals(v) || "app".equals(v) || "spirit".equals(v) || "spirit-livraison".equals(v)) {
            return MOBILE;
        }
        return WEB;
    }
}
