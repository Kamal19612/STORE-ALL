package com.storeall.api.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Profile;
import org.springframework.context.event.EventListener;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * Refuse un démarrage prod avec des secrets ou CORS dangereux.
 */
@Component
@Profile("prod")
public class ProductionStartupValidator {

    private static final Logger log = LoggerFactory.getLogger(ProductionStartupValidator.class);

    private final AppProperties appProperties;
    private final Environment environment;

    public ProductionStartupValidator(AppProperties appProperties, Environment environment) {
        this.appProperties = appProperties;
        this.environment = environment;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void validateProductionConfig() {
        String jwtSecret = appProperties.getJwt().getSecret();
        if (!StringUtils.hasText(jwtSecret) || "change-me".equals(jwtSecret)) {
            throw new IllegalStateException(
                    "JWT_SECRET manquant ou invalide en production. Définissez une clé forte (min. 32 caractères).");
        }
        if (jwtSecret.length() < 32) {
            throw new IllegalStateException("JWT_SECRET trop court pour la production (minimum 32 caractères).");
        }

        String cors = environment.getProperty("app.cors.allowed-origin-patterns");
        if (!StringUtils.hasText(cors) || "*".equals(cors.trim())) {
            throw new IllegalStateException(
                    "CORS_ALLOWED_ORIGINS doit lister les domaines autorisés en production (pas *).");
        }

        if (appProperties.getBootstrap().isResetAdminPasswordOnEachStart()) {
            log.warn("[prod] reset-admin-password-on-each-start est activé — désactivez-le en production.");
        }

        log.info("[prod] Validation configuration production OK.");
    }
}
