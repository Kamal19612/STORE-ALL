package com.storeall.api.dto;

import lombok.Data;

/** Mise à jour d'un compte manager (super admin). */
@Data
public class SuperManagerUpdateRequest {

    private Long storeId;
    /** Nom affiché (stocké en {@code User.firstName}). */
    private String nom;
    private String phone;
    private String email;
    /**
     * Identifiant de connexion ; si absent, l’email reste l’identifiant.
     */
    private String username;
    /** Nouveau mot de passe ; ignoré si vide. */
    private String password;
    private Boolean active;
}
