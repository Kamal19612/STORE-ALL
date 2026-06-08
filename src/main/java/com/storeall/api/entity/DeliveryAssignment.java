package com.storeall.api.entity;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Central delivery dispatch entity.
 * Keeps an audit-friendly view of which delivery user is assigned to which order.
 */
@Entity
@Table(
    name = "delivery_assignments",
    indexes = {
        @Index(name = "idx_delivery_assignment_order", columnList = "order_id"),
        @Index(name = "idx_delivery_assignment_user", columnList = "delivery_user_id")
    }
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeliveryAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false, unique = true)
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "delivery_user_id")
    private User deliveryUser;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Status status;

    /**
     * Optional free-text note (failure reason, dispatch note, etc.).
     */
    @Column(columnDefinition = "TEXT")
    private String note;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    public enum Status {
        ASSIGNED,
        CLAIMED,
        DELIVERED,
        FAILED,
        CANCELLED
    }
}

