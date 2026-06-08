package com.storeall.api.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataAccessException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.storeall.api.entity.Store;
import com.storeall.api.entity.User;
import com.storeall.api.repository.StoreRepository;
import com.storeall.api.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Crée ou met à jour le compte super-admin de bootstrap après les autres {@link ApplicationRunner}
 * (boutiques, migration legacy). Le {@code CommandLineRunner} sur la classe principale peut être
 * mal ordonné ou fragile selon la version Spring ; un runner dédié garantit l’insert en base.
 */
@Component
@Order(10)
@RequiredArgsConstructor
@Slf4j
public class DefaultAdminBootstrap implements ApplicationRunner {

    private final AppProperties appProperties;
    private final UserRepository userRepository;
    private final StoreRepository storeRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        AppProperties.Bootstrap boot = appProperties.getBootstrap();
        String uname = boot.getAdminUsername() != null && !boot.getAdminUsername().isBlank()
                ? boot.getAdminUsername().trim()
                : "admin";
        String email = boot.getAdminEmail() != null && !boot.getAdminEmail().isBlank()
                ? boot.getAdminEmail().trim()
                : "admin@store-all.local";
        String rawPassword = resolveBootstrapAdminPassword(boot);
        if (rawPassword == null || rawPassword.isBlank()) {
            log.error("[bootstrap] app.bootstrap.admin-password est vide — compte admin non créé / non mis à jour.");
            return;
        }

        try {
            Store spiritStore = storeRepository.findByCode("spirit").orElse(null);

            if (userRepository.findByUsername(uname).isEmpty()) {
                User admin = User.builder()
                        .username(uname)
                        .email(email)
                        .password(passwordEncoder.encode(rawPassword))
                        .role(User.Role.SUPER_ADMIN)
                        .active(true)
                        .store(spiritStore)
                        .build();
                userRepository.saveAndFlush(admin);
                log.info("[bootstrap] Super administrateur créé : username={} email={} rôle=SUPER_ADMIN", uname, email);
            } else {
                User admin = userRepository.findByUsername(uname).orElseThrow();
                admin.setActive(true);
                admin.setEmail(email);
                admin.setRole(User.Role.SUPER_ADMIN);
                if (spiritStore != null && admin.getStore() == null) {
                    admin.setStore(spiritStore);
                }
                if (boot.isResetAdminPasswordOnEachStart()) {
                    admin.setPassword(passwordEncoder.encode(rawPassword));
                    log.info("[bootstrap] Compte « {} » : SUPER_ADMIN, mot de passe réinitialisé.", uname);
                } else {
                    log.info("[bootstrap] Compte « {} » : SUPER_ADMIN assuré ; mot de passe inchangé.", uname);
                }
                userRepository.saveAndFlush(admin);
            }
        } catch (DataAccessException e) {
            log.error("[bootstrap] Échec création/mise à jour admin (SQL) : {}", e.getMessage(), e);
            throw e;
        }
    }

    private static String resolveBootstrapAdminPassword(AppProperties.Bootstrap boot) {
        String fromSpring = boot.getAdminPassword();
        if (fromSpring != null && !fromSpring.isBlank()) {
            return fromSpring.trim();
        }
        String a = System.getenv("STORE_ALL_ADMIN_PASSWORD");
        if (a != null && !a.isBlank()) {
            return a.trim();
        }
        String s = System.getenv("SPIRIT_ADMIN_PASSWORD");
        if (s != null && !s.isBlank()) {
            return s.trim();
        }
        log.info("[bootstrap] admin-password absent ou vide (config/env) — utilisation du mot de passe par défaut dev.");
        return "Pass_word.(1)@!";
    }
}
