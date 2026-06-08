ALTER TABLE order_status_history
  ADD COLUMN IF NOT EXISTS note TEXT;

