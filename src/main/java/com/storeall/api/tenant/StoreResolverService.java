package com.storeall.api.tenant;

import java.util.Locale;
import java.util.Map;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.storeall.api.entity.Store;
import com.storeall.api.exception.StoreInactiveException;
import com.storeall.api.repository.StoreRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class StoreResolverService {

    public static final String STORE_HEADER = "X-Store-Code";

    private final StoreRepository storeRepository;
    private final TenantProperties tenantProperties;

    private static void requireStoreActive(Store store) {
        if (store != null && !store.isActive()) {
            throw new StoreInactiveException("Cette boutique est désactivée.");
        }
    }

    /**
     * Best-effort resolution without any default fallback.
     * - Host/domain has priority
     * - Then X-Store-Code
     * - Returns empty if both are missing or if domain is unmapped.
     *
     * NOTE: Unknown explicit store codes still throw (caller can map to 400).
     */
    public Optional<Store> resolveByDomainOrCode(String storeCodeHeader, String hostHeader) {
        String host = normalizeHost(hostHeader);
        if (host != null) {
            Optional<Store> byDomain = storeRepository.findByDomain(host);
            if (byDomain.isPresent()) {
                requireStoreActive(byDomain.get());
                return byDomain;
            }
        }

        String code = normalize(storeCodeHeader);
        if (code != null) {
            Store s = storeRepository.findByCode(code)
                    .orElseThrow(() -> new IllegalArgumentException("Unknown store code: " + code));
            requireStoreActive(s);
            return Optional.of(s);
        }

        return Optional.empty();
    }

    public Store resolveByCodeOrDomainOrDefault(String storeCodeHeader, String hostHeader) {
        // 1) Domain mapping (Host / X-Forwarded-Host) has priority in multi-boutique by domain.
        // This prevents ambiguity when clients always send a default X-Store-Code.
        String host = normalizeHost(hostHeader);
        if (host != null) {
            Optional<Store> byDomain = storeRepository.findByDomain(host);
            if (byDomain.isPresent()) {
                requireStoreActive(byDomain.get());
                return byDomain.get();
            }
        }

        // 2) First hostname label as store code (e.g. sucrestore.example.com → code "sucrestore"),
        //    aligned with storefront env / hostname conventions before falling back to default.
        Optional<Store> byHostLabel = findByFirstHostLabelAsStoreCode(host);
        if (byHostLabel.isPresent()) {
            requireStoreActive(byHostLabel.get());
            return byHostLabel.get();
        }

        Optional<Store> byHostLabelAlias = findByHostLabelAliasMappedStore(host);
        if (byHostLabelAlias.isPresent()) {
            requireStoreActive(byHostLabelAlias.get());
            return byHostLabelAlias.get();
        }

        // 3) Header X-Store-Code — code inconnu : ignorer avec warning (localStorage obsolète / typo)
        //    plutôt que 400 sur les routes vitrine (/api/products/...).
        String code = normalize(storeCodeHeader);
        if (code != null) {
            Optional<Store> byHeader = storeRepository.findByCode(code);
            if (byHeader.isPresent()) {
                requireStoreActive(byHeader.get());
                return byHeader.get();
            }
            log.warn("[tenant] Ignored unknown {} '{}' (fall back to strict/default)", STORE_HEADER, code);
        }

        // 4) Strict mode: reject if store cannot be resolved
        if (tenantProperties.isRequireExplicitStore()) {
            throw new IllegalArgumentException("Missing store identifier (X-Store-Code or domain mapping)");
        }

        // 5) Default store (backward compatibility / dev localhost)
        String fallback = tenantProperties.getDefaultStoreCode();
        Store def = storeRepository.findByCode(fallback)
            .orElseThrow(() -> new IllegalStateException("Default store not found: " + fallback));
        requireStoreActive(def);
        return def;
    }

    /**
     * When {@code stores.domain} has no row for this host, try the first hostname label as {@code stores.code}
     * (e.g. {@code spirit.example.com} → code {@code spirit}).
     */
    private Optional<String> firstHostLabel(String normalizedHost) {
        if (normalizedHost == null || !normalizedHost.contains(".")) {
            return Optional.empty();
        }
        int dot = normalizedHost.indexOf('.');
        String first = normalizedHost.substring(0, dot).toLowerCase(Locale.ROOT);
        if (first.isBlank() || first.length() < 2) {
            return Optional.empty();
        }
        if ("www".equals(first) || "localhost".equals(first)) {
            return Optional.empty();
        }
        return Optional.of(first);
    }

    private Optional<Store> findByFirstHostLabelAsStoreCode(String normalizedHost) {
        Optional<String> firstOpt = firstHostLabel(normalizedHost);
        return firstOpt.flatMap(storeRepository::findByCode);
    }

    /** Ex. sous-domaine {@code sucrestore} → configuré comme alias de {@code sucre}. */
    private Optional<Store> findByHostLabelAliasMappedStore(String normalizedHost) {
        Optional<String> label = firstHostLabel(normalizedHost);
        if (label.isEmpty()) {
            return Optional.empty();
        }
        Map<String, String> aliases = tenantProperties.getHostLabelToStoreCode();
        if (aliases == null || aliases.isEmpty()) {
            return Optional.empty();
        }
        String mapped = aliases.get(label.get());
        if (mapped == null || mapped.isBlank()) {
            return Optional.empty();
        }
        String normalizedCode = normalize(mapped);
        return normalizedCode != null ? storeRepository.findByCode(normalizedCode) : Optional.empty();
    }

    private String normalize(String v) {
        if (v == null) return null;
        String t = v.trim().toLowerCase(Locale.ROOT);
        return t.isBlank() ? null : t;
    }

    private String normalizeHost(String host) {
        if (host == null) return null;
        // Host can include port and/or be a forwarded list: "a.example.com, b.example.com"
        String h = host.trim();
        int comma = h.indexOf(',');
        if (comma > 0) {
            h = h.substring(0, comma);
        }
        h = h.toLowerCase(Locale.ROOT);
        if (h.isBlank()) return null;
        int idx = h.indexOf(':');
        if (idx > 0) h = h.substring(0, idx);
        return h.isBlank() ? null : h;
    }
}

