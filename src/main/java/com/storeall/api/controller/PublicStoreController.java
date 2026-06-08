package com.storeall.api.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.storeall.api.dto.StoreInfoResponse;
import com.storeall.api.entity.Store;
import com.storeall.api.service.StoreService;
import com.storeall.api.tenant.StoreContext;

import lombok.RequiredArgsConstructor;

/**
 * Infos boutique du tenant courant (résolu via {@code X-Store-Code} / domaine), sans authentification.
 */
@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/store")
@RequiredArgsConstructor
public class PublicStoreController {

    private final StoreService storeService;

    @GetMapping("/info")
    public ResponseEntity<StoreInfoResponse> getCurrentStoreInfo() {
        Store s = StoreContext.get();
        if (s == null || s.getId() == null) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(storeService.getStoreInfo(s.getId()));
    }
}
