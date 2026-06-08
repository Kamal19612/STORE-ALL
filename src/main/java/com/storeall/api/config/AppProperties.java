package com.storeall.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import lombok.Data;

/**
 * Classe de configuration typée pour les propriétés de l'application
 * (application.yml). Permet d'éviter les avertissements "Unknown property" et
 * offre l'autocomplétion.
 */
@Configuration
@ConfigurationProperties(prefix = "app")
@Data
public class AppProperties {

    private Jwt jwt = new Jwt();

    @Data
    public static class Jwt {

        private String secret;
        private long expiration;
    }

    private String whatsappNumber;
    private String storeName;
    private String storePhone;
    private String currency = "FCFA"; // Valeur par défaut

    private final Storage storage = new Storage();
    private final Supabase supabase = new Supabase();
    private final Delivery delivery = new Delivery();
    /** Non-final : le binder {@code @ConfigurationProperties} doit pouvoir remplacer l’instance imbriquée si besoin. */
    private Bootstrap bootstrap = new Bootstrap();

    @Data
    public static class Bootstrap {
        private String adminUsername = "admin";
        private String adminEmail = "admin@store-all.local";
        /**
         * Mot de passe appliqué à la création de l’admin et, si {@link #resetAdminPasswordOnEachStart}, à chaque démarrage (dev).
         * Surcharge recommandée en prod : {@code STORE_ALL_ADMIN_PASSWORD} (préféré) ou {@code SPIRIT_ADMIN_PASSWORD} (compat.).
         */
        private String adminPassword = "Pass_word.(1)@!";
        /**
         * Si true (défaut dev), réinitialise le mot de passe admin à chaque démarrage. Mettre false en production.
         */
        private boolean resetAdminPasswordOnEachStart = true;

        /** Insère les paliers livraison en app_settings si absents pour la boutique cible. */
        private boolean seedDeliverySettingsOnStart = true;
        private String deliverySettingsStoreCode = "spirit";
    }

    @Data
    public static class Storage {

        private String location = "uploads";
    }

    @Data
    public static class Supabase {
        private String url;
        private String serviceRoleKey;
    }

    @Data
    public static class Delivery {
        /**
         * Secret partagé pour signer les webhooks (HMAC-SHA256).
         * Utilisé notamment si vous avez un serveur relais (webhook proxy) qui reçoit
         * les événements côté internet et les transfère.
         */
        private String webhookHmacSecret;

        private final Fcm fcm = new Fcm();

        @Data
        public static class Fcm {
            /**
             * Active/désactive les notifications FCM (mobile).
             */
            private boolean enabled = false;

            /**
             * Chemin du fichier service account Firebase (JSON).
             * Exemple: /etc/secrets/firebase-service-account.json
             */
            private String serviceAccountPath;

            /**
             * Optionnel: project id Firebase (sinon lu depuis le JSON).
             */
            private String projectId;
        }
    }

}
