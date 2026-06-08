package com.storeall.api.dto.auth;

import lombok.Data;

/**
 * Objet de Transfert de Données (DTO) pour la réponse d'authentification.
 * Contient le token JWT généré et les informations de l'utilisateur connecté.
 */
@Data
public class JwtResponse {

    /**
     * Le token d'accès JWT
     */
    private String token;

    /**
     * Type de token (toujours "Bearer")
     */
    private String type = "Bearer";

    /**
     * Nom d'utilisateur connecté
     */
    private String username;

    /**
     * Rôles de l'utilisateur (liste de chaînes)
     */
    private java.util.List<String> roles;

    /**
     * Rôle simplifié pour le mobile: "admin" | "livreur"
     */
    private String role;

    /**
     * Identifiant livreur (user.id) si rôle livreur.
     */
    private Long livreurId;

    /**
     * Nom affiché (ex: "Dupont" ou "Prenom Nom").
     */
    private String nom;

    /**
     * Identifiant boutique ({@code stores.id}) pour les comptes rattachés à une boutique (ex. MANAGER) ; null pour SUPER_ADMIN sans boutique.
     */
    private Long storeId;

    /**
     * Code boutique ({@code stores.code}) pour l’URL /manager/{code} côté front ; null si sans boutique.
     */
    private String storeCode;

    /**
     * Nom affiché de la boutique ({@code stores.name}) pour l’espace manager ; null si sans boutique.
     */
    private String storeName;

    /**
     * URL publique du logo boutique ({@code stores.logo_url}) ; null si absent.
     */
    private String storeLogoUrl;

    public JwtResponse(String accessToken, String username, java.util.List<String> roles) {
        this.token = accessToken;
        this.username = username;
        this.roles = roles;
    }

    public JwtResponse(
        String accessToken,
        String username,
        java.util.List<String> roles,
        String role,
        Long livreurId,
        String nom,
        Long storeId,
        String storeCode,
        String storeName,
        String storeLogoUrl
    ) {
        this.token = accessToken;
        this.username = username;
        this.roles = roles;
        this.role = role;
        this.livreurId = livreurId;
        this.nom = nom;
        this.storeId = storeId;
        this.storeCode = storeCode;
        this.storeName = storeName;
        this.storeLogoUrl = storeLogoUrl;
    }
}
