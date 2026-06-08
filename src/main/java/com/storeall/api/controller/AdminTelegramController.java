package com.storeall.api.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.storeall.api.service.TelegramService;

@RestController
@RequestMapping("/api/manager/{storeId}/telegram")
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'MANAGER')")
public class AdminTelegramController {

    private final TelegramService telegramService;

    public AdminTelegramController(TelegramService telegramService) {
        this.telegramService = telegramService;
    }

    private static Map<String, Object> toPayload(TelegramService.WebhookRegistrationResult res) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("attempted", res != null && res.attempted());
        payload.put("success", res != null && res.success());
        payload.put("message", res == null ? "" : (res.message() == null ? "" : res.message()));
        return payload;
    }

    @PostMapping("/webhook/register")
    public ResponseEntity<Map<String, Object>> registerWebhook() {
        TelegramService.WebhookRegistrationResult res = telegramService.registerWebhookNow();
        return ResponseEntity.ok(toPayload(res));
    }

    @PostMapping("/webhook/unregister")
    public ResponseEntity<Map<String, Object>> unregisterWebhook() {
        TelegramService.WebhookRegistrationResult res = telegramService.unregisterWebhookNow();
        return ResponseEntity.ok(toPayload(res));
    }

    @GetMapping("/webhook/info")
    public ResponseEntity<String> webhookInfo() {
        return ResponseEntity.ok(telegramService.getWebhookInfoRaw());
    }

    @PostMapping("/test")
    public ResponseEntity<Map<String, Object>> sendTest(@RequestBody(required = false) Map<String, String> body) {
        String text = body == null ? "" : body.getOrDefault("text", "");
        telegramService.sendTestMessage(text);
        return ResponseEntity.ok(Map.of("success", true));
    }
}

