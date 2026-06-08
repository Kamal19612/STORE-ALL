package com.storeall.api.security;

import java.io.IOException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.Getter;
import lombok.Setter;

/**
 * Filtre de sécurité qui s'exécute une fois par requête. Il vérifie la présence
 * et la validité du token JWT dans l'en-tête "Authorization". Si le token est
 * valide, il authentifie l'utilisateur dans le contexte de sécurité Spring.
 */
@Component
@Getter
@Setter
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private UserDetailsServiceImpl userDetailsService;

    // Utilisation du logger de SLF4J (renommé en 'log' pour ne pas masquer le 'logger' de la classe parente)
    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response, @NonNull FilterChain filterChain)
            throws ServletException, IOException {
        try {
            // 1. Extraire le token JWT de la requête
            String jwt = parseJwt(request);

            // 2. Valider le token
            if (jwt != null && jwtUtils.validateJwtToken(jwt)) {
                // 3. Récupérer le username depuis le token
                String username = jwtUtils.getUserNameFromJwtToken(jwt);

                // 4. Charger les détails de l'utilisateur depuis la base de données
                UserDetails userDetails = userDetailsService.loadUserByUsername(username);

                // --- Vérification de la Version du Token (Anti-Concurrence) ---
                String clientType = jwtUtils.getClientTypeFromJwtToken(jwt);
                Long tokenVersionInJwt = jwtUtils.getTokenVersionFromJwtToken(jwt);
                Long tokenVersionInDb = userDetailsService.getUserTokenVersion(username, clientType);

                // Si les versions ne correspondent pas, le token est obsolète (ancienne session sur ce canal)
                if (tokenVersionInJwt != null && !tokenVersionInJwt.equals(tokenVersionInDb)) {
                    log.warn("Tentative de connexion avec un token obsolète (Session invalidée, canal={}) : {}",
                            clientType, username);
                    // On ne définit pas l'authentification -> 401 sera renvoyé par Spring Security
                    filterChain.doFilter(request, response);
                    return;
                }
                // ----------------------------------------------------------------

                // 5. Créer l'objet d'authentification Spring Security
                UsernamePasswordAuthenticationToken authentication
                        = new UsernamePasswordAuthenticationToken(
                                userDetails,
                                null,
                                userDetails.getAuthorities());

                // Ajouter les détails de la requête (comme l'IP)
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                // 6. Enregistrer l'authentification dans le contexte de sécurité
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        } catch (RuntimeException e) {
            // On attrape les exceptions Runtime (comme UsernameNotFoundException ou JwtException non gérées)
            // Le logger enregistre l'erreur mais la requête continue
            log.error("Impossible de définir l'authentification utilisateur: {}", e.getMessage());
        }

        // Continuer la chaîne de filtres
        filterChain.doFilter(request, response);
    }

    /**
     * Extrait le token de l'en-tête "Authorization" : "Bearer <token>"
     */
    private String parseJwt(HttpServletRequest request) {
        String headerAuth = request.getHeader("Authorization");

        if (StringUtils.hasText(headerAuth) && headerAuth.startsWith("Bearer ")) {
            return headerAuth.substring(7);
        }

        return null;
    }
}
