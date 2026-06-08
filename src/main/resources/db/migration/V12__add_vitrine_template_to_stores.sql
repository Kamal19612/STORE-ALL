-- Modèle de vitrine publique par boutique (slug, ex. default, minimal).
ALTER TABLE stores
    ADD COLUMN IF NOT EXISTS vitrine_template VARCHAR(32) NOT NULL DEFAULT 'default';

UPDATE stores SET vitrine_template = 'default' WHERE vitrine_template IS NULL OR TRIM(vitrine_template) = '';
