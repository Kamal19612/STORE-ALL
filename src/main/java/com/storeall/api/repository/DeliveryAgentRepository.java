package com.storeall.api.repository;

import jakarta.annotation.PostConstruct;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class DeliveryAgentRepository {

    private final JdbcTemplate jdbcTemplate;

    /**
     * Assure l'existence de la table `public.delivery_agents` même si Flyway n'est pas activé.
     * On s'appuie sur `ddl-auto=update` pour les entités JPA, mais cette table est gérée en JDBC.
     */
    @PostConstruct
    void ensureSchema() {
        String tzType = "timestamptz";
        try {
            var ds = jdbcTemplate.getDataSource();
            if (ds != null) {
                try (var c = ds.getConnection()) {
                    String product = c.getMetaData().getDatabaseProductName();
                    if (product != null && product.toLowerCase().contains("h2")) {
                        // H2 does not support timestamptz
                        tzType = "timestamp";
                    }
                }
            }
        } catch (Exception ignored) {}

        // Table de mapping Supabase Auth <-> User local pour les livreurs.
        jdbcTemplate.execute(
            """
            CREATE TABLE IF NOT EXISTS public.delivery_agents (
              auth_user_id uuid PRIMARY KEY,
              store_user_id bigint NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
              role text NOT NULL,
              is_active boolean NOT NULL DEFAULT true,
              created_at %s NOT NULL DEFAULT now(),
              updated_at %s NOT NULL DEFAULT now()
            )
            """
            .formatted(tzType, tzType)
        );

        // Permet de retrouver un mapping par user local (status page / debug).
        jdbcTemplate.execute(
            "CREATE UNIQUE INDEX IF NOT EXISTS ux_delivery_agents_store_user_id ON public.delivery_agents(store_user_id)"
        );

        // Mise à jour automatique du timestamp côté SQL lors d'un UPDATE.
        // On évite de créer des triggers si la DB n'a pas les droits; la colonne reste informative.
    }

    public void upsertDeliveryAgent(String authUserId, Long storeUserId, String role, boolean active) {
        try {
            jdbcTemplate.update(
                """
                INSERT INTO public.delivery_agents (auth_user_id, store_user_id, role, is_active, updated_at)
                VALUES (?::uuid, ?, ?, ?, now())
                ON CONFLICT (auth_user_id)
                DO UPDATE SET store_user_id = EXCLUDED.store_user_id,
                              role = EXCLUDED.role,
                              is_active = EXCLUDED.is_active,
                              updated_at = now()
                """,
                authUserId,
                storeUserId,
                role,
                active
            );
        } catch (org.springframework.dao.DataAccessException e) {
            String root = e.getMostSpecificCause() != null ? e.getMostSpecificCause().getMessage() : e.getMessage();
            throw new RuntimeException("Mapping delivery_agents impossible (DB). Détail: " + root, e);
        }
    }

    public String findAuthUserIdByStoreUserId(Long storeUserId) {
        try {
            return jdbcTemplate.queryForObject(
                "SELECT auth_user_id::text FROM public.delivery_agents WHERE store_user_id = ? LIMIT 1",
                String.class,
                storeUserId
            );
        } catch (org.springframework.dao.EmptyResultDataAccessException e) {
            return null;
        }
    }
}

