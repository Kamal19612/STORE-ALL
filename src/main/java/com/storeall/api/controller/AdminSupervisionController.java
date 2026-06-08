package com.storeall.api.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import com.storeall.api.dto.ImportSummary;
import com.storeall.api.dto.ManagerSupervisionRow;
import com.storeall.api.dto.StoreInfoResponse;
import com.storeall.api.dto.SuperManagerCreateRequest;
import com.storeall.api.dto.SuperManagerUpdateRequest;
import com.storeall.api.dto.SuperStoreCreateRequest;
import com.storeall.api.dto.SuperStoreUpdateRequest;
import com.storeall.api.dto.SupervisionOrderRow;
import com.storeall.api.dto.SupervisionProductRow;
import com.storeall.api.entity.User;
import com.storeall.api.service.AdminSupervisionService;
import com.storeall.api.service.TelegramService;

import lombok.RequiredArgsConstructor;

/**
 * Dashboard super admin : agrégats multi-boutiques. Pas de tenant {@link com.storeall.api.tenant.StoreContext}
 * (résolu à null pour ce préfixe d’URL).
 */
@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/super")
@PreAuthorize("hasRole('SUPER_ADMIN')")
@RequiredArgsConstructor
public class AdminSupervisionController {

    private final AdminSupervisionService supervisionService;
    private final ObjectMapper objectMapper;

    private static Map<String, Object> webhookPayload(TelegramService.WebhookRegistrationResult res) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("attempted", res != null && res.attempted());
        payload.put("success", res != null && res.success());
        payload.put("message", res == null ? "" : (res.message() == null ? "" : res.message()));
        return payload;
    }

    @GetMapping("/stores")
    public ResponseEntity<List<StoreInfoResponse>> listStores() {
        return ResponseEntity.ok(supervisionService.listStores());
    }

    @PostMapping(value = "/stores", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<StoreInfoResponse> createStoreJson(@RequestBody SuperStoreCreateRequest body) {
        return ResponseEntity.ok(supervisionService.createStore(body, null));
    }

    @PostMapping(value = "/stores", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<StoreInfoResponse> createStoreMultipart(
            @RequestPart("store") String storeJson,
            @RequestPart(value = "logo", required = false) MultipartFile logoFile) throws JsonProcessingException {
        SuperStoreCreateRequest body = objectMapper.readValue(storeJson, SuperStoreCreateRequest.class);
        return ResponseEntity.ok(supervisionService.createStore(body, logoFile));
    }

    @PutMapping(value = "/stores/{storeId}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<StoreInfoResponse> updateStoreJson(
            @PathVariable Long storeId,
            @RequestBody SuperStoreUpdateRequest body) {
        return ResponseEntity.ok(supervisionService.updateStore(storeId, body, null));
    }

    @PutMapping(value = "/stores/{storeId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<StoreInfoResponse> updateStoreMultipart(
            @PathVariable Long storeId,
            @RequestPart("store") String storeJson,
            @RequestPart(value = "logo", required = false) MultipartFile logoFile) throws JsonProcessingException {
        SuperStoreUpdateRequest body = objectMapper.readValue(storeJson, SuperStoreUpdateRequest.class);
        return ResponseEntity.ok(supervisionService.updateStore(storeId, body, logoFile));
    }

    @DeleteMapping("/stores/{storeId}")
    public ResponseEntity<Void> deleteStore(@PathVariable Long storeId) {
        supervisionService.deleteStore(storeId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/orders")
    public ResponseEntity<Page<SupervisionOrderRow>> listOrders(
            @RequestParam(required = false) Long storeId,
            @PageableDefault(sort = "createdAt", direction = org.springframework.data.domain.Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(supervisionService.listOrders(storeId, pageable));
    }

    @GetMapping("/products")
    public ResponseEntity<Page<SupervisionProductRow>> listProducts(
            @RequestParam(required = false) Long storeId,
            @RequestParam(required = false, defaultValue = "") String search,
            @PageableDefault(size = 20, sort = "id", direction = org.springframework.data.domain.Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(supervisionService.listProducts(storeId, search, pageable));
    }

    @GetMapping("/manager-users")
    public ResponseEntity<java.util.List<ManagerSupervisionRow>> listManagers(
            @RequestParam(required = false) Long storeId,
            @RequestParam(required = false, defaultValue = "") String search) {
        return ResponseEntity.ok(supervisionService.listManagers(storeId, search));
    }

    @PostMapping("/manager-users")
    public ResponseEntity<User> createManager(@RequestBody SuperManagerCreateRequest body) {
        return ResponseEntity.ok(supervisionService.createManager(body));
    }

    @GetMapping("/manager-users/{id}")
    public ResponseEntity<ManagerSupervisionRow> getManager(@PathVariable Long id) {
        return ResponseEntity.ok(supervisionService.getManager(id));
    }

    @PutMapping("/manager-users/{id}")
    public ResponseEntity<ManagerSupervisionRow> updateManager(
            @PathVariable Long id,
            @RequestBody SuperManagerUpdateRequest body) {
        return ResponseEntity.ok(supervisionService.updateManager(id, body));
    }

    @DeleteMapping("/manager-users/{id}")
    public ResponseEntity<Void> deleteManager(@PathVariable Long id) {
        supervisionService.deleteManager(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping(value = "/products/export-csv", produces = "text/csv; charset=UTF-8")
    public ResponseEntity<byte[]> exportProductsCsv(@RequestParam(required = false) Long storeId) {
        byte[] body = supervisionService.exportProductsCsv(storeId);
        String suffix = storeId != null ? "store-" + storeId : "all-stores";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"products-" + suffix + ".csv\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(body);
    }

    @PostMapping(value = "/products/import-csv", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ImportSummary> importProductsCsv(
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) Long storeId) {
        return ResponseEntity.ok(supervisionService.importProductsCsv(file, storeId));
    }

    private ResponseEntity<Map<String, Object>> clearStoreCatalogResponse(Long storeId) {
        int deleted = supervisionService.deleteAllProductsForStore(storeId);
        return ResponseEntity.ok(Map.of(
                "message", "Catalogue de la boutique vidé",
                "deletedCount", deleted,
                "storeId", storeId));
    }

    /**
     * Supprime tous les produits d'une boutique (et les lignes de commande liées à ces produits).
     * Paramètre {@code storeId} obligatoire — pas de suppression multi-boutiques en un clic.
     */
    @DeleteMapping("/products")
    public ResponseEntity<Map<String, Object>> deleteAllProductsForStore(@RequestParam Long storeId) {
        return clearStoreCatalogResponse(storeId);
    }

    /**
     * Même effet que {@link #deleteAllProductsForStore(Long)} — utilisé par l’UI super-admin pour éviter
     * toute confusion avec {@code DELETE /api/products} (catalogue public, non supporté).
     */
    @PostMapping("/products/clear-catalog")
    public ResponseEntity<Map<String, Object>> clearStoreCatalogPost(@RequestParam Long storeId) {
        return clearStoreCatalogResponse(storeId);
    }

    @PostMapping(value = "/stores/import-csv", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ImportSummary> importStoresCsv(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(supervisionService.importStoresCsv(file));
    }

    @GetMapping(value = "/stores/export-csv", produces = "text/csv; charset=UTF-8")
    public ResponseEntity<byte[]> exportStoresCsv() {
        byte[] body = supervisionService.exportStoresCsv();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"stores-export.csv\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(body);
    }

    /**
     * Import boutiques depuis un Google Sheet (URL ou ID). Colonnes : code, name/nom, etc.
     * Ne modifie pas {@code google_sheet_id} des paramètres produits.
     */
    @PostMapping("/stores/import-sheets")
    public ResponseEntity<ImportSummary> importStoresFromGoogleSheets(
            @RequestParam("spreadsheetId") String spreadsheetId,
            @RequestParam(required = false) Long sheetGid) {
        return ResponseEntity.ok(supervisionService.importStoresFromGoogleSheets(spreadsheetId, sheetGid));
    }

    /** Token / chat ID Telegram plateforme (lignes app_settings sans boutique). */
    @GetMapping("/settings/telegram-platform")
    public ResponseEntity<Map<String, String>> getTelegramPlatformSettings() {
        return ResponseEntity.ok(supervisionService.getSuperTelegramPlatformSettings());
    }

    @PutMapping("/settings/telegram-platform")
    public ResponseEntity<Void> updateTelegramPlatformSettings(@RequestBody(required = false) Map<String, String> body) {
        supervisionService.updateSuperTelegramPlatformSettings(body == null ? Map.of() : body);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/settings/application-summary")
    public ResponseEntity<Map<String, Object>> getApplicationSummary() {
        return ResponseEntity.ok(supervisionService.getSuperApplicationSummary());
    }

    @PostMapping("/settings/telegram/webhook/register")
    public ResponseEntity<Map<String, Object>> registerTelegramWebhookPlatform() {
        return ResponseEntity.ok(webhookPayload(supervisionService.registerSuperTelegramWebhook()));
    }

    @PostMapping("/settings/telegram/webhook/unregister")
    public ResponseEntity<Map<String, Object>> unregisterTelegramWebhookPlatform() {
        return ResponseEntity.ok(webhookPayload(supervisionService.unregisterSuperTelegramWebhook()));
    }

    @GetMapping("/settings/telegram/webhook/info")
    public ResponseEntity<String> telegramWebhookInfoPlatform() {
        return ResponseEntity.ok(supervisionService.getSuperTelegramWebhookInfoRaw());
    }

    @PostMapping("/settings/telegram/test")
    public ResponseEntity<Map<String, Object>> sendTelegramTestPlatform(@RequestBody(required = false) Map<String, String> body) {
        String text = body == null ? "" : body.getOrDefault("text", "");
        supervisionService.sendSuperTelegramTest(text);
        return ResponseEntity.ok(Map.of("success", true));
    }
}
