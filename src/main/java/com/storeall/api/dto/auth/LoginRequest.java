package com.storeall.api.dto.auth;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Objet de Transfert de Données (DTO) pour la requête de connexion. Contient
 * les informations nécessaires pour authentifier un utilisateur.
 */
@Data
public class LoginRequest {

    /**
     * Nom d'utilisateur (obligatoire)
     */
    @NotBlank
    private String username;

    /**
     * Mot de passe (obligatoire)
     */
    @NotBlank
    private String password;

    /**
     * Canal de session : {@code web} (défaut) ou {@code mobile} (SPIRIT-LIVRAISON).
     * Permet web + mobile connectés en parallèle avec le même compte.
     */
    private String clientType;
}
