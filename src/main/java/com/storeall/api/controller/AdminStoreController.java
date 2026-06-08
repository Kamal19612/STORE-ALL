package com.storeall.api.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.storeall.api.dto.StoreInfoResponse;
import com.storeall.api.dto.StoreUpdateRequest;
import com.storeall.api.service.StoreService;

import lombok.RequiredArgsConstructor;

/**
 * Fiche boutique du tenant actif (aligné sur {@code X-Store-Code} / domaine + droits utilisateur).
 */
@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/manager/{storeId}/store")
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'MANAGER')")
@RequiredArgsConstructor
public class AdminStoreController {

    private final StoreService storeService;

    @GetMapping
    public ResponseEntity<StoreInfoResponse> getCurrent(@PathVariable Long storeId) {
        return ResponseEntity.ok(storeService.getStoreInfo(storeId));
    }

    @PutMapping
    public ResponseEntity<StoreInfoResponse> updateCurrent(
        @PathVariable Long storeId,
        @RequestBody StoreUpdateRequest body) {
        return ResponseEntity.ok(storeService.updateStore(storeId, body));
    }
}
