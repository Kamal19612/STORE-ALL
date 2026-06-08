package com.storeall.api.entity;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Entité représentant l'historique des changements de statut d'une commande.
 * Permet la traçabilité complète : qui a changé le statut et quand.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "order_status_history")
public class OrderStatusHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Commande concernée par ce changement de statut
     */
    @com.fasterxml.jackson.annotation.JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    /**
     * Statut appliqué lors de ce changement
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private Order.Status status;

    /**
     * Administrateur ayant effectué le changement (NULL si automatique)
     */
    @com.fasterxml.jackson.annotation.JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    /**
     * Nom d'utilisateur de l'acteur (dénormalisé pour éviter les jointures et la suppression de compte)
     */
    @Column(length = 100)
    private String actorUsername;

    /**
     * Rôle de l'acteur au moment de l'action
     */
    @Column(length = 50)
    private String actorRole;

    /**
     * Date et heure du changement de statut
     */
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /**
     * Note optionnelle (ex: motif échec livraison, commentaire interne).
     */
    @Column(columnDefinition = "TEXT")
    private String note;
}
