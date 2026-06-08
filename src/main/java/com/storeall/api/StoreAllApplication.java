package com.storeall.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

import com.storeall.api.config.AppProperties;
import com.storeall.api.config.GoogleConfig;

/**
 * Point d'entrée Spring Boot du dépôt STORE-ALL (API multi-boutique).
 */
@SpringBootApplication
@EntityScan("com.storeall.api.entity")
@EnableJpaRepositories("com.storeall.api.repository")
@EnableConfigurationProperties({ AppProperties.class, GoogleConfig.class })
@org.springframework.scheduling.annotation.EnableScheduling
public class StoreAllApplication {

    public static void main(String[] args) {
        // Doit être défini AVANT SpringApplication.run() pour empêcher le
        // RestartClassLoader de DevTools de s'installer (sinon il casse le scan
        // Hibernate des inner-classes générées par Lombok @Builder).
        System.setProperty("spring.devtools.restart.enabled", "false");
        SpringApplication.run(StoreAllApplication.class, args);
    }
}
