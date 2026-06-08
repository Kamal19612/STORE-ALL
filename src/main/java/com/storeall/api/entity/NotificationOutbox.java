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
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
    name = "notification_outbox",
    indexes = {
        @Index(name = "idx_notif_outbox_status_next", columnList = "status,nextAttemptAt"),
        @Index(name = "idx_notif_outbox_order", columnList = "orderNumber,orderId")
    }
)
public class NotificationOutbox {

    public enum Status { PENDING, IN_PROGRESS, SENT, RETRY, DEAD }

    public enum Channel { TELEGRAM, FCM, WEBPUSH }

    public enum EventType { NEW_ORDER_ADMIN, ORDER_STATUS_ADMIN, NEW_DELIVERY, CUSTOMER_STATUS }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Channel channel;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private EventType eventType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status;

    @Column(nullable = false)
    private Long orderId;

    @Column(nullable = false, length = 64)
    private String orderNumber;

    @Column(columnDefinition = "TEXT")
    private String payloadJson;

    @Column(nullable = false)
    private int attempts;

    @Column(name = "next_attempt_at", nullable = false)
    private LocalDateTime nextAttemptAt;

    @Column(columnDefinition = "TEXT")
    private String lastError;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}

