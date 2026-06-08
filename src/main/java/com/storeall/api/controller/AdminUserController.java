package com.storeall.api.controller;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.storeall.api.entity.User;
import com.storeall.api.security.UserDetailsServiceImpl;

/**
 * Contrôleur REST pour l'administration des utilisateurs. Nécessite le rôle
 * SUPER_ADMIN ou MANAGER (création de managers réservée au super admin côté service).
 */
@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/manager/{storeId}/users")
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'MANAGER')")
public class AdminUserController {

    @Autowired
    private UserDetailsServiceImpl userService;

    @Autowired
    private com.storeall.api.repository.DeliveryAgentRepository deliveryAgentRepository;

    /**
     * GET /api/admin/users : Liste de tous les utilisateurs.
     */
    @GetMapping
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    /**
     * PUT /api/admin/users/{id}/role : Body: { "role": "MANAGER" | "SUPER_ADMIN" }
     */
    @PutMapping("/{id}/role")
    public ResponseEntity<User> updateUserRole(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        String role = payload.get("role");
        return ResponseEntity.ok(userService.updateUserRole(id, role));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'MANAGER')")
    public ResponseEntity<User> createUser(@RequestBody User user) {
        return ResponseEntity.ok(userService.createUser(user));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'MANAGER')")
    public ResponseEntity<User> updateUser(@PathVariable Long id, @RequestBody User user) {
        return ResponseEntity.ok(userService.updateUser(id, user));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'MANAGER')")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
        return ResponseEntity.ok().build();
    }

    /**
     * GET …/users/{id}/delivery-agent : provisionnement Supabase Auth (table {@code delivery_agents}).
     */
    @GetMapping("/{id}/delivery-agent")
    public ResponseEntity<Map<String, Object>> getDeliveryAgentStatus(@PathVariable Long id) {
        String authUserId = deliveryAgentRepository.findAuthUserIdByStoreUserId(id);
        return ResponseEntity.ok(
            Map.of(
                "provisioned", authUserId != null && !authUserId.isBlank(),
                "authUserId", authUserId == null ? "" : authUserId
            )
        );
    }

}
