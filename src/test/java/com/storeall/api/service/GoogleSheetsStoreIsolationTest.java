package com.storeall.api.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import com.storeall.api.config.GoogleConfig;
import com.storeall.api.dto.ImportSummary;
import com.storeall.api.entity.AppSetting;
import com.storeall.api.entity.Store;
import com.storeall.api.repository.AppSettingRepository;
import com.storeall.api.repository.ProductRepository;
import com.storeall.api.repository.StoreRepository;
import com.storeall.api.tenant.StoreContext;
import com.storeall.api.tenant.TenantProperties;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class GoogleSheetsStoreIsolationTest {

    private static final String SHEET_ID = "1OgGElLh3Y4BmW1EE9ihAFShAFGXgxZ9rjQuQ830av1k";

    @Mock private GoogleConfig googleConfig;
    @Mock private ProductService productService;
    @Mock private ProductRepository productRepository;
    @Mock private AppSettingRepository appSettingRepository;
    @Mock private StoreRepository storeRepository;
    @Mock private StoreService storeService;
    @Mock private TenantProperties tenantProperties;

    @InjectMocks
    private GoogleSheetsService googleSheetsService;

    private Store sucre;
    private Store spirit;

    @BeforeEach
    void setUp() {
        sucre = Store.builder().id(1L).code("sucre").name("SUCRE").active(true).build();
        spirit = Store.builder().id(2L).code("spirit").name("SPIRIT").active(true).build();
        when(storeRepository.findAll()).thenReturn(List.of(sucre, spirit));
        when(storeRepository.count()).thenReturn(2L);
        when(appSettingRepository.findByKeyAndStoreId("google_sheet_id", 1L))
                .thenReturn(Optional.of(AppSetting.builder().key("google_sheet_id").value(SHEET_ID).build()));
        when(appSettingRepository.findByKeyAndStoreId("google_sheet_id", 2L))
                .thenReturn(Optional.of(AppSetting.builder().key("google_sheet_id").value(SHEET_ID).build()));
    }

    @Test
    void fetchProducts_blocksWhenSameSheetAndOtherStoreStillHasProducts() {
        when(productRepository.countByStore_Id(2L)).thenReturn(12L);

        StoreContext.set(sucre);
        try {
            ImportSummary summary = googleSheetsService.fetchProducts(null, null);
            assertEquals(1, summary.getErrorCount());
            assertTrue(summary.getErrorMessages().stream()
                    .anyMatch(m -> m.contains("spirit") && m.contains("12 produit")));
        } finally {
            StoreContext.clear();
        }
    }

    @Test
    void fetchProducts_doesNotBlockWhenSameSheetButOtherCatalogEmpty() {
        when(productRepository.countByStore_Id(2L)).thenReturn(0L);
        when(productRepository.countByStore_Id(1L)).thenReturn(0L);
        when(appSettingRepository.findFirstByKeyAndStoreIdOrderByIdAsc("google_sheet_id", 2L))
                .thenReturn(Optional.of(
                        AppSetting.builder().id(99L).key("google_sheet_id").value(SHEET_ID)
                                .store(spirit).build()));

        StoreContext.set(sucre);
        try {
            ImportSummary summary = googleSheetsService.fetchProducts(null, null);
            assertFalse(summary.getErrorMessages().stream()
                    .anyMatch(m -> m.contains("déjà lié")));
        } finally {
            StoreContext.clear();
        }
    }
}
