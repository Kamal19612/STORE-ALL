package com.storeall.api.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * API "webhooks livraison" côté mobile.
 *
 * Dans une architecture mobile robuste, l'app ne reçoit pas un webhook HTTP direct.
 * Elle s'inscrit (token device) puis le serveur pousse via FCM.
 */
@RestController
@RequestMapping("/api/webhooks/livraison")
public class DeliveryWebhookController {

    private final DeliveryDeviceController deviceController;

    public DeliveryWebhookController(DeliveryDeviceController deviceController) {
        this.deviceController = deviceController;
    }

    /**
     * Compat avec le besoin "POST /api/webhooks/livraison/inscription".
     *
     * Body: { "token": "<fcmToken>", "platform": "android|ios" }
     */
    @PostMapping("/inscription")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'MANAGER')")
    public ResponseEntity<Map<String, Object>> inscription(@RequestBody Map<String, String> body, Authentication auth) {
        // Déléguer la réponse (400 si token manquant, etc.) — ne pas masquer derrière un 200 systématique.
        return deviceController.register(body, auth);
    }
}

