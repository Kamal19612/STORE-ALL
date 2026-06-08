package com.storeall.api.config;

import java.sql.SQLException;
import java.sql.Statement;

import org.hibernate.Session;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import lombok.extern.slf4j.Slf4j;

/**
 * Étape 2/2 : contrainte CHECK sur {@code users.role} (après commit de {@link LegacyUserRoleMigrator}).
 * DDL via JDBC ({@link Session#doWork}) : Hibernate 6 n'accepte pas {@code executeUpdate()} sur des {@code ALTER TABLE}.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 1)
@Slf4j
public class UserRoleCheckConstraintEnsurer implements ApplicationRunner {

    static final String CONSTRAINT_NAME = "users_role_allowed";

    @PersistenceContext
    private EntityManager entityManager;

    @Value("${app.bootstrap.normalize-legacy-user-roles-on-start:true}")
    private boolean normalizeLegacyUserRolesOnStart;

    @Value("${app.bootstrap.enforce-user-role-check-constraint:true}")
    private boolean enforceUserRoleCheckConstraint;

    @Override
    public void run(ApplicationArguments args) {
        if (!normalizeLegacyUserRolesOnStart || !enforceUserRoleCheckConstraint) {
            return;
        }
        try {
            Session session = entityManager.unwrap(Session.class);
            session.doWork(connection -> {
                try (Statement st = connection.createStatement()) {
                    // Ancienne contrainte Hibernate / import.sql (sans DELIVERY_AGENT).
                    st.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check");
                    st.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS " + CONSTRAINT_NAME);
                    st.execute("ALTER TABLE users ADD CONSTRAINT " + CONSTRAINT_NAME
                            + " CHECK (role IN ('SUPER_ADMIN', 'MANAGER', 'DELIVERY_AGENT'))");
                }
            });
            log.debug("[store-all] CHECK constraint {} applied on users.role", CONSTRAINT_NAME);
        } catch (RuntimeException e) {
            Throwable cause = e.getCause() != null ? e.getCause() : e;
            if (cause instanceof SQLException) {
                log.warn("[store-all] Could not apply CHECK constraint {} on users.role (SQL): {}",
                        CONSTRAINT_NAME, cause.getMessage());
            } else {
                log.warn("[store-all] Could not apply CHECK constraint {} on users.role: {}",
                        CONSTRAINT_NAME, e.getMessage());
            }
        }
    }
}
