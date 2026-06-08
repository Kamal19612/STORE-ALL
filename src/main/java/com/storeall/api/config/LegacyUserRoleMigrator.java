package com.storeall.api.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import lombok.extern.slf4j.Slf4j;

/**
 * Étape 1/2 : normalise les lignes {@code users.role} vers SUPER_ADMIN / MANAGER.
 * La contrainte CHECK est appliquée ensuite par {@link UserRoleCheckConstraintEnsurer} (transaction séparée).
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
@Slf4j
public class LegacyUserRoleMigrator implements ApplicationRunner {

    @PersistenceContext
    private EntityManager entityManager;

    @Value("${app.bootstrap.normalize-legacy-user-roles-on-start:true}")
    private boolean normalizeLegacyUserRolesOnStart;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!normalizeLegacyUserRolesOnStart) {
            log.warn("[store-all] Legacy user role normalization is disabled (app.bootstrap.normalize-legacy-user-roles-on-start=false)");
            return;
        }
        int n = entityManager.createNativeQuery(
                "UPDATE users SET role = 'MANAGER' WHERE role IS NOT NULL "
                        + "AND role NOT IN ('SUPER_ADMIN', 'MANAGER', 'DELIVERY_AGENT')")
                .executeUpdate();
        if (n > 0) {
            log.info("[store-all] Legacy user roles remapped to MANAGER: {} row(s)", n);
        }
    }
}
