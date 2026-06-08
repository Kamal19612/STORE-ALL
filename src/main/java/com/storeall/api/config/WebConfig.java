package com.storeall.api.config;

import java.nio.file.Path;
import java.nio.file.Paths;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Configuration Web MVC pour exposer le dossier "uploads" via HTTP. Permet
 * d'accéder aux images via : http://localhost:8080/uploads/nom-fichier.jpg
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Autowired
    private AppProperties appProperties;

    @Override
    public void addResourceHandlers(@org.springframework.lang.NonNull ResourceHandlerRegistry registry) {
        String location = appProperties.getStorage().getLocation();
        Path uploadDir = Paths.get(location).toAbsolutePath().normalize();

        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(uploadDir.toUri().toString());
    }
}
