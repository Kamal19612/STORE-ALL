package com.storeall.api.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.storeall.api.dto.OrderRequest;
import com.storeall.api.dto.OrderResponse;
import com.storeall.api.service.OrderService;

import jakarta.validation.Valid;

/**
 * Contrôleur REST pour la gestion des commandes publiques.
 */
@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/orders")
public class OrderController {

    @Autowired
    private OrderService orderService;

    /**
     * POST /api/orders : Créer une nouvelle commande. Accessible publiquement
     * (Guest Checkout).
     */
    @PostMapping
    public ResponseEntity<OrderResponse> createOrder(@Valid @RequestBody OrderRequest orderRequest) {
        OrderResponse response = orderService.createOrder(orderRequest);
        return ResponseEntity.ok(response);
    }
}
