package com.storeall.api.security;

import java.io.IOException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Point d'entrée pour gérer les erreurs d'authentification. Cette classe est
 * appelée lorsqu'un utilisateur non authentifié tente d'accéder à une ressource
 * protégée.
 */
@Component
public class AuthEntryPointJwt implements AuthenticationEntryPoint {

    private static final Logger logger = LoggerFactory.getLogger(AuthEntryPointJwt.class);

    /**
     * Méthode appelée lors d'une exception d'authentification. Elle renvoie une
     * réponse HTTP 401 (Unauthorized) au client.
     */
    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
            AuthenticationException authException) throws IOException, ServletException {
        // Log de l'erreur pour le débogage
        logger.error("Erreur non autorisée : {}", authException.getMessage());

        // Envoi de la réponse d'erreur
        response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Erreur : Non autorisé (Unauthorized)");
    }
}
