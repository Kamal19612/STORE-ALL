package com.storeall.api.notification;

import java.time.Instant;

public record NotificationResult(
    NotificationChannel channel,
    String orderNumber,
    Status status,
    long durationMs,
    String error,
    Instant at
) {
    public enum Status { SUCCESS, FAIL, SKIPPED }

    public static NotificationResult success(NotificationChannel channel, String orderNumber, long durationMs) {
        return new NotificationResult(channel, orderNumber, Status.SUCCESS, durationMs, null, Instant.now());
    }

    public static NotificationResult fail(NotificationChannel channel, String orderNumber, long durationMs, String error) {
        return new NotificationResult(channel, orderNumber, Status.FAIL, durationMs, error, Instant.now());
    }

    public static NotificationResult skipped(NotificationChannel channel, String orderNumber, String reason) {
        return new NotificationResult(channel, orderNumber, Status.SKIPPED, 0, reason, Instant.now());
    }
}

