package com.storeall.api.controller;

import java.util.Collection;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.storeall.api.entity.CustomerPushSubscription;
import com.storeall.api.entity.PushSubscription;
import com.storeall.api.entity.User;
import com.storeall.api.repository.CustomerPushSubscriptionRepository;
import com.storeall.api.repository.PushSubscriptionRepository;
import com.storeall.api.repository.UserRepository;
import com.storeall.api.service.NotificationService;

/**
 * Endpoint SSE (Server-Sent Events) pour les notifications temps réel,
 * et endpoint Web Push pour l'enregistrement des souscriptions VAPID.
 */
@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private PushSubscriptionRepository pushRepo;

    @Autowired
    private CustomerPushSubscriptionRepository customerPushRepo;

    @Autowired
    private UserRepository userRepository;

    // ─── SSE ─────────────────────────────────────────────────────────────────

    @GetMapping(value = "/stream/admin", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'MANAGER')")
    public SseEmitter streamAdmin(Authentication authentication) {
        return subscribe(authentication);
    }

    @GetMapping(value = "/stream/delivery", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'MANAGER', 'DELIVERY_AGENT')")
    public SseEmitter streamDelivery(Authentication authentication) {
        return subscribe(authentication);
    }

    private SseEmitter subscribe(Authentication authentication) {
        String username = authentication.getName();
        Collection<String> roles = authentication.getAuthorities().stream()
                .map(a -> a.getAuthority())
                .collect(Collectors.toList());
        return notificationService.subscribe(username, roles);
    }

    // ─── Web Push ─────────────────────────────────────────────────────────────

    /**
     * Enregistre ou met à jour la souscription Web Push d'un appareil.
     * Body attendu : { endpoint, keys: { p256dh, auth } }
     */
    @PostMapping("/push/subscribe")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> subscribe(
            @RequestBody Map<String, Object> body,
            Authentication authentication) {

        String endpoint = (String) body.get("endpoint");

        @SuppressWarnings("unchecked")
        Map<String, String> keys = (Map<String, String>) body.get("keys");

        if (endpoint == null || keys == null) {
            return ResponseEntity.badRequest().build();
        }

        User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        pushRepo.findByEndpoint(endpoint).ifPresentOrElse(
            existing -> {
                existing.setP256dh(keys.get("p256dh"));
                existing.setAuth(keys.get("auth"));
                pushRepo.save(existing);
            },
            () -> pushRepo.save(PushSubscription.builder()
                    .user(user)
                    .endpoint(endpoint)
                    .p256dh(keys.get("p256dh"))
                    .auth(keys.get("auth"))
                    .build())
        );

        return ResponseEntity.ok().build();
    }

    /**
     * Souscription push PUBLIQUE pour les clients (sans compte).
     * Liée au numéro de commande pour pouvoir notifier le client lors des changements de statut.
     * POST /api/notifications/push/customer-subscribe
     * Body: { orderNumber, endpoint, keys: { p256dh, auth } }
     */
    @PostMapping("/push/customer-subscribe")
    public ResponseEntity<Void> customerSubscribe(@RequestBody Map<String, Object> body) {
        String orderNumber = (String) body.get("orderNumber");
        String endpoint    = (String) body.get("endpoint");
        @SuppressWarnings("unchecked")
        Map<String, String> keys = (Map<String, String>) body.get("keys");

        if (orderNumber == null || endpoint == null || keys == null) {
            return ResponseEntity.badRequest().build();
        }

        customerPushRepo.findByEndpoint(endpoint).ifPresentOrElse(
            existing -> {
                existing.setOrderNumber(orderNumber);
                existing.setP256dh(keys.get("p256dh"));
                existing.setAuth(keys.get("auth"));
                customerPushRepo.save(existing);
            },
            () -> customerPushRepo.save(CustomerPushSubscription.builder()
                    .orderNumber(orderNumber)
                    .endpoint(endpoint)
                    .p256dh(keys.get("p256dh"))
                    .auth(keys.get("auth"))
                    .build())
        );

        return ResponseEntity.ok().build();
    }
}