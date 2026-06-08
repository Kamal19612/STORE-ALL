package com.storeall.api.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Stocke les souscriptions Web Push (VAPID) par utilisateur.
 * Un utilisateur peut avoir plusieurs appareils.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "push_subscriptions",
       uniqueConstraints = @UniqueConstraint(columnNames = "endpoint"))
public class PushSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 512)
    private String endpoint;

    @Column(name = "p256dh", nullable = false, length = 256)
    private String p256dh;

    @Column(name = "auth_key", nullable = false, length = 64)
    private String auth;
}