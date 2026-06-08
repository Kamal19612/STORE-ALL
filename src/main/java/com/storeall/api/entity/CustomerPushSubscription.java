package com.storeall.api.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Souscription Web Push d'un client anonyme, liée à son numéro de commande.
 * Permet de notifier le client quand sa commande est validée ou annulée.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "customer_push_subscriptions",
       uniqueConstraints = @UniqueConstraint(columnNames = "endpoint"))
public class CustomerPushSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Numéro de commande du client (ex: ORD-1234567890) */
    @Column(name = "order_number", nullable = false, length = 64)
    private String orderNumber;

    @Column(nullable = false, length = 512)
    private String endpoint;

    @Column(name = "p256dh", nullable = false, length = 256)
    private String p256dh;

    @Column(name = "auth_key", nullable = false, length = 64)
    private String auth;
}