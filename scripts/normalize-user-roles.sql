-- Assainissement users.role (staff : SUPER_ADMIN | MANAGER uniquement).
-- Usage (ex. Postgres local Supabase, port dans application.yml / config.toml) :
--   PGPASSWORD=postgres psql -h 127.0.0.1 -p 5634 -U postgres -d postgres -v ON_ERROR_STOP=1 -f scripts/normalize-user-roles.sql
--
-- Idempotent : peut être rejoué avant ou en parallèle du démarrage Spring (LegacyUserRoleMigrator).

BEGIN;

UPDATE users
SET role = 'MANAGER'
WHERE role IS NOT NULL
  AND role NOT IN ('SUPER_ADMIN', 'MANAGER');

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_allowed;

ALTER TABLE users
  ADD CONSTRAINT users_role_allowed CHECK (role IN ('SUPER_ADMIN', 'MANAGER', 'DELIVERY_AGENT'));

COMMIT;
