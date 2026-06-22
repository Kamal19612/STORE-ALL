package com.storeall.api.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.storeall.api.entity.Store;
import com.storeall.api.tenant.StoreContext;

import com.storeall.api.dto.ImportSummary;
import com.storeall.api.repository.AppSettingRepository;
import com.storeall.api.service.GoogleSheetsService;
import com.storeall.api.service.ProductService;

@RestController
@RequestMapping("/api/manager/{storeId}/products")
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'MANAGER')")
public class AdminImportController {

    @Autowired
    private ProductService productService;

    @Autowired
    private GoogleSheetsService googleSheetsService;

    @Autowired
    private AppSettingRepository appSettingRepository;

    @org.springframework.beans.factory.annotation.Value("${google.sheets.spreadsheet-id:}")
    private String defaultSpreadsheetId;

    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ImportSummary> importProducts(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(productService.processCsvImport(file));
    }

    /**
     * GET /api/admin/products/export-csv : export catalogue (même format que POST /import), UTF-8 avec BOM.
     */
    @GetMapping(value = "/export-csv", produces = "text/csv; charset=UTF-8")
    public ResponseEntity<byte[]> exportProductsCsv() {
        Store s = StoreContext.get();
        if (s == null || s.getId() == null) {
            return ResponseEntity.badRequest().build();
        }
        byte[] body = productService.exportCatalogCsv(s.getId());
        String safe = s.getCode() == null ? "store" : s.getCode().replaceAll("[^a-zA-Z0-9_-]", "_");
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"products-" + safe + ".csv\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(body);
    }

    @PostMapping({"/import-google-sheets", "/google-sheets-sync"})
    public ResponseEntity<ImportSummary> importFromGoogleSheets(
            @RequestParam(value = "spreadsheetId", required = false) String spreadsheetId,
            @RequestParam(value = "sheetGid", required = false) Long sheetGid) {
        return ResponseEntity.ok(googleSheetsService.fetchProducts(spreadsheetId, sheetGid));
    }

    /**
     * GET /api/admin/products/sheet-config : Retourne l'ID du sheet sauvegardé.
     */
    /**
     * Vérifie si plusieurs boutiques partagent le même Google Sheet (cause fréquente de catalogue dupliqué).
     */
    @GetMapping("/sheet-diagnostics")
    public ResponseEntity<java.util.Map<String, Object>> getSheetDiagnostics() {
        return ResponseEntity.ok(googleSheetsService.buildSheetDiagnostics());
    }

    @GetMapping("/sheet-config")
    public ResponseEntity<java.util.Map<String, String>> getSheetConfig() {
        Store ctx = StoreContext.get();
        String savedId = "";
        if (ctx != null && ctx.getId() != null) {
            savedId = appSettingRepository.findByKeyAndStoreId("google_sheet_id", ctx.getId())
                    .map(com.storeall.api.entity.AppSetting::getValue)
                    .filter(v -> !v.isBlank())
                    .orElse("");
        } else {
            savedId = appSettingRepository.findByKeyAndStoreIsNull("google_sheet_id")
                    .map(com.storeall.api.entity.AppSetting::getValue)
                    .filter(v -> !v.isBlank())
                    .orElse(defaultSpreadsheetId != null ? defaultSpreadsheetId : "");
        }
        java.util.Map<String, String> body = new java.util.LinkedHashMap<>();
        body.put("spreadsheetId", savedId);
        googleSheetsService.getServiceAccountEmail()
                .ifPresent(email -> body.put("serviceAccountEmail", email));
        return ResponseEntity.ok(body);
    }
}
