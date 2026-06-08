package com.storeall.api.service;

import java.io.ByteArrayOutputStream;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Stream;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.opencsv.CSVWriter;
import com.storeall.api.dto.ImportSummary;
import com.storeall.api.dto.ManagerSupervisionRow;
import com.storeall.api.dto.StoreInfoResponse;
import com.storeall.api.dto.StoreUpdateRequest;
import com.storeall.api.dto.SuperManagerCreateRequest;
import com.storeall.api.dto.SuperManagerUpdateRequest;
import com.storeall.api.dto.SuperStoreCreateRequest;
import com.storeall.api.dto.SuperStoreUpdateRequest;
import com.storeall.api.dto.SupervisionOrderRow;
import com.storeall.api.dto.SupervisionProductRow;
import com.storeall.api.entity.Order;
import com.storeall.api.entity.Product;
import com.storeall.api.entity.Store;
import com.storeall.api.entity.User;
import com.storeall.api.repository.OrderRepository;
import com.storeall.api.repository.ProductRepository;
import com.storeall.api.repository.StoreRepository;
import com.storeall.api.repository.UserRepository;
import com.storeall.api.security.UserDetailsServiceImpl;
import com.storeall.api.tenant.TenantProperties;
import com.storeall.api.util.MediaUrlUtils;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AdminSupervisionService {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final StoreRepository storeRepository;
    private final UserRepository userRepository;
    private final StoreService storeService;
    private final ProductService productService;
    private final UserDetailsServiceImpl userDetailsService;
    private final GoogleSheetsService googleSheetsService;
    private final FileStorageService fileStorageService;
    private final AppSettingService appSettingService;
    private final TelegramService telegramService;
    private final TenantProperties tenantProperties;

    @Transactional(readOnly = true)
    public List<StoreInfoResponse> listStores() {
        return storeRepository.findAll().stream().map(StoreInfoResponse::fromEntity).toList();
    }

    @Transactional
    public StoreInfoResponse createStore(SuperStoreCreateRequest req, MultipartFile logoFile) {
        if (req == null) {
            throw new IllegalArgumentException("Requête vide");
        }
        if (logoFile != null && !logoFile.isEmpty()) {
            String fileName = fileStorageService.storeProductImage(logoFile);
            req.setLogoUrl(MediaUrlUtils.uploadPath(fileName));
        }
        return storeService.createStoreForSupervision(req);
    }

    @Transactional
    public StoreInfoResponse updateStore(Long storeId, SuperStoreUpdateRequest req, MultipartFile logoFile) {
        StoreUpdateRequest update = req == null ? new StoreUpdateRequest() : req.toStoreUpdateRequest();
        if (logoFile != null && !logoFile.isEmpty()) {
            String fileName = fileStorageService.storeProductImage(logoFile);
            update.setLogoUrl(MediaUrlUtils.uploadPath(fileName));
        }
        return storeService.updateStore(storeId, update, true);
    }

    @Transactional
    public void deleteStore(Long storeId) {
        storeService.deleteStoreForSupervision(storeId);
    }

    @Transactional(readOnly = true)
    public Page<SupervisionOrderRow> listOrders(Long storeId, Pageable pageable) {
        return orderRepository.findSupervisionPage(storeId, pageable).map(this::toOrderRow);
    }

    @Transactional(readOnly = true)
    public Page<SupervisionProductRow> listProducts(Long storeId, String search, Pageable pageable) {
        String q = search == null ? "" : search.trim();
        return productRepository.findSupervisionPage(storeId, q, pageable).map(this::toProductRow);
    }

    @Transactional(readOnly = true)
    public List<ManagerSupervisionRow> listManagers(Long storeId, String search) {
        String q = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
        return userRepository.findAllByRoleWithStore(User.Role.MANAGER).stream()
                .filter(u -> storeId == null || (u.getStore() != null && storeId.equals(u.getStore().getId())))
                .filter(u -> managerMatchesSearch(u, q))
                .map(ManagerSupervisionRow::fromEntity)
                .toList();
    }

    @Transactional
    public User createManager(SuperManagerCreateRequest req) {
        return userDetailsService.createManagerForSupervision(req);
    }

    @Transactional(readOnly = true)
    public ManagerSupervisionRow getManager(Long id) {
        return userDetailsService.getManagerForSupervision(id);
    }

    @Transactional
    public ManagerSupervisionRow updateManager(Long id, SuperManagerUpdateRequest req) {
        return userDetailsService.updateManagerForSupervision(id, req);
    }

    @Transactional
    public void deleteManager(Long id) {
        userDetailsService.deleteManagerForSupervision(id);
    }

    @Transactional(readOnly = true)
    public byte[] exportProductsCsv(Long storeId) {
        if (storeId != null) {
            return productService.exportCatalogCsv(storeId);
        }
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        try (OutputStreamWriter osw = new OutputStreamWriter(bos, StandardCharsets.UTF_8);
             CSVWriter w = new CSVWriter(osw)) {
            w.writeNext(new String[]{"store_code", "nom", "categorie", "prix", "image_url", "description", "stock", "external_id"});
            for (Store s : storeRepository.findAll()) {
                for (Product p : productRepository.findCatalogListForExport(s.getId())) {
                    String cat = p.getCategory() != null ? p.getCategory().getName() : "";
                    String desc = p.getDescription() == null ? "" : p.getDescription();
                    String ext = p.getExternalId() == null ? "" : p.getExternalId();
                    String price = p.getPrice() != null ? p.getPrice().toPlainString() : "0";
                    String img = p.getMainImage() == null ? "" : p.getMainImage();
                    int st = p.getStock() != null ? p.getStock() : 0;
                    w.writeNext(new String[]{
                            s.getCode(),
                            p.getName(),
                            cat,
                            price,
                            img,
                            desc,
                            String.valueOf(st),
                            ext
                    });
                }
            }
        } catch (java.io.IOException e) {
            throw new RuntimeException("Export CSV: " + e.getMessage(), e);
        }
        return withUtf8Bom(bos.toByteArray());
    }

    @Transactional
    public ImportSummary importProductsCsv(MultipartFile file, Long defaultStoreId) {
        return productService.processSupervisionProductsCsv(file, defaultStoreId);
    }

    @Transactional
    public int deleteAllProductsForStore(Long storeId) {
        return productService.deleteAllProductsForStoreId(storeId);
    }

    @Transactional
    public ImportSummary importStoresCsv(MultipartFile file) {
        return storeService.importStoresFromCsv(file);
    }

    @Transactional(readOnly = true)
    public byte[] exportStoresCsv() {
        return withUtf8Bom(storeService.exportStoresCsv());
    }

    @Transactional
    public ImportSummary importStoresFromGoogleSheets(String spreadsheetId, Long sheetGid) {
        return googleSheetsService.fetchStoresFromGoogleSheets(spreadsheetId, sheetGid);
    }

    @Transactional(readOnly = true)
    public Map<String, String> getSuperTelegramPlatformSettings() {
        return appSettingService.getGlobalTelegramPlatformSettings();
    }

    @Transactional
    public void updateSuperTelegramPlatformSettings(Map<String, String> body) {
        appSettingService.upsertGlobalTelegramPlatformSettings(body);
        telegramService.registerAllStoreWebhooks();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getSuperApplicationSummary() {
        Map<String, Object> summary = new HashMap<>();
        summary.put("storeCount", storeRepository.count());
        summary.put("defaultStoreCode", tenantProperties.getDefaultStoreCode());

        String resolvedToken = appSettingService.resolveTelegramBotTokenForStore(null).orElse("");
        if (resolvedToken.isBlank()) {
            resolvedToken = "";
        }
        summary.put("resolvedBotTokenPresent", !resolvedToken.isBlank());
        summary.put("resolvedChatIdPresent", appSettingService.getGlobalTelegramChatId().isPresent());
        summary.put("resolvedConfigSource", resolvedToken.isBlank() ? "none" : "platform_db_or_env");
        summary.put("webhookUrlConfigured", !telegramService.resolveWebhookBaseUrl().isBlank());
        summary.put("webhookSecretConfigured",
            telegramService.getWebhookSecret() != null && !telegramService.getWebhookSecret().isBlank());
        summary.put("tokenHealthGetMe", telegramService.healthCheckTokenOnly());

        long withOwnChat = 0;
        long usingDefault = 0;
        long withoutAnyChat = 0;
        for (Store store : storeRepository.findAll()) {
            if (!store.isActive()) {
                continue;
            }
            var detail = appSettingService.resolveTelegramChatIdForStoreDetailed(store.getId());
            if (detail.isEmpty()) {
                withoutAnyChat++;
            } else if (detail.get().source() == AppSettingService.TelegramChatIdSource.GLOBAL_DEFAULT) {
                usingDefault++;
            } else {
                withOwnChat++;
            }
        }
        summary.put("storesWithOwnTelegramChat", withOwnChat);
        summary.put("storesUsingDefaultTelegramChat", usingDefault);
        summary.put("storesWithoutTelegramChat", withoutAnyChat);
        return summary;
    }

    public TelegramService.WebhookRegistrationResult registerSuperTelegramWebhook() {
        appSettingService.upsertGlobalTelegramPlatformSettings(appSettingService.getGlobalTelegramPlatformSettings());
        int n = telegramService.registerAllStoreWebhooks();
        return new TelegramService.WebhookRegistrationResult(true, n > 0, "registered=" + n);
    }

    public TelegramService.WebhookRegistrationResult unregisterSuperTelegramWebhook() {
        return telegramService.unregisterWebhookNow();
    }

    public String getSuperTelegramWebhookInfoRaw() {
        return telegramService.getWebhookInfoRaw();
    }

    public void sendSuperTelegramTest(String text) {
        telegramService.sendTestMessage(text);
    }

    private static boolean managerMatchesSearch(User u, String q) {
        if (q.isEmpty()) {
            return true;
        }
        return Stream.of(
                        u.getUsername(),
                        u.getEmail(),
                        u.getPhone(),
                        u.getFirstName(),
                        u.getLastName(),
                        u.getStore() != null ? u.getStore().getCode() : null,
                        u.getStore() != null ? u.getStore().getName() : null)
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(s -> s.toLowerCase(Locale.ROOT))
                .anyMatch(s -> s.contains(q));
    }

    private static byte[] withUtf8Bom(byte[] raw) {
        byte[] bom = new byte[]{(byte) 0xEF, (byte) 0xBB, (byte) 0xBF};
        byte[] out = new byte[bom.length + raw.length];
        System.arraycopy(bom, 0, out, 0, bom.length);
        System.arraycopy(raw, 0, out, bom.length, raw.length);
        return out;
    }

    private SupervisionOrderRow toOrderRow(Order o) {
        Store s = o.getStore();
        Long sid = s != null ? s.getId() : null;
        String sc = s != null ? s.getCode() : null;
        String sn = s != null ? s.getName() : null;
        return SupervisionOrderRow.builder()
                .id(o.getId())
                .orderNumber(o.getOrderNumber())
                .status(o.getStatus())
                .total(o.getTotal())
                .createdAt(o.getCreatedAt())
                .customerName(o.getCustomerName())
                .storeId(sid)
                .storeCode(sc)
                .storeName(sn)
                .build();
    }

    private SupervisionProductRow toProductRow(Product p) {
        Store s = p.getStore();
        Long sid = s != null ? s.getId() : null;
        String sc = s != null ? s.getCode() : null;
        String sn = s != null ? s.getName() : null;
        return SupervisionProductRow.builder()
                .id(p.getId())
                .name(p.getName())
                .slug(p.getSlug())
                .price(p.getPrice())
                .active(p.isActive())
                .storeId(sid)
                .storeCode(sc)
                .storeName(sn)
                .build();
    }
}
