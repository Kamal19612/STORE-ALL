-- Migration pour créer la table de traçabilité des statuts de commande

CREATE TABLE order_status_history (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_by BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_order_status_history_order 
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    
    CONSTRAINT fk_order_status_history_user 
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Index pour améliorer les performances de recherche par commande
CREATE INDEX idx_order_status_history_order_id ON order_status_history(order_id);

-- Index pour améliorer les performances de tri par date
CREATE INDEX idx_order_status_history_created_at ON order_status_history(created_at DESC);

-- Commentaires pour documentation
COMMENT ON TABLE order_status_history IS 'Historique des changements de statut des commandes pour traçabilité complète';
COMMENT ON COLUMN order_status_history.order_id IS 'Référence à la commande concernée';
COMMENT ON COLUMN order_status_history.status IS 'Statut appliqué (PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED)';
COMMENT ON COLUMN order_status_history.created_by IS 'Administrateur ayant effectué le changement (NULL si automatique)';
COMMENT ON COLUMN order_status_history.created_at IS 'Date et heure du changement';
