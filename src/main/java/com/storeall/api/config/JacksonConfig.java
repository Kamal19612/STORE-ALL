package com.storeall.api.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

/**
 * Configuration Jackson pour gérer la sérialisation des entités Hibernate
 */
@Configuration
public class JacksonConfig {

    @Bean
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        // Désactiver l'erreur sur les beans vides (nécessaire pour les proxies Hibernate)
        mapper.disable(SerializationFeature.FAIL_ON_EMPTY_BEANS);
        // Enregistrer le module Java 8 pour gérer LocalDateTime et autres types temporels
        mapper.registerModule(new JavaTimeModule());
        // Écrire les dates au format ISO-8601 plutôt qu'en timestamp
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        return mapper;
    }
}
