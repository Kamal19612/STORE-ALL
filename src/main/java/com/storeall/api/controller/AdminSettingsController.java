package com.storeall.api.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.storeall.api.entity.AppSetting;
import com.storeall.api.service.AppSettingService;
import com.storeall.api.service.TelegramService;

import lombok.RequiredArgsConstructor;

/**
 * Paramètres boutique : vitrine publique et espace manager.
 */
@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequiredArgsConstructor
public class AdminSettingsController {

    private final AppSettingService appSettingService;
    private final TelegramService telegramService;

    /**
     * GET /api/public/settings — checkout, livraison, footer (tenant via X-Store-Code / Host).
     */
    @GetMapping("/api/public/settings")
    public Map<String, String> getPublicSettings() {
        return appSettingService.getPublicSettings();
    }

    /**
     * GET /api/manager/{storeId}/settings — liste clé/valeur pour l'admin boutique.
     */
    @GetMapping("/api/manager/{storeId}/settings")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'MANAGER')")
    public List<AppSetting> getAllSettings(@PathVariable Long storeId) {
        return appSettingService.getAllSettings();
    }

    /**
     * PUT /api/manager/{storeId}/settings — sauvegarde + tentative d'enregistrement webhook Telegram.
     */
    @PutMapping("/api/manager/{storeId}/settings")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'MANAGER')")
    public ResponseEntity<Void> updateSettings(
            @PathVariable Long storeId,
            @RequestBody Map<String, String> settings) {
        appSettingService.updateSettings(settings);
        telegramService.registerWebhookNow();
        return ResponseEntity.ok().build();
    }
}
