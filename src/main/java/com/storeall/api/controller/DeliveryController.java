package com.storeall.api.controller;

import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.storeall.api.entity.Order;

/**
 * API livraison (prise en charge, code client) : staff boutique (MANAGER / SUPER_ADMIN).
 */
@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/delivery/orders")
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'MANAGER', 'DELIVERY_AGENT')")
public class DeliveryController {

    @Autowired
    private com.storeall.api.service.OrderService orderService;

    /**
     * GET /api/delivery/orders : Liste des commandes DISPONIBLES (CONFIRMED et
     * sans livreur).
     */
    @GetMapping
    public ResponseEntity<Page<Order>> getOrdersForDelivery(Pageable pageable) {
        return ResponseEntity.ok(orderService.getAvailableDeliveryOrders(pageable));
    }

    /**
     * GET /api/delivery/orders/my-orders : Mes commandes prises en charge.
     */
    @GetMapping("/my-orders")
    public ResponseEntity<Page<Order>> getMyOrders(
            Pageable pageable,
            org.springframework.security.core.Authentication authentication) {
        String username = authentication.getName();
        return ResponseEntity.ok(orderService.getMyDeliveryOrders(username, pageable));
    }

    /**
     * GET /api/delivery/orders/history : Livraisons terminées par le livreur connecté.
     */
    @GetMapping("/history")
    public ResponseEntity<Page<Order>> getMyDeliveryHistory(
            @org.springframework.data.web.PageableDefault(
                    sort = "updatedAt",
                    direction = org.springframework.data.domain.Sort.Direction.DESC
            ) Pageable pageable,
            org.springframework.security.core.Authentication authentication) {
        String username = authentication.getName();
        return ResponseEntity.ok(orderService.getMyDeliveryHistory(username, pageable));
    }

    /**
     * PUT /api/delivery/orders/{id}/claim : Prendre en charge une commande.
     */
    @PutMapping("/{id}/claim")
    public ResponseEntity<Order> claimOrder(
            @PathVariable Long id,
            org.springframework.security.core.Authentication authentication) {
        String username = authentication.getName();
        return ResponseEntity.ok(orderService.claimOrder(id, username));
    }

    /**
     * POST /api/delivery/orders/{id}/complete : Valider la livraison avec code.
     * Body: { "code": "1234" }
     */
    @org.springframework.web.bind.annotation.PostMapping("/{id}/complete")
    public ResponseEntity<Order> completeDelivery(
            @PathVariable Long id,
            @RequestBody Map<String, String> payload,
            org.springframework.security.core.Authentication authentication) {
        String username = authentication.getName();
        String code = payload.get("code");
        return ResponseEntity.ok(orderService.completeDelivery(id, username, code));
    }

    /**
     * PATCH-like API (via PUT) pour le mobile: mise à jour de statut livraison.
     *
     * Body:
     * - { "status": "CLAIMED" }                        -> claim
     * - { "status": "DELIVERED", "code": "1234" }      -> complete
     * - { "status": "FAILED", "reason": "..." }        -> annule (CANCELLED) avec note
     */
    @PutMapping("/{id}/livraison")
    public ResponseEntity<Order> updateDeliveryStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> payload,
            org.springframework.security.core.Authentication authentication) {
        String username = authentication.getName();
        String status = payload.getOrDefault("status", "").trim().toUpperCase();
        return switch (status) {
            case "CLAIMED" -> ResponseEntity.ok(orderService.claimOrder(id, username));
            case "DELIVERED" -> {
                String code = payload.get("code");
                yield ResponseEntity.ok(orderService.completeDelivery(id, username, code != null ? code : ""));
            }
            case "FAILED" -> {
                String reason = payload.getOrDefault("reason", "").trim();
                yield ResponseEntity.ok(orderService.failDelivery(id, username, reason));
            }
            default -> ResponseEntity.badRequest().build();
        };
    }

    /**
     * GET /api/delivery/orders/sync : Synchronisation des données (Mode
     * Offline). Query Param: lastSync (ISO string)
     */
    @GetMapping("/sync")
    public ResponseEntity<java.util.List<Order>> syncOrders(
            @org.springframework.web.bind.annotation.RequestParam(required = false) String lastSync) {
        return ResponseEntity.ok(orderService.syncOrders(lastSync));
    }
}
