package com.storeall.api.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.storeall.api.entity.AppSetting;
import com.storeall.api.entity.Store;
import com.storeall.api.repository.AppSettingRepository;
import com.storeall.api.repository.StoreRepository;

@ExtendWith(MockitoExtension.class)
class TelegramChatIdResolutionTest {

    @Mock
    private AppSettingRepository appSettingRepository;
    @Mock
    private StoreRepository storeRepository;
    @InjectMocks
    private AppSettingService appSettingService;

    private Store store;

    @BeforeEach
    void setUp() {
        store = Store.builder().id(10L).code("sucre").name("Sucre").telegramId("111").active(true).build();
    }

    @Test
    void prefersStoreEntityOverStoreSettingAndGlobal() {
        when(storeRepository.findById(10L)).thenReturn(Optional.of(store));

        var detail = appSettingService.resolveTelegramChatIdForStoreDetailed(10L);
        assertThat(detail).isPresent();
        assertThat(detail.get().chatId()).isEqualTo("111");
        assertThat(detail.get().source()).isEqualTo(AppSettingService.TelegramChatIdSource.STORE_ENTITY);
    }

    @Test
    void ignoresStoreSettingWhenSameAsGlobalDefault() {
        store.setTelegramId(null);
        when(storeRepository.findById(10L)).thenReturn(Optional.of(store));
        when(appSettingRepository.findFirstByKeyAndStoreIdOrderByIdAsc("telegram_chat_id", 10L))
            .thenReturn(Optional.of(AppSetting.builder().key("telegram_chat_id").value("555").build()));
        when(appSettingRepository.findFirstByKeyAndStoreIsNullOrderByIdAsc("telegram_chat_id"))
            .thenReturn(Optional.of(AppSetting.builder().key("telegram_chat_id").value("555").build()));

        var detail = appSettingService.resolveTelegramChatIdForStoreDetailed(10L);
        assertThat(detail).isPresent();
        assertThat(detail.get().chatId()).isEqualTo("555");
        assertThat(detail.get().source()).isEqualTo(AppSettingService.TelegramChatIdSource.GLOBAL_DEFAULT);
    }

    @Test
    void usesStoreSettingWhenEntityEmpty() {
        store.setTelegramId(null);
        when(storeRepository.findById(10L)).thenReturn(Optional.of(store));
        when(appSettingRepository.findFirstByKeyAndStoreIdOrderByIdAsc("telegram_chat_id", 10L))
            .thenReturn(Optional.of(AppSetting.builder().key("telegram_chat_id").value("999").build()));

        var detail = appSettingService.resolveTelegramChatIdForStoreDetailed(10L);
        assertThat(detail).isPresent();
        assertThat(detail.get().chatId()).isEqualTo("999");
        assertThat(detail.get().source()).isEqualTo(AppSettingService.TelegramChatIdSource.STORE_SETTING);
    }

    @Test
    void usesStoreEntityWhenNoStoreSetting() {
        when(storeRepository.findById(10L)).thenReturn(Optional.of(store));

        var detail = appSettingService.resolveTelegramChatIdForStoreDetailed(10L);
        assertThat(detail).isPresent();
        assertThat(detail.get().chatId()).isEqualTo("111");
        assertThat(detail.get().source()).isEqualTo(AppSettingService.TelegramChatIdSource.STORE_ENTITY);
    }

    @Test
    void fallsBackToGlobalDefaultWhenStoreHasNoOwnChat() {
        store.setTelegramId(null);
        when(appSettingRepository.findFirstByKeyAndStoreIdOrderByIdAsc(eq("telegram_chat_id"), anyLong()))
            .thenReturn(Optional.empty());
        when(storeRepository.findById(10L)).thenReturn(Optional.of(store));
        when(appSettingRepository.findFirstByKeyAndStoreIsNullOrderByIdAsc("telegram_chat_id"))
            .thenReturn(Optional.of(AppSetting.builder().key("telegram_chat_id").value("555").build()));

        var detail = appSettingService.resolveTelegramChatIdForStoreDetailed(10L);
        assertThat(detail).isPresent();
        assertThat(detail.get().chatId()).isEqualTo("555");
        assertThat(detail.get().source()).isEqualTo(AppSettingService.TelegramChatIdSource.GLOBAL_DEFAULT);
    }
}
