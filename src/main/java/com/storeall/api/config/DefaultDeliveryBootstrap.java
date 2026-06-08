package com.storeall.api.config;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.storeall.api.entity.AppSetting;
import com.storeall.api.entity.Store;
import com.storeall.api.repository.AppSettingRepository;
import com.storeall.api.repository.StoreRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Insère les réglages de frais de livraison par défaut pour une boutique (défaut {@code spirit}) si absents.
 */
@Component
@Order(11)
@RequiredArgsConstructor
@Slf4j
public class DefaultDeliveryBootstrap implements ApplicationRunner {

    private final AppProperties appProperties;
    private final StoreRepository storeRepository;
    private final AppSettingRepository appSettingRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        AppProperties.Bootstrap boot = appProperties.getBootstrap();
        if (!boot.isSeedDeliverySettingsOnStart()) {
            return;
        }

        String storeCode = boot.getDeliverySettingsStoreCode() != null && !boot.getDeliverySettingsStoreCode().isBlank()
                ? boot.getDeliverySettingsStoreCode().trim().toLowerCase()
                : "spirit";
        Store store = storeRepository.findByCode(storeCode).orElse(null);
        if (store == null) {
            log.warn("[bootstrap-delivery] Boutique « {} » introuvable — réglages livraison non créés.", storeCode);
            return;
        }

        try {
            seedDeliverySettings(store);
        } catch (DataAccessException e) {
            log.error("[bootstrap-delivery] Échec SQL (le serveur continue) : {}", e.getMessage(), e);
        }
    }

    private void seedDeliverySettings(Store store) {
        Map<String, String> defaults = new LinkedHashMap<>();
        defaults.put("dist_tier_1_limit", "5");
        defaults.put("dist_tier_1_price", "1000");
        defaults.put("dist_tier_2_limit", "10");
        defaults.put("dist_tier_2_price", "2000");
        defaults.put("dist_tier_3_price", "3500");
        defaults.put("min_order_free_delivery", "50000");
        defaults.put("express_surcharge", "1000");
        defaults.put("scheduled_surcharge", "500");

        int created = 0;
        for (Map.Entry<String, String> e : defaults.entrySet()) {
            if (appSettingRepository.findFirstByKeyAndStoreIdOrderByIdAsc(e.getKey(), store.getId()).isPresent()) {
                continue;
            }
            appSettingRepository.save(AppSetting.builder()
                    .key(e.getKey())
                    .value(e.getValue())
                    .store(store)
                    .description("Frais livraison (bootstrap)")
                    .build());
            created++;
        }
        if (created > 0) {
            log.info("[bootstrap-delivery] {} réglage(s) livraison créés pour boutique code={}", created, store.getCode());
        }
    }
}
