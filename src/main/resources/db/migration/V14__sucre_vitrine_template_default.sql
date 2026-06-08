-- SUCRE STORE : vitrine classique (default), pas le modèle marketplace Alibaba.
UPDATE stores
SET vitrine_template = 'default'
WHERE code = 'sucre'
  AND vitrine_template IS DISTINCT FROM 'default';
