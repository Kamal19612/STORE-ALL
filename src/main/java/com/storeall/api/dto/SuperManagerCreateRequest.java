package com.storeall.api.dto;

import lombok.Data;

/** Création d'un compte manager rattaché à une boutique. */
@Data
public class SuperManagerCreateRequest {

    private Long storeId;
    /** Nom affiché (stocké en {@code User.firstName}). */
    private String nom;
    /** Téléphone (optionnel). */
    private String phone;
    private String email;
    private String password;
    /**
     * Identifiant de connexion ; si vide, l’email est utilisé (même valeur que {@link #email}).
     */
    private String username;
}
