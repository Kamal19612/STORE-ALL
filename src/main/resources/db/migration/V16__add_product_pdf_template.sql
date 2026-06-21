-- PDF modèle personnalisable (AcroForm) rattaché au produit + PDF rempli lié à la commande.
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS template_pdf_url VARCHAR(2048),
    ADD COLUMN IF NOT EXISTS requires_pdf_form BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE order_items
    ADD COLUMN IF NOT EXISTS filled_pdf_url VARCHAR(2048),
    ADD COLUMN IF NOT EXISTS pdf_field_values TEXT;

COMMENT ON COLUMN products.template_pdf_url IS 'Chemin relatif du PDF modèle (stockage privé, non public).';
COMMENT ON COLUMN products.requires_pdf_form IS 'TRUE si le client doit remplir le PDF avant ajout au panier.';
COMMENT ON COLUMN order_items.filled_pdf_url IS 'Chemin relatif du PDF rempli par le client (stockage privé).';
COMMENT ON COLUMN order_items.pdf_field_values IS 'JSON des valeurs saisies dans le formulaire PDF.';
