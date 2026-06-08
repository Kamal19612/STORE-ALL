CREATE TABLE IF NOT EXISTS delivery_device_tokens (
  id                BIGSERIAL PRIMARY KEY,
  user_id           BIGINT NOT NULL,
  platform          VARCHAR(20) NOT NULL,
  fcm_token         TEXT NOT NULL UNIQUE,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  last_seen_at      TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at        TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_delivery_device_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_delivery_device_user_active
  ON delivery_device_tokens (user_id, is_active, last_seen_at DESC);

