-- Migration pour ajouter le code de confirmation aux commandes

ALTER TABLE orders ADD COLUMN confirmation_code VARCHAR(10) UNIQUE;

-- Index pour améliorer les performances de recherche par code
CREATE INDEX idx_orders_confirmation_code ON orders(confirmation_code);

-- Commentaires
COMMENT ON COLUMN orders.confirmation_code IS 'Code de confirmation unique généré automatiquement (ex: CONF-1234)';
