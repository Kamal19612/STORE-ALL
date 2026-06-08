package com.storeall.api.service;

import java.io.ByteArrayOutputStream;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.opencsv.CSVReader;
import com.opencsv.CSVWriter;
import com.storeall.api.dto.ImportSummary;
import com.storeall.api.dto.StoreInfoResponse;
import com.storeall.api.dto.StoreUpdateRequest;
import com.storeall.api.dto.SuperStoreCreateRequest;
import com.storeall.api.entity.Order;
import com.storeall.api.entity.Store;
import com.storeall.api.repository.AppSettingRepository;
import com.storeall.api.repository.CategoryRepository;
import com.storeall.api.repository.CustomerPushSubscriptionRepository;
import com.storeall.api.repository.DeliveryAssignmentRepository;
import com.storeall.api.repository.DeliveryDeviceTokenRepository;
import com.storeall.api.repository.NotificationOutboxRepository;
import com.storeall.api.repository.OrderRepository;
import com.storeall.api.repository.ProductRepository;
import com.storeall.api.repository.PushSubscriptionRepository;
import com.storeall.api.repository.SliderRepository;
import com.storeall.api.repository.StoreRepository;
import com.storeall.api.repository.UserRepository;
import com.storeall.api.tenant.TenantProperties;
import com.storeall.api.vitrine.VitrineConfigJson;
import com.storeall.api.vitrine.VitrineTemplate;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class StoreService {

    private final StoreRepository storeRepository;
    private final OrderRepository orderRepository;
    private final NotificationOutboxRepository notificationOutboxRepository;
    private final CustomerPushSubscriptionRepository customerPushSubscriptionRepository;
    private final DeliveryAssignmentRepository deliveryAssignmentRepository;
    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final SliderRepository sliderRepository;
    private final AppSettingRepository appSettingRepository;
    private final PushSubscriptionRepository pushSubscriptionRepository;
    private final DeliveryDeviceTokenRepository deliveryDeviceTokenRepository;
    private final UserRepository userRepository;
    private final TenantProperties tenantProperties;

    /**
     * Export CSV (même colonnes que l’import) — UTF-8 avec BOM côté appelant si besoin.
     */
    @Transactional(readOnly = true)
    public byte[] exportStoresCsv() {
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        try (OutputStreamWriter osw = new OutputStreamWriter(bos, StandardCharsets.UTF_8);
             CSVWriter w = new CSVWriter(osw)) {
            w.writeNext(new String[]{
                "code", "name", "phone", "contact_email", "maps_url", "telegram_id", "domain", "active", "vitrine_template"
            });
            for (Store s : storeRepository.findAll()) {
                w.writeNext(new String[]{
                        s.getCode() == null ? "" : s.getCode(),
                        s.getName() == null ? "" : s.getName(),
                        s.getPhone() == null ? "" : s.getPhone(),
                        s.getContactEmail() == null ? "" : s.getContactEmail(),
                        s.getMapsUrl() == null ? "" : s.getMapsUrl(),
                        s.getTelegramId() == null ? "" : s.getTelegramId(),
                        s.getDomain() == null ? "" : s.getDomain(),
                        s.isActive() ? "1" : "0",
                        s.getVitrineTemplate() == null ? VitrineTemplate.DEFAULT : s.getVitrineTemplate()
                });
            }
        } catch (java.io.IOException e) {
            throw new RuntimeException("Export CSV boutiques: " + e.getMessage(), e);
        }
        return bos.toByteArray();
    }

    /**
     * Import boutiques depuis une grille Sheet (lignes {@code List<Object>}).
     * Détecte la ligne d’en-tête (colonnes {@code code} + {@code name}/{@code nom}).
     */
    @Transactional
    public ImportSummary importStoresFromSheetGrid(List<List<Object>> values) {
        ImportSummary summary = new ImportSummary();
        if (values == null || values.isEmpty()) {
            summary.addError(0, "Feuille vide");
            return summary;
        }
        int headerIdx = findStoreSheetHeaderRowIndex(values);
        if (headerIdx < 0) {
            summary.addError(0, "En-tête non reconnu : ajoutez les colonnes code et name (ou nom).");
            return summary;
        }
        String[] headerCells = objectRowToStringArray(values.get(headerIdx));
        Map<String, Integer> col = parseStoreHeader(headerCells);
        if (!col.containsKey("code")) {
            summary.addError(headerIdx + 1, "Colonne code manquante");
            return summary;
        }
        if (!col.containsKey("name")) {
            summary.addError(headerIdx + 1, "Colonne name/nom manquante");
            return summary;
        }
        int rowNum = headerIdx + 2;
        for (int i = headerIdx + 1; i < values.size(); i++) {
            String[] row = objectRowToStringArray(values.get(i));
            summary.incrementTotal();
            try {
                if (isBlankRow(row, col)) {
                    rowNum++;
                    continue;
                }
                String codeRaw = cell(row, col, "code");
                if (codeRaw.isEmpty()) {
                    summary.addError(rowNum, "code obligatoire");
                    rowNum++;
                    continue;
                }
                String code;
                try {
                    code = normalizeStoreCode(codeRaw);
                } catch (IllegalArgumentException e) {
                    summary.addError(rowNum, e.getMessage());
                    rowNum++;
                    continue;
                }
                String name = cell(row, col, "name", "nom");
                String phone = cell(row, col, "phone", "telephone", "tel");
                String email = cell(row, col, "contact_email", "email", "contactemail");
                String maps = cell(row, col, "maps_url", "maps", "lien_maps");
                String telegram = cell(row, col, "telegram_id", "telegram", "id_telegram");
                String domain = cell(row, col, "domain", "domaine");
                Boolean activeCell = parseStoreActiveCell(cell(row, col, "active", "enabled", "actif"));
                String vitrineRaw = cell(row, col, "vitrine_template", "vitrine", "template", "modele_vitrine");

                var existing = storeRepository.findByCode(code);
                if (existing.isPresent()) {
                    StoreUpdateRequest u = new StoreUpdateRequest();
                    if (!name.isEmpty()) {
                        u.setName(name);
                    }
                    u.setPhone(trimToNull(phone));
                    u.setContactEmail(trimToNull(email));
                    u.setMapsUrl(trimToNull(maps));
                    u.setTelegramId(trimToNull(telegram));
                    if (!domain.isEmpty()) {
                        u.setDomain(domain);
                    }
                    if (activeCell != null) {
                        u.setActive(activeCell);
                    }
                    if (!vitrineRaw.isEmpty()) {
                        u.setVitrineTemplate(vitrineRaw);
                    }
                    updateStore(existing.get().getId(), u, true);
                } else {
                    SuperStoreCreateRequest cr = new SuperStoreCreateRequest();
                    cr.setCode(code);
                    cr.setName(name.isEmpty() ? code : name);
                    cr.setPhone(trimToNull(phone));
                    cr.setContactEmail(trimToNull(email));
                    cr.setMapsUrl(trimToNull(maps));
                    cr.setTelegramId(trimToNull(telegram));
                    cr.setDomain(trimToNull(domain));
                    if (activeCell != null) {
                        cr.setActive(activeCell);
                    }
                    if (!vitrineRaw.isEmpty()) {
                        cr.setVitrineTemplate(vitrineRaw);
                    }
                    createStoreForSupervision(cr);
                }
                summary.incrementSuccess();
            } catch (Exception e) {
                log.warn("Ligne {} import boutique (Sheet): {}", rowNum, e.getMessage());
                summary.addError(rowNum, e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName());
            }
            rowNum++;
        }
        return summary;
    }

    private static boolean isBlankRow(String[] row, Map<String, Integer> col) {
        for (Integer idx : col.values()) {
            if (idx != null && idx < row.length && row[idx] != null && !row[idx].isBlank()) {
                return false;
            }
        }
        return true;
    }

    private static String[] objectRowToStringArray(List<Object> row) {
        if (row == null) {
            return new String[0];
        }
        String[] out = new String[row.size()];
        for (int i = 0; i < row.size(); i++) {
            Object o = row.get(i);
            out[i] = o == null ? "" : String.valueOf(o).trim();
        }
        return out;
    }

    private static int findStoreSheetHeaderRowIndex(List<List<Object>> values) {
        int max = Math.min(values.size(), 30);
        for (int i = 0; i < max; i++) {
            String[] h = objectRowToStringArray(values.get(i));
            if (h.length == 0) {
                continue;
            }
            Map<String, Integer> col = parseStoreHeader(h);
            if (col.containsKey("code") && col.containsKey("name")) {
                return i;
            }
        }
        return -1;
    }

    public StoreInfoResponse getStoreInfo(Long storeId) {
        Store s = storeRepository.findById(storeId)
            .orElseThrow(() -> new IllegalArgumentException("Boutique introuvable"));
        return StoreInfoResponse.fromEntity(s);
    }

    /**
     * Création d'une nouvelle boutique (super admin). {@code code} unique, utilisé comme {@code X-Store-Code}.
     */
    @Transactional
    public StoreInfoResponse createStoreForSupervision(SuperStoreCreateRequest req) {
        if (req == null) {
            throw new IllegalArgumentException("Requête vide");
        }
        String code = normalizeStoreCode(req.getCode());
        if (storeRepository.findByCode(code).isPresent()) {
            throw new IllegalArgumentException("Ce code boutique existe déjà : " + code);
        }
        String name = req.getName() == null ? "" : req.getName().trim();
        if (name.isEmpty()) {
            throw new IllegalArgumentException("Le nom de la boutique est obligatoire");
        }
        String domain = trimToNull(req.getDomain());
        if (domain != null && storeRepository.findByDomain(domain).isPresent()) {
            throw new IllegalArgumentException("Ce domaine est déjà utilisé : " + domain);
        }
        boolean active = req.getActive() == null || Boolean.TRUE.equals(req.getActive());
        String vitrineTemplate = VitrineTemplate.normalize(req.getVitrineTemplate());
        String vitrineConfigJson = VitrineConfigJson.serialize(req.getVitrineConfig());
        Store s = Store.builder()
                .code(code)
                .name(name)
                .domain(domain)
                .phone(trimToNull(req.getPhone()))
                .contactEmail(trimToNull(req.getContactEmail()))
                .mapsUrl(trimToNull(req.getMapsUrl()))
                .telegramId(trimToNull(req.getTelegramId()))
                .logoUrl(trimToNull(req.getLogoUrl()))
                .active(active)
                .vitrineTemplate(vitrineTemplate)
                .vitrineConfig(vitrineConfigJson)
                .build();
        Store saved = storeRepository.save(s);
        if (saved.getTelegramId() != null && !saved.getTelegramId().isBlank()) {
            clearStoreTelegramChatSettingShadow(saved.getId());
        }
        return StoreInfoResponse.fromEntity(saved);
    }

    private static String normalizeStoreCode(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("Le code boutique est obligatoire (ex. spirit, ma-boutique)");
        }
        String s = raw.trim().toLowerCase().replaceAll("\\s+", "-").replaceAll("[^a-z0-9_-]+", "");
        if (s.isEmpty() || !Character.isLetter(s.charAt(0))) {
            throw new IllegalArgumentException(
                    "Code boutique invalide : utiliser des lettres minuscules, chiffres ou tirets (commencer par une lettre).");
        }
        return s;
    }

    @Transactional
    public StoreInfoResponse updateStore(Long storeId, StoreUpdateRequest req) {
        return updateStore(storeId, req, false);
    }

    /**
     * @param allowActiveChange {@code true} pour les opérations super-admin (CSV, API /api/super/…).
     */
    @Transactional
    public StoreInfoResponse updateStore(Long storeId, StoreUpdateRequest req, boolean allowActiveChange) {
        if (req == null) {
            throw new IllegalArgumentException("Requête vide");
        }
        Store s = storeRepository.findById(storeId)
            .orElseThrow(() -> new IllegalArgumentException("Boutique introuvable"));
        if (req.getName() != null) {
            String n = req.getName().trim();
            if (!n.isEmpty()) {
                s.setName(n);
            }
        }
        if (req.getPhone() != null) {
            s.setPhone(trimToNull(req.getPhone()));
        }
        if (req.getContactEmail() != null) {
            s.setContactEmail(trimToNull(req.getContactEmail()));
        }
        if (req.getMapsUrl() != null) {
            s.setMapsUrl(trimToNull(req.getMapsUrl()));
        }
        if (req.getTelegramId() != null) {
            String telegramId = trimToNull(req.getTelegramId());
            s.setTelegramId(telegramId);
            if (telegramId != null) {
                clearStoreTelegramChatSettingShadow(s.getId());
            }
        }
        if (req.getDomain() != null) {
            String d = trimToNull(req.getDomain());
            if (d != null && storeRepository.findByDomain(d).filter(other -> !other.getId().equals(s.getId())).isPresent()) {
                throw new IllegalArgumentException("Ce domaine est déjà utilisé : " + d);
            }
            s.setDomain(d);
        }
        if (req.getLogoUrl() != null) {
            s.setLogoUrl(trimToNull(req.getLogoUrl()));
        }
        if (allowActiveChange && req.getActive() != null) {
            if (Boolean.FALSE.equals(req.getActive()) && isProtectedDefaultStore(s)) {
                throw new IllegalArgumentException("Impossible de désactiver la boutique par défaut.");
            }
            s.setActive(req.getActive());
        }
        if (allowActiveChange && req.getVitrineTemplate() != null) {
            s.setVitrineTemplate(VitrineTemplate.normalize(req.getVitrineTemplate()));
        }
        if (allowActiveChange && req.getVitrineConfig() != null) {
            s.setVitrineConfig(VitrineConfigJson.serialize(req.getVitrineConfig()));
        }
        return StoreInfoResponse.fromEntity(storeRepository.save(s));
    }

    private boolean isProtectedDefaultStore(Store s) {
        String def = tenantProperties.getDefaultStoreCode();
        return def != null && !def.isBlank() && def.trim().equalsIgnoreCase(s.getCode());
    }

    /**
     * Suppression définitive d’une boutique et des données liées (commandes, catalogue, managers, etc.).
     * La boutique dont le {@code code} correspond à {@link TenantProperties#getDefaultStoreCode()} est protégée.
     */
    @Transactional
    public void deleteStoreForSupervision(Long storeId) {
        Store store = storeRepository.findById(storeId)
            .orElseThrow(() -> new IllegalArgumentException("Boutique introuvable"));
        String def = tenantProperties.getDefaultStoreCode();
        if (def != null && !def.isBlank() && def.trim().equalsIgnoreCase(store.getCode())) {
            throw new IllegalArgumentException(
                    "Impossible de supprimer la boutique par défaut (tenant.default-store-code = " + def.trim() + ").");
        }
        List<Order> orders = orderRepository.findByStore_Id(storeId);
        if (!orders.isEmpty()) {
            List<Long> orderIds = orders.stream().map(Order::getId).toList();
            List<String> orderNumbers = orders.stream()
                .map(Order::getOrderNumber)
                .filter(Objects::nonNull)
                .filter(n -> !n.isBlank())
                .toList();
            notificationOutboxRepository.deleteByOrderIdIn(orderIds);
            if (!orderNumbers.isEmpty()) {
                customerPushSubscriptionRepository.deleteByOrderNumberIn(orderNumbers);
            }
            deliveryAssignmentRepository.deleteByOrder_IdIn(orderIds);
            orderRepository.deleteAll(orders);
        }
        productRepository.deleteByStore_Id(storeId);
        categoryRepository.deleteByStore_Id(storeId);
        sliderRepository.deleteByStore_Id(storeId);
        appSettingRepository.deleteByStore_Id(storeId);
        pushSubscriptionRepository.deleteByUser_Store_Id(storeId);
        deliveryDeviceTokenRepository.deleteByUser_Store_Id(storeId);
        userRepository.deleteByStore_Id(storeId);
        storeRepository.deleteById(storeId);
    }

    private static String trimToNull(String v) {
        if (v == null) {
            return null;
        }
        String t = v.trim();
        return t.isEmpty() ? null : t;
    }

    /**
     * Import / mise à jour de boutiques depuis un CSV (super admin).
     * En-tête attendu (synonymes acceptés) : {@code code}, {@code name}/{@code nom},
     * {@code phone}, {@code contact_email}/{@code email}, {@code maps_url}, {@code telegram_id}, {@code domain}.
     */
    @Transactional
    public ImportSummary importStoresFromCsv(MultipartFile file) {
        ImportSummary summary = new ImportSummary();
        try (Reader r = new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8);
             CSVReader reader = new CSVReader(r)) {
            List<String[]> all = reader.readAll();
            if (all.isEmpty()) {
                summary.addError(0, "Fichier vide");
                return summary;
            }
            Map<String, Integer> col = parseStoreHeader(all.get(0));
            int rowNum = 2;
            for (int i = 1; i < all.size(); i++) {
                String[] row = all.get(i);
                summary.incrementTotal();
                try {
                    String codeRaw = cell(row, col, "code");
                    if (codeRaw.isEmpty()) {
                        summary.addError(rowNum, "code obligatoire");
                        rowNum++;
                        continue;
                    }
                    String code;
                    try {
                        code = normalizeStoreCode(codeRaw);
                    } catch (IllegalArgumentException e) {
                        summary.addError(rowNum, e.getMessage());
                        rowNum++;
                        continue;
                    }
                    String name = cell(row, col, "name", "nom");
                    String phone = cell(row, col, "phone", "telephone", "tel");
                    String email = cell(row, col, "contact_email", "email", "contactemail");
                    String maps = cell(row, col, "maps_url", "maps", "lien_maps");
                    String telegram = cell(row, col, "telegram_id", "telegram", "id_telegram");
                    String domain = cell(row, col, "domain", "domaine");
                    Boolean activeCell = parseStoreActiveCell(cell(row, col, "active", "enabled", "actif"));
                    String vitrineRaw = cell(row, col, "vitrine_template", "vitrine", "template", "modele_vitrine");

                    var existing = storeRepository.findByCode(code);
                    if (existing.isPresent()) {
                        StoreUpdateRequest u = new StoreUpdateRequest();
                        if (!name.isEmpty()) {
                            u.setName(name);
                        }
                        u.setPhone(trimToNull(phone));
                        u.setContactEmail(trimToNull(email));
                        u.setMapsUrl(trimToNull(maps));
                        u.setTelegramId(trimToNull(telegram));
                        if (!domain.isEmpty()) {
                            u.setDomain(domain);
                        }
                        if (activeCell != null) {
                            u.setActive(activeCell);
                        }
                        if (!vitrineRaw.isEmpty()) {
                            u.setVitrineTemplate(vitrineRaw);
                        }
                        updateStore(existing.get().getId(), u, true);
                    } else {
                        SuperStoreCreateRequest cr = new SuperStoreCreateRequest();
                        cr.setCode(code);
                        cr.setName(name.isEmpty() ? code : name);
                        cr.setPhone(trimToNull(phone));
                        cr.setContactEmail(trimToNull(email));
                        cr.setMapsUrl(trimToNull(maps));
                        cr.setTelegramId(trimToNull(telegram));
                        cr.setDomain(trimToNull(domain));
                        if (activeCell != null) {
                            cr.setActive(activeCell);
                        }
                        if (!vitrineRaw.isEmpty()) {
                            cr.setVitrineTemplate(vitrineRaw);
                        }
                        createStoreForSupervision(cr);
                    }
                    summary.incrementSuccess();
                } catch (Exception e) {
                    log.warn("Ligne {} import boutique: {}", rowNum, e.getMessage());
                    summary.addError(rowNum, e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName());
                }
                rowNum++;
            }
        } catch (Exception e) {
            log.error("importStoresFromCsv", e);
            throw new RuntimeException("Erreur lecture CSV boutiques: " + e.getMessage());
        }
        return summary;
    }

    private static Map<String, Integer> parseStoreHeader(String[] header) {
        Map<String, Integer> m = new HashMap<>();
        for (int i = 0; i < header.length; i++) {
            if (header[i] == null || header[i].isBlank()) {
                continue;
            }
            String k = header[i].trim().toLowerCase().replace(' ', '_');
            m.putIfAbsent(k, i);
        }
        alias(m, "code", "store_code", "boutique_code");
        alias(m, "name", "nom", "libelle", "title");
        alias(m, "phone", "telephone", "tel");
        alias(m, "contact_email", "email", "mail");
        alias(m, "maps_url", "maps", "lien_maps", "google_maps");
        alias(m, "telegram_id", "telegram", "id_telegram");
        alias(m, "domain", "domaine");
        alias(m, "active", "enabled", "actif", "on");
        alias(m, "vitrine_template", "vitrine", "template", "modele_vitrine", "display_template");
        return m;
    }

    /**
     * Interprète une cellule CSV/Sheet optionnelle pour le statut actif de la boutique.
     *
     * @return {@code null} si vide / inconnu (ne pas modifier en mise à jour).
     */
    private static Boolean parseStoreActiveCell(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String t = raw.trim().toLowerCase();
        if ("1".equals(t) || "true".equals(t) || "oui".equals(t) || "yes".equals(t) || "on".equals(t)) {
            return true;
        }
        if ("0".equals(t) || "false".equals(t) || "non".equals(t) || "no".equals(t) || "off".equals(t)) {
            return false;
        }
        return null;
    }

    private static void alias(Map<String, Integer> m, String canonical, String... synonyms) {
        if (m.containsKey(canonical)) {
            return;
        }
        for (String s : synonyms) {
            if (m.containsKey(s)) {
                m.put(canonical, m.get(s));
                return;
            }
        }
    }

    private static String cell(String[] row, Map<String, Integer> col, String... keys) {
        for (String k : keys) {
            Integer i = col.get(k);
            if (i != null && i < row.length && row[i] != null) {
                return row[i].trim();
            }
        }
        return "";
    }

    /**
     * Évite qu'un ancien {@code app_settings.telegram_chat_id} (souvent copie du défaut global)
     * ne masque le chat saisi sur la fiche boutique {@code stores.telegram_id}.
     */
    private void clearStoreTelegramChatSettingShadow(Long storeId) {
        if (storeId == null) {
            return;
        }
        appSettingRepository.findFirstByKeyAndStoreIdOrderByIdAsc("telegram_chat_id", storeId)
            .ifPresent(row -> {
                appSettingRepository.delete(row);
                log.info(
                    "[telegram] app_settings.telegram_chat_id supprimé pour store_id={} — utilisation de stores.telegram_id",
                    storeId);
            });
    }
}
