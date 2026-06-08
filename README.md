# STORE-ALL

Même fonctionnement que **SPIRIT_S** / **STORE** (API Spring, front Vite, Supabase local, tenant `spirit`), avec une **configuration et des ports par défaut propres** pour tourner en parallèle sans conflit. **Chaque dépôt fixe ses propres ports d’écoute** ; tout est surchargeable par variables d’environnement (sans modifier **STORE**, qui reste indépendant).

| Zone | Défaut STORE-ALL | Personnalisation |
|------|-------------------|-------------------|
| API HTTP | `8085` | **`SERVER_PORT`** (Spring Boot) — voir aussi `server.port` dans `application.yml` |
| Postgres JDBC | `127.0.0.1:5634` | **`DB_JDBC_URL`** ou **`DB_HOST` / `DB_PORT` / `DB_NAME`** |
| Supabase local (Kong, DB, Studio…) | `supabase/config.toml` (ex. Kong **54521**, DB **5634**) | Éditer **`supabase/config.toml`**, puis aligner **`supabase/.env`** / defaults JDBC |
| Front Vite (dev) | **5176** | **`FRONTEND_DEV_PORT`** dans `frontend/.env` ; aligner **`auth.additional_redirect_urls`** dans `supabase/config.toml` si tu changes ce port |
| Front Vite (preview, `frontend:prod`) | **4273** | **`FRONTEND_PREVIEW_PORT`** dans `frontend/.env` (défaut distinct de **SPIRIT_S** : **4374**) |
| Proxy Vite → API | `http://127.0.0.1:8085` | **`BACKEND_PORT`** dans `frontend/.env`, ou repli sur **`SERVER_PORT`**, sinon défaut **8085** |
| Package Java racine | `com.storeall.api` | Entités, services, contrôleurs (remplace l’historique `com.sucrestore.api` du clone) |

## Démarrage rapide (local)

1. **Une fois par machine / clone** :

   ```bash
   chmod +x scripts/*.sh   # si besoin
   ./scripts/store-all-local-setup.sh
   ```

   Cela copie les `.env` manquants depuis les `.env.example`, démarre **Supabase** (Docker si besoin), puis injecte **`SERVICE_ROLE_KEY`** et **`API_URL`** depuis `supabase status` dans `supabase/.env`.

   Variantes :

   - `npm run store-all:setup` depuis `frontend/`
   - `./scripts/store-all-local-setup.sh --env-only` — seulement les fichiers `.env`, sans Docker
   - `./scripts/supabase-refresh-local-keys.sh` — mettre à jour les clés après un `supabase stop` / nouvelle clef  
   - Compat. : `npm run spirit:setup` / `spirit:setup:env` appellent les mêmes scripts que `store-all:*`.

2. **Frontend + backend en dev** (depuis `frontend/`) :

   ```bash
   npm install
   npm run dev
   ```

   Front (défaut **http://127.0.0.1:5176**) · API Spring (défaut **8085**) · proxy Vite `/api`. Surcharge : **`FRONTEND_DEV_PORT`**, **`SERVER_PORT`**, **`BACKEND_PORT`** dans `frontend/.env` (voir `frontend/.env.example`).

3. **Base** : Postgres local **de ce dépôt** sur **5634** (Kong **54521**, etc.) après `supabase start` ici. Tu peux aussi pointer vers **une autre** instance en surchargeant **`DB_*`** / **`SUPABASE_URL`**. Au premier démarrage du backend, **`StoreBootstrap`** assure les boutiques **`sucre`** et **`spirit`** dans `stores` (avec `VITE_STORE_CODE=spirit` côté front).

Voir aussi `SUPABASE_PUBLIC_URL`, `SERVICE_ROLE_KEY` et `JWT_SECRET` en production avant mise en ligne.

## Connexion (admin)

Compte géré par **`app.bootstrap`** dans `application.yml` (bootstrap admin dans `StoreAllApplication`).

| Champ | Valeur |
|--------|--------|
| **Identifiant** | `admin` (ou l’email configuré) |
| **Mot de passe** | **`Pass_word.(1)@!`** (défaut historique ; surcharge : **`STORE_ALL_ADMIN_PASSWORD`**, compat. **`SPIRIT_ADMIN_PASSWORD`**) |
| **Email en base** | `admin@store-all.local` (modifiable sous `app.bootstrap.admin-email`) |

**À chaque redémarrage du backend** (comportement par défaut) : le compte `admin` est **revérifié** — **rôle SUPER_ADMIN**, compte **actif**, **email** et **store spirit** (si présent) alignés sur la config, et le **mot de passe est réinitialisé** vers `app.bootstrap.admin-password` (ou `STORE_ALL_ADMIN_PASSWORD` / `SPIRIT_ADMIN_PASSWORD`). Pour la **production**, désactive ce comportement :  
`export STORE_ALL_RESET_ADMIN_EACH_START=false` (ou `SPIRIT_RESET_ADMIN_EACH_START=false`) ou mets `reset-admin-password-on-each-start: false` dans `application.yml` / profil prod.

**Si la connexion échoue :**

1. **Backend** : doit tourner sur le port **8085** (`application.yml`). Avec `npm run dev` depuis `frontend/`, le proxy Vite envoie `/api` vers ce port.
2. **Postgres** : URL par défaut `127.0.0.1:5634` (alignée sur `supabase/config.toml` de ce dépôt). Si la base ne répond pas, le backend ne démarre pas ou les utilisateurs n’existent pas.
3. **Onglet réseau (F12)** : la requête `POST /api/auth/login` doit répondre **200**.  
   - **Aucune réponse / erreur réseau** → backend arrêté ou mauvais port / pas de proxy.  
   - **401** → mauvais mot de passe ; avec le défaut actuel, **redémarre le backend** pour réappliquer **`Pass_word.(1)@!`**. En prod sans reset automatique, vérifie le mot de passe réel ou `STORE_ALL_ADMIN_PASSWORD` / `SPIRIT_ADMIN_PASSWORD`.  
   - **Après login, pages admin en erreur** → vérifier `VITE_STORE_CODE=spirit` dans `frontend/.env` (en-tête `X-Store-Code`), cohérent avec `tenant.default-store-code: spirit` côté API.

## Connexion (livreur)

Les comptes livreur (`DELIVERY_AGENT`) se créent via l’admin (pas de bootstrap automatique au démarrage).

| Champ | Détail |
|--------|--------|
| **Rôle** | `DELIVERY_AGENT` |
| **URL PWA** | `http://127.0.0.1:5176/delivery/dashboard` (après `npm run dev`) |

Le livreur voit les commandes de **toutes les boutiques** ; chaque carte affiche le **nom**, le **téléphone** et le **lieu de retrait** de la boutique concernée (`order.store`).

**Flux test** : checkout public → admin/manager confirme la commande → connexion livreur → onglet « disponibles » → prise en charge → code client → livré.

**Mobile (SPIRIT-LIVRAISON)** : `store_api_origin` = `http://127.0.0.1:8085`, mêmes identifiants.

**FCM (optionnel)** : `FCM_ENABLED=true` + `FCM_SERVICE_ACCOUNT_PATH` côté serveur ; enregistrer le token via `POST /api/delivery/devices/register` depuis la PWA ou l’app.
