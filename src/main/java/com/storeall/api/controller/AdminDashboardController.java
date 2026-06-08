package com.storeall.api.controller;

import com.storeall.api.dto.DashboardStatsResponse;
import com.storeall.api.service.DashboardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Contrôleur pour les endpoints du dashboard admin
 */
@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/manager/{storeId}/dashboard")
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'MANAGER')")
public class AdminDashboardController {

    @Autowired
    private DashboardService dashboardService;

    /**
     * GET /api/admin/dashboard/stats Récupère les statistiques pour le
     * dashboard admin
     */
    @GetMapping("/stats")
    public ResponseEntity<DashboardStatsResponse> getStats(@PathVariable Long storeId) {
        DashboardStatsResponse stats = dashboardService.getStatistics(storeId);
        return ResponseEntity.ok(stats);
    }

    /**
     * POST /api/admin/dashboard/reset-stats Réinitialise les statistiques
     * (Supprime toutes les commandes). Réservé au SUPER_ADMIN.
     */
    @org.springframework.web.bind.annotation.PostMapping("/reset-stats")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<?> resetStats() {
        dashboardService.resetStatistics();
        return ResponseEntity.ok().body("{\"message\": \"Statistiques réinitialisées avec succès\"}");
    }
}
