-- Options JSON par modèle de vitrine (hero, recherche, couleurs, etc.).
ALTER TABLE stores
    ADD COLUMN IF NOT EXISTS vitrine_config TEXT;
