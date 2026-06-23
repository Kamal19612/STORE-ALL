const DRAFT_PREFIX = "store_all_settings_draft:";

/**
 * Brouillon local (localStorage) pour ne pas perdre les champs saisis avant enregistrement ou redémarrage navigateur.
 */
export function loadSettingsDraft(scopeKey) {
  if (!scopeKey) return null;
  try {
    const raw = localStorage.getItem(`${DRAFT_PREFIX}${scopeKey}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed.data ?? parsed : null;
  } catch {
    return null;
  }
}

export function saveSettingsDraft(scopeKey, data) {
  if (!scopeKey || !data || typeof data !== "object") return;
  try {
    localStorage.setItem(
      `${DRAFT_PREFIX}${scopeKey}`,
      JSON.stringify({ savedAt: Date.now(), data }),
    );
  } catch {
    /* quota / mode privé */
  }
}

export function clearSettingsDraft(scopeKey) {
  if (!scopeKey) return;
  try {
    localStorage.removeItem(`${DRAFT_PREFIX}${scopeKey}`);
  } catch {
    /* ignore */
  }
}

/**
 * Fusionne le brouillon local : les champs non vides du brouillon complètent la réponse serveur.
 */
export function mergeSettingsWithDraft(serverMap, draftMap) {
  if (!draftMap || typeof draftMap !== "object") return serverMap ?? {};
  const merged = { ...(serverMap ?? {}) };
  for (const [key, value] of Object.entries(draftMap)) {
    if (value == null) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    merged[key] = value;
  }
  return merged;
}
