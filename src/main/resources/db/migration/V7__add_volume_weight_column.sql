-- Add volume_weight column to products table
-- This field stores the volume/weight information from Google Sheets column E
-- Examples: "50ml", "100g", "5 pièces"

ALTER TABLE products ADD COLUMN volume_weight VARCHAR(255);

COMMENT ON COLUMN products.volume_weight IS 'Volume or weight information (e.g., 50ml, 100g, 5 pieces)';
