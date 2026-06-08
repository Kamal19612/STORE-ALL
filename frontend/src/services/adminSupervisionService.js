import api from "./api";

/** Liste boutiques (super admin). */
export function listStores() {
  return api.get("/super/stores").then((r) => r.data);
}

/** Création boutique. `logoFile` optionnel → multipart (JPG/PNG, max 2 Mo côté API). */
export function createStore(payload, logoFile) {
  if (logoFile) {
    const fd = new FormData();
    fd.append("store", JSON.stringify(payload));
    fd.append("logo", logoFile);
    return api.post("/super/stores", fd).then((r) => r.data);
  }
  return api.post("/super/stores", payload).then((r) => r.data);
}

/** Mise à jour fiche boutique (super admin). Corps partiel : seules les clés présentes dans {@code payload} sont envoyées. */
export function updateStore(storeId, payload, logoFile) {
  const body = {};
  const keys = [
    "name",
    "phone",
    "contactEmail",
    "mapsUrl",
    "telegramId",
    "domain",
    "logoUrl",
    "active",
    "vitrineTemplate",
    "vitrineConfig",
  ];
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(payload, k)) {
      body[k] = payload[k];
    }
  }
  if (logoFile) {
    const fd = new FormData();
    fd.append("store", JSON.stringify(body));
    fd.append("logo", logoFile);
    return api.put(`/super/stores/${storeId}`, fd).then((r) => r.data);
  }
  return api.put(`/super/stores/${storeId}`, body).then((r) => r.data);
}

/** Suppression définitive d’une boutique et de ses données (commandes, catalogue, managers…). */
export function deleteStore(storeId) {
  return api.delete(`/super/stores/${storeId}`).then(() => undefined);
}

/** Commandes toutes boutiques ou filtre storeId. */
export function listSuperOrders({ page = 0, size = 20, storeId } = {}) {
  const params = { page, size, sort: "createdAt,desc" };
  if (storeId) params.storeId = storeId;
  return api.get("/super/orders", { params }).then((r) => r.data);
}

/** Produits toutes boutiques ou filtre. */
export function listSuperProducts({ page = 0, size = 20, storeId, search = "" } = {}) {
  const params = { page, size, sort: "id,desc", search: search || undefined };
  if (storeId) params.storeId = storeId;
  return api.get("/super/products", { params }).then((r) => r.data);
}

/** Liste des managers (toutes boutiques ou filtre serveur). */
export function listManagerUsers({ storeId, search = "" } = {}) {
  const params = {};
  if (storeId != null && storeId !== "") params.storeId = storeId;
  if (search && String(search).trim()) params.search = String(search).trim();
  return api.get("/super/manager-users", { params }).then((r) => r.data);
}

/** Création manager pour une boutique. */
export function createManagerUser(payload) {
  return api.post("/super/manager-users", payload).then((r) => r.data);
}

/** Détail d'un manager (super admin). */
export function getManagerUser(id) {
  return api.get(`/super/manager-users/${id}`).then((r) => r.data);
}

/** Mise à jour d'un manager (super admin). */
export function updateManagerUser(id, payload) {
  return api.put(`/super/manager-users/${id}`, payload).then((r) => r.data);
}

/** Suppression d'un compte manager (super admin). */
export function deleteManagerUser(id) {
  return api.delete(`/super/manager-users/${id}`).then(() => undefined);
}

export function exportSuperProductsCsv(storeId) {
  const params = {};
  if (storeId != null) params.storeId = storeId;
  return api
    .get("/super/products/export-csv", { params, responseType: "blob" })
    .then((response) => {
      const cd = response.headers["content-disposition"] || response.headers["Content-Disposition"];
      let filename = "products-all-stores.csv";
      if (cd) {
        const m = /filename\*?=(?:UTF-8'')?["']?([^"';]+)/i.exec(cd) || /filename="([^"]+)"/i.exec(cd);
        if (m) filename = decodeURIComponent(m[1].trim());
      }
      const url = URL.createObjectURL(response.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
}

export function importSuperProductsCsv(file, storeId) {
  const form = new FormData();
  form.append("file", file);
  const params = {};
  if (storeId != null) params.storeId = storeId;
  return api.post("/super/products/import-csv", form, { params }).then((r) => r.data);
}

/** Supprime tous les produits d’une boutique (super admin). `storeId` obligatoire. POST dédié (évite DELETE sur /api/products). */
export function clearSuperStoreProducts(storeId) {
  return api.post("/super/products/clear-catalog", {}, { params: { storeId } }).then((r) => r.data);
}

export function importSuperStoresCsv(file) {
  const form = new FormData();
  form.append("file", file);
  return api.post("/super/stores/import-csv", form).then((r) => r.data);
}

/** Export CSV toutes les boutiques (même format que l’import). */
export function exportSuperStoresCsv() {
  return api
    .get("/super/stores/export-csv", { responseType: "blob" })
    .then((response) => {
      const cd = response.headers["content-disposition"] || response.headers["Content-Disposition"];
      let filename = "stores-export.csv";
      if (cd) {
        const m = /filename\*?=(?:UTF-8'')?["']?([^"';]+)/i.exec(cd) || /filename="([^"]+)"/i.exec(cd);
        if (m) filename = decodeURIComponent(m[1].trim());
      }
      const url = URL.createObjectURL(response.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
}

/** Import boutiques depuis un Google Sheet (URL ou ID classeur ; gid optionnel). */
export function importSuperStoresFromGoogleSheets(spreadsheetId, sheetGid) {
  const params = { spreadsheetId: String(spreadsheetId).trim() };
  if (sheetGid != null && sheetGid !== "") params.sheetGid = Number(sheetGid);
  return api.post("/super/stores/import-sheets", {}, { params }).then((r) => r.data);
}

/** Paramètres Telegram plateforme (app_settings sans boutique). */
export function getSuperTelegramPlatformSettings() {
  return api.get("/super/settings/telegram-platform").then((r) => r.data);
}

export function updateSuperTelegramPlatformSettings(payload) {
  return api.put("/super/settings/telegram-platform", payload).then((r) => r.data);
}

export function getSuperApplicationSummary() {
  return api.get("/super/settings/application-summary").then((r) => r.data);
}

export function registerSuperTelegramWebhook() {
  return api.post("/super/settings/telegram/webhook/register").then((r) => r.data);
}

export function unregisterSuperTelegramWebhook() {
  return api.post("/super/settings/telegram/webhook/unregister").then((r) => r.data);
}

export function getSuperTelegramWebhookInfo() {
  return api.get("/super/settings/telegram/webhook/info").then((r) => r.data);
}

export function sendSuperTelegramTest(text) {
  return api.post("/super/settings/telegram/test", { text }).then((r) => r.data);
}
