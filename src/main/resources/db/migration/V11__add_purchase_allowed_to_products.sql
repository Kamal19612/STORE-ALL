-- Autorisation d'achat (équivalent colonne DISPONIBILITÉ PHP), distincte du stock (rupture) et de active (fiche masquée / import INACTIF).
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS purchase_allowed BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN products.purchase_allowed IS 'FALSE = pas de vente (sheet NON/INACTIF/…). TRUE mais stock 0 = rupture réparable par réassort.';
