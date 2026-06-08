package com.storeall.api.service;

import java.time.LocalDateTime;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.storeall.api.entity.NotificationOutbox;
import com.storeall.api.repository.NotificationOutboxRepository;

@Service
public class NotificationOutboxService {

    private static final Logger log = LoggerFactory.getLogger(NotificationOutboxService.class);

    private final NotificationOutboxRepository repo;
    private final ObjectMapper objectMapper;

    public NotificationOutboxService(NotificationOutboxRepository repo, ObjectMapper objectMapper) {
        this.repo = repo;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public NotificationOutbox enqueue(NotificationOutbox.Channel channel,
                                      NotificationOutbox.EventType eventType,
                                      Long orderId,
                                      String orderNumber,
                                      Map<String, Object> payload) {
        String payloadJson = null;
        try {
            if (payload != null && !payload.isEmpty()) {
                payloadJson = objectMapper.writeValueAsString(payload);
            }
        } catch (Exception e) {
            payloadJson = "{\"error\":\"payload_serialization_failed\"}";
        }

        NotificationOutbox row = NotificationOutbox.builder()
            .channel(channel)
            .eventType(eventType)
            .status(NotificationOutbox.Status.PENDING)
            .orderId(orderId)
            .orderNumber(orderNumber == null ? "" : orderNumber)
            .payloadJson(payloadJson)
            .attempts(0)
            .nextAttemptAt(LocalDateTime.now())
            .lastError(null)
            .build();

        return repo.save(row);
    }

    @Transactional
    public void markSent(Long id) {
        repo.findById(id).ifPresent(row -> {
            row.setStatus(NotificationOutbox.Status.SENT);
            row.setLastError(null);
            repo.save(row);
        });
    }

    @Transactional
    public void markFailedAndScheduleRetry(Long id, String error, int attempts) {
        repo.findById(id).ifPresent(row -> {
            int nextAttempts = Math.max(attempts, row.getAttempts() + 1);
            row.setAttempts(nextAttempts);
            row.setLastError(error);

            // Backoff simple: 10s, 30s, 2m, 5m, 15m, 1h (cap)
            long delaySeconds = switch (Math.min(nextAttempts, 6)) {
                case 1 -> 10;
                case 2 -> 30;
                case 3 -> 120;
                case 4 -> 300;
                case 5 -> 900;
                default -> 3600;
            };

            row.setNextAttemptAt(LocalDateTime.now().plusSeconds(delaySeconds));
            row.setStatus(nextAttempts >= 10 ? NotificationOutbox.Status.DEAD : NotificationOutbox.Status.RETRY);
            repo.save(row);

            log.warn("[NOTIF] channel={} order={} status={} error={} nextAttemptInSec={}",
                row.getChannel(), row.getOrderNumber(), row.getStatus(), error, delaySeconds);
        });
    }

    @Transactional
    public void markInProgress(NotificationOutbox row) {
        row.setStatus(NotificationOutbox.Status.IN_PROGRESS);
        repo.save(row);
    }
}

