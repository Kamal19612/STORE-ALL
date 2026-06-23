package com.storeall.api.tenant;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.storeall.api.entity.AppSetting;
import com.storeall.api.entity.Category;
import com.storeall.api.entity.Order;
import com.storeall.api.entity.Product;
import com.storeall.api.entity.Slider;
import com.storeall.api.entity.Store;
import com.storeall.api.entity.User;
import com.storeall.api.repository.AppSettingRepository;
import com.storeall.api.repository.CategoryRepository;
import com.storeall.api.repository.OrderRepository;
import com.storeall.api.repository.ProductRepository;
import com.storeall.api.repository.SliderRepository;
import com.storeall.api.repository.StoreRepository;
import com.storeall.api.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * One-shot migrator (best-effort) to attach existing rows to default store "sucre".
 * This avoids breaking the current production DB when adding store_id columns.
 *
 * It is idempotent: only rows with store_id NULL are updated.
 */
@Component
@org.springframework.core.annotation.Order(2)
@RequiredArgsConstructor
@Slf4j
public class LegacyStoreDataMigrator implements ApplicationRunner {

    /** Toujours "sucre" : rattache les anciennes lignes sans store au magasin historique. */
    private static final String LEGACY_ATTACH_STORE_CODE = "sucre";

    private final StoreRepository storeRepository;
    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final SliderRepository sliderRepository;
    private final AppSettingRepository appSettingRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        Store sucre = storeRepository.findByCode(LEGACY_ATTACH_STORE_CODE).orElse(null);
        if (sucre == null) {
            log.warn("[TENANT] Store '{}' introuvable, skip legacy migration", LEGACY_ATTACH_STORE_CODE);
            return;
        }

        long deduped = dedupeStoreScopedSettings(sucre);
        long p = attachProducts(sucre);
        long o = attachOrders(sucre);
        long c = attachCategories(sucre);
        long s = attachSliders(sucre);
        long a = attachAppSettings(sucre);
        long u = attachUsers(sucre);

        if (deduped + p + o + c + s + a + u > 0) {
            log.info("[TENANT] Legacy migration attached to store='{}': deduped={}, products={}, orders={}, categories={}, sliders={}, settings={}, users={}",
                sucre.getCode(), deduped, p, o, c, s, a, u);
        }
    }

    /** Supprime les lignes en double (même store_id + key), en conservant la plus ancienne (id minimal). */
    private long dedupeStoreScopedSettings(Store store) {
        Long storeId = store.getId();
        Map<String, List<AppSetting>> byKey = new LinkedHashMap<>();
        for (AppSetting s : appSettingRepository.findAll()) {
            if (s.getStore() == null || !storeId.equals(s.getStore().getId())) {
                continue;
            }
            byKey.computeIfAbsent(s.getKey(), k -> new ArrayList<>()).add(s);
        }
        long removed = 0;
        for (List<AppSetting> group : byKey.values()) {
            if (group.size() <= 1) {
                continue;
            }
            group.sort(Comparator.comparing(AppSetting::getId));
            for (int i = 1; i < group.size(); i++) {
                appSettingRepository.delete(group.get(i));
                removed++;
            }
        }
        if (removed > 0) {
            log.info("[TENANT] {} doublon(s) app_settings supprimé(s) pour store='{}'", removed, store.getCode());
        }
        return removed;
    }

    private long attachProducts(Store store) {
        long count = 0;
        for (Product x : productRepository.findAll()) {
            if (x.getStore() == null) {
                x.setStore(store);
                count++;
            }
        }
        return count;
    }

    private long attachOrders(Store store) {
        long count = 0;
        for (Order x : orderRepository.findAll()) {
            if (x.getStore() == null) {
                x.setStore(store);
                count++;
            }
        }
        return count;
    }

    private long attachCategories(Store store) {
        long count = 0;
        for (Category x : categoryRepository.findAll()) {
            if (x.getStore() == null) {
                x.setStore(store);
                count++;
            }
        }
        return count;
    }

    private long attachSliders(Store store) {
        long count = 0;
        for (Slider x : sliderRepository.findAll()) {
            if (x.getStore() == null) {
                x.setStore(store);
                count++;
            }
        }
        return count;
    }

    /** Clés réservées au niveau plateforme (store_id NULL) — ne pas rattacher à une boutique. */
    private static final java.util.Set<String> PLATFORM_GLOBAL_SETTING_KEYS = java.util.Set.of(
            "telegram_bot_token",
            "telegram_chat_id",
            "public_base_url",
            "telegram_webhook_base_url");

    private long attachAppSettings(Store store) {
        long attached = 0;
        long removedOrphans = 0;
        for (AppSetting x : appSettingRepository.findAll()) {
            if (x.getStore() != null) {
                continue;
            }
            String key = x.getKey();
            if (key != null && PLATFORM_GLOBAL_SETTING_KEYS.contains(key)) {
                continue;
            }
            if (appSettingRepository.findFirstByKeyAndStoreIdOrderByIdAsc(key, store.getId()).isPresent()) {
                appSettingRepository.delete(x);
                removedOrphans++;
                log.debug(
                    "[TENANT] Orphan global app_setting key={} removed (store '{}' already has this key)",
                    key,
                    store.getCode());
                continue;
            }
            x.setStore(store);
            attached++;
        }
        if (removedOrphans > 0) {
            log.info(
                "[TENANT] {} réglage(s) global(aux) en doublon supprimé(s) pour store='{}'",
                removedOrphans,
                store.getCode());
        }
        return attached;
    }

    private long attachUsers(Store store) {
        long count = 0;
        for (User x : userRepository.findAll()) {
            if (x.getStore() == null) {
                x.setStore(store);
                count++;
            }
        }
        return count;
    }
}

