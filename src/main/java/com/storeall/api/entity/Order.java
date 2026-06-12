package com.storeall.api.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Entité représentant une commande effectuée par un client (connecté ou
 * invité).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "orders", indexes = {
    @Index(name = "idx_order_status", columnList = "status"),
    @Index(name = "idx_order_created_at", columnList = "createdAt"),
    @Index(name = "idx_order_deleted", columnList = "deleted"),

    // Multi-store critical indexes
    @Index(name = "idx_orders_store_id", columnList = "store_id"),
    @Index(name = "idx_orders_store_status", columnList = "store_id,status"),
    @Index(name = "idx_orders_store_created_at", columnList = "store_id,created_at")
})
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Store owner (tenant).
     * Nullable for backward compatibility until migrator attaches existing rows.
     */
    @jakarta.persistence.ManyToOne(fetch = jakarta.persistence.FetchType.LAZY)
    @jakarta.persistence.JoinColumn(name = "store_id")
    private Store store;

    /**
     * Numéro unique de commande (ex: ORD-2024-XXXX)
     */
    @Column(nullable = false, unique = true, length = 20)
    private String orderNumber;

    /**
     * Code de confirmation unique (ex: 1234)
     */
    @Column(unique = true, length = 10)
    private String confirmationCode;

    /**
     * Nom du client (pour l'expédition)
     */
    @Column(nullable = false)
    private String customerName;

    /**
     * Téléphone / WhatsApp du client
     */
    @Column(nullable = false, length = 20)
    private String customerPhone;

    /**
     * Adresse de livraison complète
     */
    @Column(nullable = false, columnDefinition = "TEXT")
    private String customerAddress;

    /**
     * Notes optionnelles laissées par le client
     */
    @Column(columnDefinition = "TEXT")
    private String customerNotes;

    /**
     * Coordonnées GPS pour la livraison (Latitude)
     */
    @Column(precision = 10, scale = 8)
    private BigDecimal customerLatitude;

    /**
     * Coordonnées GPS pour la livraison (Longitude)
     */
    @Column(precision = 11, scale = 8)
    private BigDecimal customerLongitude;

    /**
     * Mode de commande : livraison ({@link FulfillmentType#DELIVERY}) ou retrait boutique ({@link FulfillmentType#PICKUP}).
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "fulfillment_type", length = 20)
    @Builder.Default
    private FulfillmentType fulfillmentType = FulfillmentType.DELIVERY;

    /**
     * Type de livraison (STANDARD, EXPRESS, PROGRAMMER) — uniquement si {@link #fulfillmentType} = DELIVERY.
     */
    @Column(length = 20)
    private String deliveryType;

    /**
     * Heure de livraison programmée
     */
    @Column(length = 50)
    private String scheduledTime;

    /**
     * Lien Google Maps manuel fourni par le client
     */
    @Column(columnDefinition = "TEXT")
    private String manualLocationLink;

    /**
     * Frais de livraison appliqués
     */
    private BigDecimal deliveryCost;

    /**
     * Distance calculée pour la livraison (en km)
     */
    @Column(precision = 10, scale = 2)
    private BigDecimal distance;

    /**
     * Sous-total de la commande (somme des articles)
     */
    @Column(nullable = false)
    private BigDecimal subtotal;

    /**
     * Montant des taxes ou frais supplémentaires
     */
    @Builder.Default
    private BigDecimal tax = BigDecimal.ZERO;

    /**
     * Montant total à payer (Subtotal + Tax)
     */
    @Column(nullable = false)
    private BigDecimal total;

    /**
     * Statut actuel de la commande
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Status status = Status.PENDING;

    /**
     * Liste des articles commandés
     */
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<OrderItem> items = new ArrayList<>();

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    /**
     * Enumération des statuts possibles d'une commande.
     */
    public enum Status {
        PENDING, // En attente de validation
        CONFIRMED, // Validée par l'admin
        REJECTED, // Rejetée par l'admin (refus explicite)
        SHIPPED, // Expédiée / En cours de livraison
        DELIVERED, // Livrée au client
        CANCELLED  // Annulée
    }
    /**
     * Historique des statuts de la commande
     */
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<OrderStatusHistory> statusHistory = new ArrayList<>();

    /**
     * Indicateur de suppression logique (soft delete) pour la synchronisation
     * mobile.
     */
    @Column(nullable = false)
    @Builder.Default
    private boolean deleted = false;

    /**
     * Livreur assigné à la commande
     */
    @jakarta.persistence.ManyToOne
    @jakarta.persistence.JoinColumn(name = "delivery_agent_id")
    private User deliveryAgent;

    /** {@code true} si la commande est à retirer en boutique (pas de livreur). */
    public boolean isPickup() {
        return fulfillmentType == FulfillmentType.PICKUP;
    }

    /** {@code true} si la commande nécessite une livraison (y compris anciennes lignes sans {@code fulfillment_type}). */
    public boolean isDelivery() {
        return fulfillmentType == null || fulfillmentType == FulfillmentType.DELIVERY;
    }
}
