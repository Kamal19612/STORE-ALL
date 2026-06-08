-- Vide toutes les tables métier STORE-ALL (schéma public).
-- Usage : PGPASSWORD=postgres psql -h 127.0.0.1 -p 5634 -U postgres -d postgres -f scripts/reset-postgres-data.sql
-- Arrêtez l'API Spring avant d'exécuter pour éviter des erreurs de connexion.

BEGIN;

TRUNCATE TABLE
  order_status_history,
  order_items,
  notification_outbox,
  delivery_assignments,
  orders,
  product_secondary_images,
  products,
  categories,
  sliders,
  app_settings,
  customer_push_subscriptions,
  push_subscriptions,
  delivery_device_tokens,
  delivery_agents,
  users,
  stores
RESTART IDENTITY CASCADE;

COMMIT;
