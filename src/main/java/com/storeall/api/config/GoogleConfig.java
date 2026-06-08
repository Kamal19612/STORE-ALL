package com.storeall.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import lombok.Data;

@Configuration
@ConfigurationProperties(prefix = "google.sheets")
@Data
public class GoogleConfig {

    private String applicationName;
    private String credentialsFilePath;
    private String spreadsheetId;
    private long syncRate;

    /**
     * Import produits depuis Google Sheets : {@code auto} (CSV public puis API),
     * {@code csv} uniquement, {@code api} uniquement (compte de service).
     */
    private String productImportMode = "auto";

    /** Onglet à exporter en CSV (voir {@code gid} dans l’URL du Sheet). Optionnel : 1er onglet si absent. */
    private Long csvExportSheetGid;

    private int httpConnectTimeoutMs = 15000;
    private int httpReadTimeoutMs = 120000;
}
