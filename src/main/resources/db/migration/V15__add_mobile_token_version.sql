-- Session JWT mobile (SPIRIT-LIVRAISON) indépendante de la session web.
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version_mobile BIGINT DEFAULT 0;
