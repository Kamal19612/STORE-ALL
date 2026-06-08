package com.storeall.api.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.storeall.api.entity.Order;
import com.storeall.api.entity.DeliveryAssignment;
import com.storeall.api.repository.OrderRepository;
import com.storeall.api.repository.UserRepository;
import com.storeall.api.repository.StoreRepository;
import com.storeall.api.repository.DeliveryAssignmentRepository;

/**
 * Delivery GLOBAL module: can view orders across ALL stores.
 * This is the explicit exception to store isolation.
 */
@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/delivery/global")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class DeliveryGlobalOrdersController {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private StoreRepository storeRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DeliveryAssignmentRepository deliveryAssignmentRepository;

    /**
     * GET /api/delivery/global/orders
     * Optional: ?storeCode=sucre|spirit to filter by store.
     */
    @GetMapping("/orders")
    public ResponseEntity<Page<Order>> getAllOrders(Pageable pageable, @RequestParam(required = false) String storeCode) {
        if (storeCode != null && !storeCode.trim().isBlank()) {
            var store = storeRepository.findByCode(storeCode.trim().toLowerCase())
                .orElseThrow(() -> new RuntimeException("Store inconnu: " + storeCode));
            return ResponseEntity.ok(orderRepository.findByDeletedFalseAndStoreId(store.getId(), pageable));
        }
        return ResponseEntity.ok(orderRepository.findByDeletedFalse(pageable));
    }

    /**
     * POST /api/delivery/global/assign
     * Body: { "orderId": 123, "deliveryUsername": "delivery1" }
     */
    @PostMapping("/assign")
    public ResponseEntity<?> assignOrder(@RequestBody java.util.Map<String, Object> body) {
        Long orderId = body.get("orderId") == null ? null : Long.valueOf(String.valueOf(body.get("orderId")));
        String deliveryUsername = body.get("deliveryUsername") == null ? null : String.valueOf(body.get("deliveryUsername")).trim();
        if (orderId == null || deliveryUsername == null || deliveryUsername.isBlank()) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", "orderId et deliveryUsername requis"));
        }

        Order order = orderRepository.findById(orderId).orElseThrow(() -> new RuntimeException("Commande introuvable ID: " + orderId));
        var deliveryUser = userRepository.findByUsername(deliveryUsername).orElseThrow(() -> new RuntimeException("Livreur introuvable: " + deliveryUsername));

        // Assign without forcing SHIPPED yet; dispatcher can pre-assign.
        order.setDeliveryAgent(deliveryUser);
        Order saved = orderRepository.save(order);

        DeliveryAssignment assign = deliveryAssignmentRepository.findByOrderId(saved.getId())
            .orElseGet(() -> DeliveryAssignment.builder().order(saved).build());
        assign.setDeliveryUser(deliveryUser);
        assign.setStatus(DeliveryAssignment.Status.ASSIGNED);
        deliveryAssignmentRepository.save(assign);

        return ResponseEntity.ok(java.util.Map.of("ok", true));
    }
}

