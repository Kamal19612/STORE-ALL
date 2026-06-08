-- Ajout des champs d'identité livreur (CNIB) dans la table users.
-- Ces champs sont alimentés depuis l'admin (web/mobile) après OCR CNIB.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name  TEXT,
  ADD COLUMN IF NOT EXISTS birth_date TEXT,
  ADD COLUMN IF NOT EXISTS birth_place TEXT,
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS profession TEXT,
  ADD COLUMN IF NOT EXISTS cnib_national_id TEXT,
  ADD COLUMN IF NOT EXISTS cnib_serial TEXT,
  ADD COLUMN IF NOT EXISTS cnib_issue_date TEXT,
  ADD COLUMN IF NOT EXISTS cnib_expiry_date TEXT,
  ADD COLUMN IF NOT EXISTS cnib_ocr_text TEXT;

