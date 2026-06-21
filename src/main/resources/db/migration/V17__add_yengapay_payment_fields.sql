-- Champs paiement YengaPay sur les commandes
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'COD';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'UNPAID';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS yengapay_transaction_id VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS yengapay_payment_intent_id VARCHAR(100);
