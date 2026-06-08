package com.storeall.api.notification;

import java.util.Objects;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class NotificationRunner {

    private static final Logger log = LoggerFactory.getLogger(NotificationRunner.class);

    /**
     * Exécute une action de notification de façon isolée:
     * - jamais d'exception propagée
     * - log structuré [NOTIF] (SUCCESS/FAIL)
     * - durée d'exécution
     *
     * Point d'extension futur: retry/backoff/outbox.
     */
    public NotificationResult executeNotification(NotificationChannel channel, String orderNumber, Runnable action) {
        Objects.requireNonNull(channel, "channel");
        String ord = orderNumber == null ? "" : orderNumber;

        if (action == null) {
            NotificationResult r = NotificationResult.skipped(channel, ord, "action_null");
            log.warn("[NOTIF] channel={} order={} status={} error={}", channel, ord, r.status(), r.error());
            return r;
        }

        long start = System.nanoTime();
        try {
            action.run();
            long durMs = (System.nanoTime() - start) / 1_000_000;
            NotificationResult r = NotificationResult.success(channel, ord, durMs);
            log.info("[NOTIF] channel={} order={} status={} durationMs={}", channel, ord, r.status(), r.durationMs());
            return r;
        } catch (Exception e) {
            long durMs = (System.nanoTime() - start) / 1_000_000;
            String err = e.toString();
            NotificationResult r = NotificationResult.fail(channel, ord, durMs, err);
            log.warn("[NOTIF] channel={} order={} status={} durationMs={} error={}", channel, ord, r.status(), r.durationMs(), r.error());
            return r;
        }
    }
}

