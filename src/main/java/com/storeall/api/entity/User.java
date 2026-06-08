package com.storeall.api.entity;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Index;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Compte staff (back-office) : {@link Role#SUPER_ADMIN}, {@link Role#MANAGER} ou {@link Role#DELIVERY_AGENT}.
 * Les livreurs sont rattachés à une boutique ({@code store_id}) pour le cloisonnement multi-tenant.
 * Pas de compte « client » : les acheteurs passent en guest sur les commandes publiques.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "users", indexes = {
    @Index(name = "idx_users_store_id", columnList = "store_id"),
    @Index(name = "idx_users_role", columnList = "role")
})
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Store scope (tenant). For global roles (delivery), can be NULL.
     * Nullable for backward compatibility until migrator attaches existing rows.
     */
    @ManyToOne
    @JoinColumn(name = "store_id")
    private Store store;

    /**
     * Nom d'utilisateur unique pour la connexion (peut être identique à l’email pour les managers).
     */
    @Column(nullable = false, unique = true, length = 100)
    private String username;

    /**
     * Adresse email unique
     */
    @Column(nullable = false, unique = true, length = 100)
    private String email;

    /**
     * Mot de passe crypté (BCrypt)
     */
    @com.fasterxml.jackson.annotation.JsonProperty(access = com.fasterxml.jackson.annotation.JsonProperty.Access.WRITE_ONLY)
    @Column(nullable = false)
    private String password;

    /**
     * Numéro de téléphone (Optionnel, utile pour les livreurs)
     */
    @Column(length = 20)
    private String phone;

    // ── Identité livreur (CNIB) ─────────────────────────────────────────────

    @Column(name = "first_name")
    private String firstName;

    @Column(name = "last_name")
    private String lastName;

    @Column(name = "birth_date")
    private String birthDate;

    @Column(name = "birth_place")
    private String birthPlace;

    /** 'M' | 'F' */
    private String gender;

    private String profession;

    @Column(name = "cnib_national_id")
    private String cnibNationalId;

    @Column(name = "cnib_serial")
    private String cnibSerial;

    @Column(name = "cnib_issue_date")
    private String cnibIssueDate;

    @Column(name = "cnib_expiry_date")
    private String cnibExpiryDate;

    @Column(name = "cnib_ocr_text", columnDefinition = "TEXT")
    private String cnibOcrText;

    /**
     * Rôle de l'utilisateur (définit les permissions)
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    /**
     * Compte actif ou désactivé
     */
    @Builder.Default
    private boolean active = true;

    /**
     * Version du token web (admin STORE-ALL). Incrémenté à chaque nouvelle connexion web.
     */
    @Builder.Default
    @Column(nullable = true)
    private Long tokenVersion = 0L;

    /**
     * Version du token mobile (SPIRIT-LIVRAISON). Indépendante de {@link #tokenVersion}.
     */
    @Builder.Default
    @Column(name = "token_version_mobile", nullable = true)
    private Long tokenVersionMobile = 0L;

    /**
     * Date de la dernière connexion réussie
     */
    private LocalDateTime lastLogin;

    /**
     * Date de création de l'enregistrement (géré automatiquement)
     */
    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    /**
     * Date de la dernière modification (géré automatiquement)
     */
    @UpdateTimestamp
    private LocalDateTime updatedAt;

    /** Rôles staff : tout le personnel boutique / plateforme. */
    public enum Role {
        SUPER_ADMIN,
        MANAGER,
        DELIVERY_AGENT
    }
}
