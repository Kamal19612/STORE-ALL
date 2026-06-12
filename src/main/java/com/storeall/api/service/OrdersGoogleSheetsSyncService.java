package com.storeall.api.service;

import java.security.GeneralSecurityException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.storeall.api.dto.OrdersSheetSyncSummary;
import com.storeall.api.entity.AppSetting;
import com.storeall.api.entity.Order;
import com.storeall.api.entity.OrderItem;
import com.storeall.api.repository.AppSettingRepository;
import com.storeall.api.repository.OrderRepository;

import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class OrdersGoogleSheetsSyncService {

    private static final DateTimeFormatter DT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Autowired
    private GoogleSheetsService googleSheetsService;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private AppSettingRepository appSettingRepository;

    /**
     * Synchronisation automatique (cadence {@code fixedRate} : toutes les N ms, défaut 1 minute).
     * Désactivable via app_settings.google_orders_sheet_sync_enabled = "false".
     */
    @org.springframework.scheduling.annotation.Scheduled(
        fixedRateString = "${orders.sheets.sync-rate:60000}",
        initialDelayString = "${orders.sheets.sync-initial-delay:45000}")
    public void syncOrdersScheduled() {
        boolean isEnabled = appSettingRepository.findByKey("google_orders_sheet_sync_enabled")
            .map(s -> !"false".equalsIgnoreCase(s.getValue()))
            .orElse(true);

        if (!isEnabled) {
            log.info("⏸️ Sync commandes -> Google Sheets ignorée (désactivée dans les paramètres)");
            return;
        }

        OrdersSheetSyncSummary r = syncAllOrders(null);
        if (r.getError() != null && !r.getError().isBlank()) {
            log.warn("⚠️ Sync commandes -> Google Sheets: {}", r.getError());
        } else {
            log.info("✅ Sync commandes -> Google Sheets OK. orders={} rows={}", r.getOrdersExported(), r.getRowsWritten());
        }
    }

    /**
     * Export complet des commandes vers Google Sheets.
     *
     * - Onglet: "Commandes" (configurable via app_settings.google_orders_sheet_tab)
     * - Spreadsheet ID: paramètre > app_settings.google_orders_sheet_id > app_settings.google_sheet_id
     *
     * IMPORTANT: pour écrire, le compte de service doit avoir accès en ÉDITEUR au Sheet.
     */
    @Transactional(readOnly = true)
    public OrdersSheetSyncSummary syncAllOrders(String spreadsheetIdOverride) {
        OrdersSheetSyncSummary summary = new OrdersSheetSyncSummary();

        String spreadsheetId = resolveSpreadsheetId(spreadsheetIdOverride);
        String tab = resolveSheetTab();

        summary.setSpreadsheetId(spreadsheetId);
        summary.setSheetTab(tab);

        if (spreadsheetId == null || spreadsheetId.isBlank()) {
            summary.setError("Spreadsheet ID manquant (paramètre 'spreadsheetId' ou setting 'google_orders_sheet_id' / 'google_sheet_id').");
            return summary;
        }

        List<Order> orders = orderRepository.findAllNotDeletedForExport();

        // Construire les lignes (header + data)
        List<List<Object>> values = new ArrayList<>();
        values.add(List.of(
            "id",
            "orderNumber",
            "status",
            "createdAt",
            "updatedAt",
            "customerName",
            "customerPhone",
            "customerAddress",
            "fulfillmentType",
            "deliveryType",
            "scheduledTime",
            "deliveryCost",
            "distanceKm",
            "subtotal",
            "tax",
            "total",
            "items"
        ));

        for (Order o : orders) {
            values.add(List.of(
                o.getId() != null ? o.getId().toString() : "",
                safe(o.getOrderNumber()),
                o.getStatus() != null ? o.getStatus().name() : "",
                o.getCreatedAt() != null ? o.getCreatedAt().format(DT) : "",
                o.getUpdatedAt() != null ? o.getUpdatedAt().format(DT) : "",
                safe(o.getCustomerName()),
                safe(o.getCustomerPhone()),
                safe(o.getCustomerAddress()),
                o.getFulfillmentType() != null ? o.getFulfillmentType().name() : "DELIVERY",
                safe(o.getDeliveryType()),
                safe(o.getScheduledTime()),
                o.getDeliveryCost() != null ? o.getDeliveryCost().toString() : "",
                o.getDistance() != null ? o.getDistance().toString() : "",
                o.getSubtotal() != null ? o.getSubtotal().toString() : "",
                o.getTax() != null ? o.getTax().toString() : "",
                o.getTotal() != null ? o.getTotal().toString() : "",
                formatItems(o.getItems())
            ));
        }

        String clearRange = tab + "!A:Z";
        String writeRange = tab + "!A1";

        try {
            log.info("🧾 Export commandes -> Google Sheets. spreadsheetId={} tab={} orders={}", spreadsheetId, tab, orders.size());
            googleSheetsService.clearValues(spreadsheetId, clearRange);
            googleSheetsService.updateValues(spreadsheetId, writeRange, values);

            summary.setOrdersExported(orders.size());
            summary.setRowsWritten(values.size());

            String lastSync = LocalDateTime.now().toString();
            summary.setLastSyncIso(lastSync);
            saveSetting("google_orders_sheet_last_sync", lastSync, "Dernière synchro commandes -> Google Sheets (ISO)");
        } catch (java.io.IOException | GeneralSecurityException e) {
            log.error("Erreur export commandes Google Sheets", e);
            summary.setError("Erreur Google Sheets: " + e.getMessage());
        }

        return summary;
    }

    private String resolveSpreadsheetId(String override) {
        if (override != null && !override.isBlank()) return override.trim();

        // Priorité: google_orders_sheet_id, sinon reuse google_sheet_id (utilisé produits)
        return appSettingRepository.findByKey("google_orders_sheet_id")
            .map(AppSetting::getValue)
            .filter(v -> v != null && !v.isBlank())
            .orElseGet(() -> appSettingRepository.findByKey("google_sheet_id")
                .map(AppSetting::getValue)
                .filter(v -> v != null && !v.isBlank())
                .orElse(null));
    }

    private String resolveSheetTab() {
        return appSettingRepository.findByKey("google_orders_sheet_tab")
            .map(AppSetting::getValue)
            .filter(v -> v != null && !v.isBlank())
            .orElse("Commandes");
    }

    private void saveSetting(String key, String value, String description) {
        AppSetting s = appSettingRepository.findByKey(key)
            .orElse(AppSetting.builder().key(key).description(description).build());
        s.setValue(value);
        appSettingRepository.save(s);
    }

    private String safe(String v) {
        return v == null ? "" : v.trim();
    }

    private String formatItems(List<OrderItem> items) {
        if (items == null || items.isEmpty()) return "";
        StringBuilder sb = new StringBuilder();
        for (OrderItem it : items) {
            try {
                String name = it.getProduct() != null ? it.getProduct().getName() : "Produit";
                sb.append(it.getQuantity()).append("x ").append(name);
                if (it.getTotalPrice() != null) sb.append(" (").append(it.getTotalPrice()).append(")");
                sb.append("; ");
            } catch (Exception ignored) {
                // best-effort export
            }
        }
        return sb.toString().trim();
    }
}

