package com.storeall.api.tenant;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Tenant / multi-store runtime controls.
 * Keep defaults backward-compatible; turn on strictness in production via config.
 */
@Component
@ConfigurationProperties(prefix = "tenant")
public class TenantProperties {

    /**
     * If true, requests must resolve a store explicitly (X-Store-Code or domain mapping).
     * When false, resolver can fall back to {@link #defaultStoreCode}.
     */
    private boolean requireExplicitStore = false;

    /**
     * Code boutique utilisé quand aucun Host / header ne résout le tenant (ex. dev sur localhost).
     */
    private String defaultStoreCode = "sucre";

    /**
     * Premier segment du Host (ex. {@code sucrestore} dans {@code sucrestore.socialracine.com}) → {@code stores.code}
     * quand ils diffèrent (ex. sous-domaine marketing ≠ code boutique DB {@code sucre}).
     */
    private Map<String, String> hostLabelToStoreCode = new LinkedHashMap<>();

    public boolean isRequireExplicitStore() {
        return requireExplicitStore;
    }

    public void setRequireExplicitStore(boolean requireExplicitStore) {
        this.requireExplicitStore = requireExplicitStore;
    }

    public String getDefaultStoreCode() {
        return defaultStoreCode;
    }

    public void setDefaultStoreCode(String defaultStoreCode) {
        this.defaultStoreCode =
            defaultStoreCode == null || defaultStoreCode.isBlank() ? "sucre" : defaultStoreCode.trim().toLowerCase();
    }

    public Map<String, String> getHostLabelToStoreCode() {
        return hostLabelToStoreCode;
    }

    public void setHostLabelToStoreCode(Map<String, String> hostLabelToStoreCode) {
        this.hostLabelToStoreCode = hostLabelToStoreCode != null ? hostLabelToStoreCode : new LinkedHashMap<>();
    }
}

