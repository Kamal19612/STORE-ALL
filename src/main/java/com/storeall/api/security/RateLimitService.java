package com.storeall.api.security;

import java.time.Duration;
import java.util.Deque;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;

import org.springframework.stereotype.Service;

/**
 * Limiteur en mémoire (fenêtre glissante) par clé (ex. IP + endpoint).
 * Suffisant pour une instance ; pour un cluster, préférer Redis.
 */
@Service
public class RateLimitService {

    private final ConcurrentHashMap<String, Deque<Long>> buckets = new ConcurrentHashMap<>();

    public boolean tryConsume(String key, int maxRequests, Duration window) {
        if (maxRequests <= 0) {
            return true;
        }
        long now = System.currentTimeMillis();
        long windowMs = window.toMillis();
        Deque<Long> times = buckets.computeIfAbsent(key, ignored -> new ConcurrentLinkedDeque<>());
        synchronized (times) {
            while (!times.isEmpty() && times.peekFirst() < now - windowMs) {
                times.pollFirst();
            }
            if (times.size() >= maxRequests) {
                return false;
            }
            times.addLast(now);
            return true;
        }
    }
}
