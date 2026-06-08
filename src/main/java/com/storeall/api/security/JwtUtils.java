package com.storeall.api.security;

import java.security.Key;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.nio.charset.StandardCharsets;
import java.util.Date;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import com.storeall.api.config.AppProperties;

import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.UnsupportedJwtException;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;

/**
 * Utilitaire pour la gestion des JSON Web Tokens (JWT). Cette classe gère la
 * création, la signature, le parsing et la validation des tokens.
 */
@Component
public class JwtUtils {

    private static final Logger logger = LoggerFactory.getLogger(JwtUtils.class);

    private final AppProperties appProperties;

    // Injection par constructeur (recommandé par Spring) pour accéder aux propriétés
    public JwtUtils(AppProperties appProperties) {
        this.appProperties = appProperties;
    }

    /**
     * Génère un token JWT à partir de l'authentification de l'utilisateur. Le
     * token contient : le username (sujet), la date d'émission, et la date
     * d'expiration. Il est signé avec l'algorithme HMAC SHA-256 et notre clé
     * secrète.
     *
     * @param authentication L'objet d'authentification contenant les détails de
     * l'utilisateur.
     * @return Le token JWT généré sous forme de chaîne String.
     */
    public String generateJwtToken(Authentication authentication, Long tokenVersion, String clientType) {
        UserDetails userPrincipal = (UserDetails) authentication.getPrincipal();
        String sessionType = ClientSessionType.normalize(clientType);

        return Jwts.builder()
                .setSubject((userPrincipal.getUsername()))
                .claim("tokenVersion", tokenVersion)
                .claim("clientType", sessionType)
                .setIssuedAt(new Date())
                .setExpiration(new Date((new Date()).getTime() + appProperties.getJwt().getExpiration()))
                .signWith(key(), SignatureAlgorithm.HS256)
                .compact();
    }

    /**
     * Décrypte la clé secrète encodée en Base64 pour l'utiliser dans la
     * signature.
     *
     * @return La clé cryptographique pour signer le token.
     */
    private Key key() {
        final String secret = appProperties.getJwt().getSecret();
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException("JWT secret is missing (app.jwt.secret).");
        }

        // Compat: support secrets provided as Base64 / Base64URL, or as a raw string.
        // Some environments generate secrets containing '-' / '_' (base64url) which break strict base64 decoding.
        byte[] keyBytes;
        try {
            keyBytes = Decoders.BASE64.decode(secret);
        } catch (RuntimeException base64Err) {
            try {
                keyBytes = Decoders.BASE64URL.decode(secret);
            } catch (RuntimeException base64UrlErr) {
                keyBytes = secret.getBytes(StandardCharsets.UTF_8);
            }
        }

        // HS256 requires a 256-bit (32 bytes) key. If shorter, derive a fixed-length key via SHA-256.
        if (keyBytes.length < 32) {
            try {
                keyBytes = MessageDigest.getInstance("SHA-256").digest(keyBytes);
            } catch (NoSuchAlgorithmException e) {
                throw new IllegalStateException("SHA-256 not available to derive JWT key", e);
            }
        }

        return Keys.hmacShaKeyFor(keyBytes);
    }

    /**
     * Extrait le nom d'utilisateur (sujet) contenu dans un token JWT.
     *
     * @param token Le token JWT à analyser.
     * @return Le nom d'utilisateur.
     */
    public String getUserNameFromJwtToken(String token) {
        return Jwts.parserBuilder().setSigningKey(key()).build()
                .parseClaimsJws(token).getBody().getSubject();
    }

    /**
     * Extrait la version du token.
     */
    public Long getTokenVersionFromJwtToken(String token) {
        return Jwts.parserBuilder().setSigningKey(key()).build()
                .parseClaimsJws(token).getBody().get("tokenVersion", Long.class);
    }

    /**
     * Canal de session embarqué dans le JWT ({@code web} par défaut pour les anciens tokens).
     */
    public String getClientTypeFromJwtToken(String token) {
        String raw = Jwts.parserBuilder().setSigningKey(key()).build()
                .parseClaimsJws(token).getBody().get("clientType", String.class);
        return ClientSessionType.normalize(raw);
    }

    /**
     * Valide l'intégrité et la validité temporelle d'un token JWT. Vérifie la
     * signature et l'expiration.
     *
     * @param authToken Le token JWT à valider.
     * @return true si le token est valide, false sinon.
     */
    public boolean validateJwtToken(String authToken) {
        try {
            Jwts.parserBuilder().setSigningKey(key()).build().parseClaimsJws(authToken);
            return true;
        } catch (MalformedJwtException e) {
            logger.error("Token JWT invalide: {}", e.getMessage());
        } catch (ExpiredJwtException e) {
            logger.error("Token JWT expiré: {}", e.getMessage());
        } catch (UnsupportedJwtException e) {
            logger.error("Token JWT non supporté: {}", e.getMessage());
        } catch (IllegalArgumentException e) {
            logger.error("La chaîne claims JWT est vide: {}", e.getMessage());
        }

        return false;
    }
}
