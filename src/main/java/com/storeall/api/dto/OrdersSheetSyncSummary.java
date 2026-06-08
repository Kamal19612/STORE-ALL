package com.storeall.api.dto;

import lombok.Data;

@Data
public class OrdersSheetSyncSummary {
    private String spreadsheetId;
    private String sheetTab;
    private int ordersExported;
    private int rowsWritten;
    private String lastSyncIso;
    private String error;
}

