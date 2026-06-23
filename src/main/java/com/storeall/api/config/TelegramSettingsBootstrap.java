package com.storeall.api.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.storeall.api.service.AppSettingService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Au démarrage : persiste en base les identifiants Telegram fournis par variables d'environnement
 * lorsqu'ils ne sont pas encore en {@code app_settings} (survit au redéploiement sans .env).
 */
@Component
@Order(10)
@RequiredArgsConstructor
@Slf4j
public class TelegramSettingsBootstrap implements ApplicationRunner {

    private final AppProperties appProperties;
    private final AppSettingService appSettingService;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        try {
            int n = appSettingService.bootstrapGlobalTelegramFromEnvironment(
                    appProperties.getTelegram().getBotToken(),
                    appProperties.getTelegram().getChatId());
            if (n > 0) {
                log.info("[telegram-bootstrap] {} paramètre(s) plateforme copié(s) depuis l'environnement vers la base", n);
            }
        } catch (Exception e) {
            log.warn("[telegram-bootstrap] Ignoré au démarrage : {}", e.toString());
        }
    }
}
