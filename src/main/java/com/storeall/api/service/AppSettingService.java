package com.storeall.api.service;

import com.storeall.api.entity.AppSetting;
import com.storeall.api.entity.Store;
import com.storeall.api.repository.AppSettingRepository;
import com.storeall.api.repository.StoreRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import com.storeall.api.tenant.StoreContext;

@Service
@RequiredArgsConstructor
@Slf4j
public class AppSettingService {

    private final AppSettingRepository appSettingRepository;
    private final StoreRepository storeRepository;

    public List<AppSetting> getAllSettings() {
        Long storeId = StoreContext.getStoreIdOrNull();
        // For now: return only settings of current store.
        // (Delivery/global admin module can query other stores via a dedicated endpoint later.)
        return appSettingRepository.findAll().stream()
            .filter(s -> s.getStore() != null && storeId != null && storeId.equals(s.getStore().getId()))
            .filter(s -> isSuperAdmin() || !isYengaPayKey(s.getKey()))
            .toList();
    }

    private static boolean isYengaPayKey(String key) {
        return key != null && key.startsWith("yengapay_");
    }

    private static boolean isSuperAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getAuthorities() == null) {
            return false;
        }
        return auth.getAuthorities().stream()
            .anyMatch(a -> "ROLE_SUPER_ADMIN".equals(a.getAuthority()));
    }

    public Optional<String> getSettingValue(String key) {
        return getSettingValueForStore(StoreContext.getStoreIdOrNull(), key);
    }

    /**
     * Paramètre pour une boutique donnée : réglage boutique → réglage global (store NULL) → vide.
     */
    @Transactional(readOnly = true)
    public Optional<String> getSettingValueForStore(Long storeId, String key) {
        if (storeId != null) {
            Optional<String> scoped = appSettingRepository.findFirstByKeyAndStoreIdOrderByIdAsc(key, storeId)
                .map(AppSetting::getValue)
                .filter(v -> v != null && !v.isBlank());
            if (scoped.isPresent()) {
                return scoped;
            }
        }
        return appSettingRepository.findFirstByKeyAndStoreIsNullOrderByIdAsc(key)
            .map(AppSetting::getValue)
            .filter(v -> v != null && !v.isBlank());
    }

    @Transactional(readOnly = true)
    public Map<String, String> getTelegramSettingsForStore(Long storeId) {
        Map<String, String> m = new HashMap<>();
        m.put("telegram_bot_token", getSettingValueForStore(storeId, "telegram_bot_token").orElse(""));
        m.put("telegram_chat_id", resolveTelegramChatIdForStore(storeId).orElse(""));
        return m;
    }

    /**
     * Réglage boutique uniquement (sans cascade vers le global).
     */
    @Transactional(readOnly = true)
    public Optional<String> getStoreOnlySettingValue(Long storeId, String key) {
        if (storeId == null || key == null || key.isBlank()) {
            return Optional.empty();
        }
        return appSettingRepository.findFirstByKeyAndStoreIdOrderByIdAsc(key, storeId)
            .map(AppSetting::getValue)
            .filter(v -> v != null && !v.isBlank())
            .map(String::trim);
    }

    /**
     * Chat ID global plateforme (app_settings sans boutique).
     */
    @Transactional(readOnly = true)
    public Optional<String> getGlobalTelegramChatId() {
        return appSettingRepository.findFirstByKeyAndStoreIsNullOrderByIdAsc("telegram_chat_id")
            .map(AppSetting::getValue)
            .filter(v -> v != null && !v.isBlank())
            .map(String::trim);
    }

    /**
     * Token bot : surcharge boutique → global plateforme.
     */
    @Transactional(readOnly = true)
    public Optional<String> resolveTelegramBotTokenForStore(Long storeId) {
        return getSettingValueForStore(storeId, "telegram_bot_token");
    }

    public enum TelegramChatIdSource {
        /** colonne stores.telegram_id (fiche super-admin boutique) */
        STORE_ENTITY,
        /** app_settings.telegram_chat_id scopé boutique (surcharge manager) */
        STORE_SETTING,
        /** app_settings.telegram_chat_id global (défaut) */
        GLOBAL_DEFAULT,
        NONE
    }

    public record ResolvedTelegramChatId(String chatId, TelegramChatIdSource source) {}

    /**
     * Chat ID pour envoi : priorité ID fiche boutique, sinon surcharge manager, sinon défaut plateforme.
     * Ordre : {@code stores.telegram_id} → app_settings boutique → global → vide.
     */
    @Transactional(readOnly = true)
    public Optional<String> resolveTelegramChatIdForStore(Long storeId) {
        return resolveTelegramChatIdForStoreDetailed(storeId).map(ResolvedTelegramChatId::chatId);
    }

    @Transactional(readOnly = true)
    public Optional<ResolvedTelegramChatId> resolveTelegramChatIdForStoreDetailed(Long storeId) {
        if (storeId != null) {
            Optional<String> fromEntity = storeRepository.findById(storeId)
                .map(Store::getTelegramId)
                .filter(v -> v != null && !v.isBlank())
                .map(String::trim);
            if (fromEntity.isPresent()) {
                return Optional.of(new ResolvedTelegramChatId(fromEntity.get(), TelegramChatIdSource.STORE_ENTITY));
            }
            Optional<String> storeSetting = getStoreOnlySettingValue(storeId, "telegram_chat_id");
            if (storeSetting.isPresent()) {
                String global = getGlobalTelegramChatId().orElse("");
                String chosen = storeSetting.get();
                // Ignorer une copie du chat défaut global dans les paramètres manager (priorité fiche boutique).
                if (global.isEmpty() || !global.equals(chosen)) {
                    return Optional.of(new ResolvedTelegramChatId(chosen, TelegramChatIdSource.STORE_SETTING));
                }
                log.debug(
                    "[telegram] store_id={} : app_settings.telegram_chat_id = défaut global, ignoré",
                    storeId);
            }
        }
        return getGlobalTelegramChatId()
            .map(id -> new ResolvedTelegramChatId(id, TelegramChatIdSource.GLOBAL_DEFAULT));
    }

    /**
     * Modèle « un bot, plusieurs chats » : retrouve la boutique liée au chat entrant.
     * Même priorité que l'envoi (surcharge app_settings boutique → stores.telegram_id).
     */
    @Transactional(readOnly = true)
    public Optional<Store> findStoreByTelegramChatId(String chatId) {
        if (chatId == null || chatId.isBlank()) {
            return Optional.empty();
        }
        String normalized = chatId.trim();
        var matches = appSettingRepository.findStoreSettingsByTelegramChatId(normalized);
        if (!matches.isEmpty()) {
            if (matches.size() > 1) {
                log.warn(
                    "[telegram] Plusieurs boutiques ont le même telegram_chat_id={} — utilisation de store_id={}",
                    normalized,
                    matches.get(0).getStore().getId());
            }
            return Optional.of(matches.get(0).getStore());
        }
        return storeRepository.findByTelegramId(normalized);
    }

    @Transactional
    public void updateSettings(Map<String, String> newSettings) {
        Long storeId = StoreContext.getStoreIdOrNull();
        for (Map.Entry<String, String> entry : newSettings.entrySet()) {
            String key = entry.getKey();
            String value = entry.getValue();

            if (isYengaPayKey(key) && !isSuperAdmin()) {
                throw new org.springframework.security.access.AccessDeniedException(
                    "Seul le super administrateur peut modifier les paramètres YengaPay");
            }

            AppSetting setting = appSettingRepository.findFirstByKeyAndStoreIdOrderByIdAsc(key, storeId)
                .orElse(AppSetting.builder()
                    .key(key)
                    .store(com.storeall.api.entity.Store.builder().id(storeId).build())
                    .build());

            // Normalisation légère pour éviter des valeurs cassées côté liens WhatsApp.
            if ("whatsapp_number".equals(key)) {
                setting.setValue(normalizeWhatsAppNumber(value));
            } else if ("customer_whatsapp_dial_code".equals(key)) {
                setting.setValue(normalizeDialCode(value));
            } else if ("telegram_bot_token".equals(key)) {
                setting.setValue(value == null ? "" : value.trim());
            } else if ("telegram_chat_id".equals(key)) {
                setting.setValue(value == null ? "" : value.trim());
            } else if ("google_sheet_id".equals(key)) {
                setting.setValue(value == null ? "" : value.trim());
                warnIfGoogleSheetSharedAcrossStores(storeId, setting.getValue());
            } else {
                setting.setValue(value);
            }
            appSettingRepository.save(setting);
        }
    }

    /**
     * WhatsApp attend un numéro au format international en chiffres uniquement, sans "+".
     * Exemple BF: 22670123456. Si l'admin saisit un numéro local (8 chiffres), on préfixe 226.
     */
    private String normalizeWhatsAppNumber(String value) {
        if (value == null) {
            return null;
        }
        String digits = value.replaceAll("[^0-9]", "");
        if (digits.startsWith("00")) {
            digits = digits.substring(2);
        }
        if (digits.isBlank()) {
            return "";
        }
        if (!digits.startsWith("226") && digits.length() <= 8) {
            return "226" + digits;
        }
        return digits;
    }

    /**
     * Normalise un indicatif au format "+226" (ou vide).
     * Accepte "+226", "226", "00226", "+ 226" et nettoie les caractères.
     */
    private String normalizeDialCode(String value) {
        if (value == null) {
            return "";
        }
        String v = value.trim();
        if (v.isEmpty()) {
            return "";
        }
        // garder + et chiffres uniquement
        v = v.replaceAll("[^0-9+]", "");
        if (v.startsWith("00")) {
            v = "+" + v.substring(2);
        }
        if (!v.startsWith("+")) {
            v = "+" + v.replaceAll("[^0-9]", "");
        }
        return v.equals("+") ? "" : v;
    }

    private void warnIfGoogleSheetSharedAcrossStores(Long storeId, String rawSheetId) {
        if (storeId == null || rawSheetId == null || rawSheetId.isBlank()) {
            return;
        }
        String normalized = GoogleSheetsService.normalizeSpreadsheetId(rawSheetId.trim());
        if (normalized == null || normalized.isEmpty()) {
            return;
        }
        for (Store other : storeRepository.findAll()) {
            if (other.getId() == null || other.getId().equals(storeId)) {
                continue;
            }
            appSettingRepository.findFirstByKeyAndStoreIdOrderByIdAsc("google_sheet_id", other.getId())
                    .map(AppSetting::getValue)
                    .filter(v -> !v.isBlank())
                    .map(v -> GoogleSheetsService.normalizeSpreadsheetId(v.trim()))
                    .filter(normalized::equals)
                    .ifPresent(ignored -> log.warn(
                            "[settings] google_sheet_id partagé entre boutiques id={} et code={} — "
                                    + "chaque boutique doit avoir son propre classeur produits.",
                            storeId, other.getCode()));
        }
    }

    /**
     * Position magasin utilisable pour le calcul des frais de livraison :
     * coordonnées "lat,lng", lien Google Maps, lien court ou Plus Code — pas un Google Sheet.
     */
    static boolean isResolvableStoreLocation(String loc) {
        if (loc == null || loc.isBlank()) {
            return false;
        }
        String t = loc.trim().toLowerCase();
        if (t.contains("docs.google.com") || t.contains("spreadsheets") || t.contains("/sheet")) {
            return false;
        }
        String[] parts = t.split(",");
        if (parts.length == 2) {
            try {
                double lat = Double.parseDouble(parts[0].trim());
                double lng = Double.parseDouble(parts[1].trim());
                return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
            } catch (NumberFormatException ignored) {
                // pas du lat,lng
            }
        }
        return t.contains("google.com/maps")
                || t.contains("maps.google")
                || t.contains("maps.app.goo.gl")
                || t.contains("goo.gl/");
    }

    @Transactional(readOnly = true)
    public Map<String, String> getGlobalTelegramPlatformSettings() {
        Map<String, String> m = new HashMap<>();
        appSettingRepository.findFirstByKeyAndStoreIsNullOrderByIdAsc("telegram_bot_token")
                .map(AppSetting::getValue)
                .ifPresent(v -> m.put("telegram_bot_token", v));
        appSettingRepository.findFirstByKeyAndStoreIsNullOrderByIdAsc("telegram_chat_id")
                .map(AppSetting::getValue)
                .ifPresent(v -> m.put("telegram_chat_id", v));
        return m;
    }

    /**
     * Supprime les {@code app_settings.telegram_chat_id} boutique lorsque {@code stores.telegram_id} est renseigné
     * (évite que l'ancien paramètre manager / copie du défaut global prenne le pas sur la fiche boutique).
     */
    @Transactional
    public int cleanupStoreTelegramChatShadows() {
        int removed = 0;
        for (Store store : storeRepository.findAll()) {
            if (store.getId() == null || store.getTelegramId() == null || store.getTelegramId().isBlank()) {
                continue;
            }
            var row = appSettingRepository.findFirstByKeyAndStoreIdOrderByIdAsc("telegram_chat_id", store.getId());
            if (row.isPresent()) {
                appSettingRepository.delete(row.get());
                removed++;
                log.info(
                    "[telegram] Nettoyage app_settings.telegram_chat_id store_id={} code={} — fiche boutique active",
                    store.getId(),
                    store.getCode());
            }
        }
        return removed;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void cleanupTelegramChatShadowsOnStartup() {
        try {
            int n = cleanupStoreTelegramChatShadows();
            if (n > 0) {
                log.info("[telegram] Démarrage : {} paramètre(s) chat boutique obsolète(s) retiré(s)", n);
            }
        } catch (Exception e) {
            log.warn("[telegram] Nettoyage chat boutique au démarrage ignoré : {}", e.toString());
        }
    }

    @Transactional
    public void upsertGlobalTelegramPlatformSettings(Map<String, String> body) {
        if (body == null) {
            return;
        }
        for (Map.Entry<String, String> e : body.entrySet()) {
            String key = e.getKey();
            if (!"telegram_bot_token".equals(key) && !"telegram_chat_id".equals(key)) {
                continue;
            }
            String value = e.getValue() == null ? "" : e.getValue().trim();
            AppSetting setting = appSettingRepository.findFirstByKeyAndStoreIsNullOrderByIdAsc(key)
                    .orElse(AppSetting.builder().key(key).build());
            setting.setValue(value);
            appSettingRepository.save(setting);
        }
    }

    public Map<String, String> getPublicSettings() {
        Map<String, String> publicSettings = new HashMap<>();
        // Définir les clés publiques autorisées
        String[] publicKeys = {
            "contact_phone", "contact_email", "contact_address",
            "social_facebook", "social_instagram", "footer_copyright",
            "whatsapp_number", "store_name", "store_location",
            "customer_whatsapp_dial_code",
            "dist_tier_1_limit", "dist_tier_1_price",
            "dist_tier_2_limit", "dist_tier_2_price",
            "dist_tier_3_price", "min_order_free_delivery",
            "express_surcharge", "scheduled_surcharge",
            "yengapay_enabled"
        };

        for (String key : publicKeys) {
            getSettingValue(key).ifPresent(value -> publicSettings.put(key, value));
        }
        // Ignorer les valeurs erronées (ex. URL Google Sheets) pour ne pas bloquer le checkout.
        String loc = publicSettings.get("store_location");
        if (!isResolvableStoreLocation(loc)) {
            publicSettings.remove("store_location");
        }
        // Checkout / frais de livraison : le lien Google Maps est souvent saisi sur la fiche boutique
        // (stores.maps_url) et non dans app_settings.store_location — on aligne les deux.
        Long storeId = StoreContext.getStoreIdOrNull();
        if (storeId != null && !publicSettings.containsKey("store_location")) {
            storeRepository.findById(storeId)
                    .map(Store::getMapsUrl)
                    .filter(AppSettingService::isResolvableStoreLocation)
                    .ifPresent(url -> publicSettings.put("store_location", url.trim()));
        }
        return publicSettings;
    }
}
