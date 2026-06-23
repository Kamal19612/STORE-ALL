import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import {
  getAdminSettings,
  updateSettings,
  syncProducts,
  getTelegramWebhookInfo,
  sendTelegramTest,
} from "../../services/api";
import { Save, Settings, CheckCircle, RefreshCw } from "lucide-react";
import useAuthStore from "../../store/authStore";
import {
  clearSettingsDraft,
  loadSettingsDraft,
  mergeSettingsWithDraft,
  saveSettingsDraft,
} from "../../utils/settingsDraftStorage";

const inputCls =
  "w-full p-2 border border-gray-300 dark:border-white/10 rounded bg-white dark:bg-[#1c191a] text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-colors";
const labelCls = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";
const smallLabelCls = "block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1";
const sectionTitleCls =
  "text-lg font-semibold text-gray-800 dark:text-white border-b border-gray-200 dark:border-white/10 pb-2";

const AdminSettings = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  /** Espace manager : ne montrer que la section « Réseaux Sociaux & Divers » (pas tarifs, Sheets, coordonnées…). */
  const isManagerStoreSettings = pathname.startsWith("/manager/");

  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [telegramInfoLoading, setTelegramInfoLoading] = useState(false);
  const [telegramActionLoading, setTelegramActionLoading] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState("");
  const [telegramTestText, setTelegramTestText] = useState("Test Telegram OK");

  const scopeStoreId = user?.storeId;

  useEffect(() => {
    if (user?.role === "SUPER_ADMIN") {
      navigate("/admin/super/orders", { replace: true });
      return;
    }
    if (user?.role !== "MANAGER") {
      navigate("/login", { replace: true });
      return;
    }
    if (scopeStoreId == null) {
      toast.error("Compte sans boutique : impossible de charger les paramètres.");
      navigate("/login", { replace: true });
      return;
    }
    fetchSettings();
  }, [user, navigate, scopeStoreId]);

  const fetchSettings = async () => {
    if (scopeStoreId == null) return;
    try {
      const response = await getAdminSettings(scopeStoreId);
      const settingsMap = {};
      response.data.forEach((s) => {
        settingsMap[s.key] = s.value;
      });
      const draft = loadSettingsDraft(`manager_settings_${scopeStoreId}`);
      const merged = mergeSettingsWithDraft(settingsMap, draft);
      if (merged.telegram_bot_token) {
        merged.telegram_bot_token_configured = "true";
      }
      setSettings(merged);
    } catch (error) {
      console.error("Erreur chargement paramètres:", error);
      toast.error("Impossible de charger les paramètres.");
    } finally {
      setLoading(false);
    }
  };

  const handleSyncNow = async () => {
    if (scopeStoreId == null) return;
    setSyncLoading(true);
    try {
      await syncProducts(scopeStoreId);
      toast.success("Synchronisation terminée avec succès !");
    } catch (error) {
      console.error("Erreur synchro:", error);
      toast.error("Erreur lors de la synchronisation.");
    } finally {
      setSyncLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Extraction automatique de l'ID depuis une URL Google Sheets complète
    if (name === "google_sheet_id") {
      const match = value.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      setSettings((prev) => {
        const next = { ...prev, [name]: match ? match[1] : value };
        if (scopeStoreId != null) saveSettingsDraft(`manager_settings_${scopeStoreId}`, next);
        return next;
      });
      return;
    }
    setSettings((prev) => {
      const next = { ...prev, [name]: value };
      if (scopeStoreId != null) saveSettingsDraft(`manager_settings_${scopeStoreId}`, next);
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (scopeStoreId == null) return;
    setSaving(true);
    try {
      await updateSettings(settings, scopeStoreId);
      clearSettingsDraft(`manager_settings_${scopeStoreId}`);
      toast.success("Paramètres mis à jour avec succès !");
      await fetchSettings();
    } catch (error) {
      console.error("Erreur sauvegarde:", error);
      toast.error("Erreur lors de la sauvegarde.");
    } finally {
      setSaving(false);
    }
  };

  const handleTelegramWebhookInfo = async () => {
    if (scopeStoreId == null) return;
    setTelegramInfoLoading(true);
    try {
      const res = await getTelegramWebhookInfo(scopeStoreId);
      const raw = typeof res?.data === "string" ? res.data : JSON.stringify(res?.data, null, 2);
      setTelegramStatus(raw);
      toast.success("Statut webhook Telegram mis à jour.");
    } catch (error) {
      console.error("Erreur webhook info Telegram:", error);
      toast.error("Impossible de récupérer le statut du webhook Telegram.");
    } finally {
      setTelegramInfoLoading(false);
    }
  };

  const handleTelegramTest = async () => {
    if (scopeStoreId == null) return;
    setTelegramActionLoading(true);
    try {
      await sendTelegramTest(telegramTestText, scopeStoreId);
      toast.success("Message de test envoyé sur Telegram.");
    } catch (error) {
      console.error("Erreur test Telegram:", error);
      toast.error("Impossible d'envoyer le message de test Telegram.");
    } finally {
      setTelegramActionLoading(false);
    }
  };

  if (loading) return <div className="p-4 sm:p-8 text-gray-600 dark:text-gray-300">Chargement...</div>;

  return (
    <div className="p-3 sm:p-6">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white mb-5 sm:mb-6 flex items-center gap-2">
        <Settings className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
        {isManagerStoreSettings ? "Réseaux sociaux & divers" : "Paramètres de l'application"}
      </h1>

      <div
        className={`bg-white dark:bg-[#242021] rounded-lg shadow-md p-4 sm:p-6 ${isManagerStoreSettings ? "max-w-xl" : "max-w-4xl"}`}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className={`grid gap-4 sm:gap-6 ${isManagerStoreSettings ? "" : "md:grid-cols-2"}`}>

            {/* Section Contact — masquée pour le manager (réservé au parcours admin / plateforme). */}
            {!isManagerStoreSettings && (
            <div className="space-y-4">
              <h2 className={sectionTitleCls}>Coordonnées & Informations</h2>

              <div>
                <label className={labelCls}>Nom de la boutique</label>
                <input type="text" name="store_name" value={settings.store_name || ""} onChange={handleChange} placeholder="STORE" className={`${inputCls} font-bold`} />
              </div>

              <div>
                <label className={labelCls}>Numéro WhatsApp (Commandes)</label>
                <input type="text" name="whatsapp_number" value={settings.whatsapp_number || ""} onChange={handleChange} placeholder="226XXXXXXXX" className={`${inputCls} font-mono`} />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Format international sans + (ex: 22670123456)</p>
              </div>

              <div>
                <label className={labelCls}>Indicatif par défaut (Checkout)</label>
                <input
                  type="text"
                  name="customer_whatsapp_dial_code"
                  value={settings.customer_whatsapp_dial_code || ""}
                  onChange={handleChange}
                  placeholder="+226"
                  className={`${inputCls} font-mono`}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Pré-rempli dans le champ &quot;Numéro WhatsApp&quot; du checkout (ex: +226, +225).
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 p-3 rounded-lg">
                <label className="block text-sm font-bold text-blue-800 dark:text-blue-300 mb-1 flex items-center gap-1">
                  Telegram Bot Token
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-200 text-blue-700 text-[10px] font-bold" title="Token du bot Telegram">i</span>
                </label>
                <input
                  type="password"
                  name="telegram_bot_token"
                  value={settings.telegram_bot_token || ""}
                  onChange={handleChange}
                  placeholder={
                    settings.telegram_bot_token_configured === "true" && !settings.telegram_bot_token
                      ? "•••••••• (déjà enregistré — laissez vide pour conserver)"
                      : "Ex: 123456789:AAE..."
                  }
                  className={`${inputCls} font-mono border-blue-300 dark:border-blue-700`}
                  autoComplete="off"
                />
                <div className="text-xs text-blue-600 dark:text-blue-400 mt-2 space-y-1">
                  <p>
                    Laissez vide pour utiliser le bot commun (paramètres plateforme). Renseignez seulement pour surcharger
                    cette boutique.
                  </p>
                  {settings.telegram_bot_token_configured === "true" ? (
                    <p className="font-semibold text-emerald-700 dark:text-emerald-300">
                      Token boutique déjà enregistré — conservé après redémarrage.
                    </p>
                  ) : null}
                  <p className="font-semibold">Comment obtenir le token ?</p>
                  <ol className="list-decimal ml-4 pl-1">
                    <li>Ouvrez Telegram</li>
                    <li>Cherchez le bot <strong>@BotFather</strong></li>
                    <li>Envoyez <code>/newbot</code> puis suivez les étapes</li>
                    <li>Copiez le token (format <code>123456:ABC...</code>) et collez-le ici.</li>
                  </ol>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 p-3 rounded-lg">
                <label className="block text-sm font-bold text-blue-800 dark:text-blue-300 mb-1 flex items-center gap-1">
                  Telegram Chat ID
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-200 text-blue-700 text-[10px] font-bold" title="Identifiant du bot Telegram">i</span>
                </label>
                <input type="text" name="telegram_chat_id" value={settings.telegram_chat_id || ""} onChange={handleChange} placeholder="Ex: 5654423490" className={`${inputCls} font-mono border-blue-300 dark:border-blue-700`} />
                <div className="text-xs text-blue-600 dark:text-blue-400 mt-2 space-y-1">
                  <p>
                    Surcharge optionnelle pour cette boutique. Sinon : ID Telegram de la fiche boutique, puis chat ID
                    défaut plateforme (paramètres super admin).
                  </p>
                  <p className="font-semibold">Comment trouver votre ID ?</p>
                  <ol className="list-decimal ml-4 pl-1">
                    <li>Ouvrez Telegram</li>
                    <li>Cherchez le bot <strong>@userinfobot</strong></li>
                    <li>Envoyez lui le message <code>/start</code></li>
                    <li>Copiez l'ID (suite de chiffres) et collez-le ici.</li>
                  </ol>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 p-3 rounded-lg flex flex-col gap-2">
                <div className="text-xs text-blue-700 dark:text-blue-300">
                  <p className="font-semibold">Webhook Telegram</p>
                  <p>
                    Le webhook est <strong>toujours actif</strong> (enregistrement automatique côté serveur).
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    disabled={telegramInfoLoading}
                    onClick={handleTelegramWebhookInfo}
                    className="flex-1 flex items-center justify-center gap-2 bg-white/80 hover:bg-white text-blue-700 border border-blue-200 px-4 py-2 rounded-lg font-bold transition-colors disabled:opacity-50 text-sm dark:bg-blue-950/20 dark:hover:bg-blue-950/30 dark:text-blue-200 dark:border-blue-800/30"
                  >
                    <CheckCircle className={`w-4 h-4 ${telegramInfoLoading ? "animate-pulse" : ""}`} />
                    {telegramInfoLoading ? "Lecture..." : "Voir le statut"}
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <button
                    type="button"
                    disabled={telegramActionLoading}
                    onClick={handleTelegramTest}
                    className="flex-1 flex items-center justify-center gap-2 bg-white/80 hover:bg-white text-green-700 border border-green-200 px-4 py-2 rounded-lg font-bold transition-colors disabled:opacity-50 text-sm dark:bg-green-950/10 dark:hover:bg-green-950/20 dark:text-green-200 dark:border-green-900/30"
                  >
                    Envoyer test
                  </button>
                </div>

                <input
                  type="text"
                  value={telegramTestText}
                  onChange={(e) => setTelegramTestText(e.target.value)}
                  placeholder="Texte du message de test"
                  className={`${inputCls} font-mono border-blue-300 dark:border-blue-700`}
                />

                {telegramStatus ? (
                  <pre className="text-[11px] leading-snug whitespace-pre-wrap break-words bg-white/60 dark:bg-black/20 border border-blue-200 dark:border-blue-800/30 rounded p-2 text-blue-900 dark:text-blue-100 max-h-56 overflow-auto">
                    {telegramStatus}
                  </pre>
                ) : null}
              </div>

              <div>
                <label className={labelCls}>Numéro de téléphone</label>
                <input type="text" name="contact_phone" value={settings.contact_phone || ""} onChange={handleChange} placeholder="+225 07..." className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Email de contact</label>
                <input type="email" name="contact_email" value={settings.contact_email || ""} onChange={handleChange} placeholder="contact@example.com" className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Adresse physique</label>
                <textarea name="contact_address" value={settings.contact_address || ""} onChange={handleChange} rows="3" className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Localisation Google Maps (Lien ou Coordonnées)</label>
                <input type="text" name="store_location" value={settings.store_location || ""} onChange={handleChange} placeholder="ex: 12.371, -1.519 ou lien maps" className={`${inputCls} font-mono`} />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Utilisé pour le bouton "Y aller" des livreurs.</p>
              </div>
            </div>
            )}

            {/* Réseaux sociaux & divers ; tarification livraison masquée pour le manager. */}
            <div className="space-y-4">
              <h2 className={sectionTitleCls}>Réseaux Sociaux & Divers</h2>

              <div>
                <label className={labelCls}>Lien Facebook</label>
                <input type="text" name="social_facebook" value={settings.social_facebook || ""} onChange={handleChange} placeholder="https://facebook.com/..." className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Lien Instagram</label>
                <input type="text" name="social_instagram" value={settings.social_instagram || ""} onChange={handleChange} placeholder="https://instagram.com/..." className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Texte Copyright (Pied de page)</label>
                <input type="text" name="footer_copyright" value={settings.footer_copyright || ""} onChange={handleChange} placeholder="Tous droits réservés." className={inputCls} />
              </div>

              {!isManagerStoreSettings && (
              <>
              {/* Tarification Livraison */}
              <div className="pt-4 space-y-4">
                <h2 className={sectionTitleCls}>Tarification Livraison</h2>

                <div className="space-y-4 bg-gray-50 dark:bg-[#1c191a] p-4 rounded-lg border border-gray-200 dark:border-white/10">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className={smallLabelCls}>Zone 1 max (km)</label>
                      <input type="number" name="dist_tier_1_limit" value={settings.dist_tier_1_limit || "5"} onChange={handleChange} className={inputCls} />
                    </div>
                    <div>
                      <label className={smallLabelCls}>Prix Zone 1 (FCFA)</label>
                      <input type="number" name="dist_tier_1_price" value={settings.dist_tier_1_price || "1000"} onChange={handleChange} className={`${inputCls} font-bold text-primary`} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className={smallLabelCls}>Zone 2 max (km)</label>
                      <input type="number" name="dist_tier_2_limit" value={settings.dist_tier_2_limit || "10"} onChange={handleChange} className={inputCls} />
                    </div>
                    <div>
                      <label className={smallLabelCls}>Prix Zone 2 (FCFA)</label>
                      <input type="number" name="dist_tier_2_price" value={settings.dist_tier_2_price || "2000"} onChange={handleChange} className={`${inputCls} font-bold text-primary`} />
                    </div>
                  </div>

                  <div>
                    <label className={smallLabelCls}>Prix Hors Zone / Zone 3 (FCFA)</label>
                    <input type="number" name="dist_tier_3_price" value={settings.dist_tier_3_price || "3500"} onChange={handleChange} className={`${inputCls} font-bold text-primary`} />
                  </div>

                  <div>
                    <label className={smallLabelCls}>Achat min. livraison gratuite (Optionnel)</label>
                    <input type="number" name="min_order_free_delivery" value={settings.min_order_free_delivery || ""} onChange={handleChange} placeholder="Ex: 50000" className={inputCls} />
                  </div>

                  <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 border-t border-gray-200 dark:border-white/10">
                    <div>
                      <label className={smallLabelCls}>Supplément Express (FCFA)</label>
                      <input type="number" name="express_surcharge" value={settings.express_surcharge || "1000"} onChange={handleChange} className={`${inputCls} font-bold text-orange-600`} />
                    </div>
                    <div>
                      <label className={smallLabelCls}>Supplément Programmé (FCFA)</label>
                      <input type="number" name="scheduled_surcharge" value={settings.scheduled_surcharge || "500"} onChange={handleChange} className={`${inputCls} font-bold text-blue-600`} />
                    </div>
                  </div>
                </div>
              </div>
              </>
              )}
            </div>
          </div>

          {!isManagerStoreSettings && (
          <div className="mt-6 rounded-xl border border-emerald-200/80 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/25 p-4 sm:p-6 space-y-4">
            <h2 className={sectionTitleCls}>Google Sheets — catalogue produits</h2>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              Partagez le classeur Google avec l’adresse <strong className="font-mono text-emerald-800 dark:text-emerald-300">client_email</strong> du fichier
              credentials du serveur (rôle <strong>Lecteur</strong>). Activez l’API <strong>Google Sheets</strong> sur le projet Google Cloud du compte de service.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className={labelCls}>ID ou URL du Google Sheet (produits)</label>
                <input
                  type="text"
                  name="google_sheet_id"
                  value={settings.google_sheet_id || ""}
                  onChange={handleChange}
                  placeholder="ID du classeur ou https://docs.google.com/spreadsheets/d/…"
                  className={`${inputCls} font-mono text-sm`}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Utilisé par « Synchroniser maintenant » et par la synchro planifiée (selon la config serveur).
                </p>
              </div>
              <div>
                <label className={labelCls}>GID de l’onglet (optionnel)</label>
                <input
                  type="text"
                  name="google_sheet_gid"
                  value={settings.google_sheet_gid || ""}
                  onChange={handleChange}
                  placeholder="Ex. 0 (paramètre gid dans l’URL du sheet)"
                  className={`${inputCls} font-mono text-sm`}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Utile si l’export CSV public doit cibler un onglet précis.
                </p>
              </div>
              <div className="flex flex-col justify-end">
                <label className={`${labelCls} flex items-center gap-2 cursor-pointer`}>
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 dark:border-white/20"
                    checked={settings.google_sheet_sync_enabled !== "false"}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        google_sheet_sync_enabled: e.target.checked ? "true" : "false",
                      }))
                    }
                  />
                  Synchro automatique activée
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Si décoché, la tâche planifiée côté serveur ignore cette boutique (clé <code className="text-[10px]">google_sheet_sync_enabled=false</code>). Sinon, synchro automatique environ chaque minute (intervalle serveur&nbsp;: <code className="text-[10px]">google.sheets.sync-rate</code>).
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2 border-t border-emerald-200/60 dark:border-emerald-900/30">
              <button
                type="button"
                disabled={syncLoading || !settings.google_sheet_id?.trim()}
                title={!settings.google_sheet_id?.trim() ? "Enregistrez d’abord un ID de classeur" : undefined}
                onClick={handleSyncNow}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 ${syncLoading ? "animate-spin" : ""}`} />
                {syncLoading ? "Synchronisation…" : "Synchroniser maintenant"}
              </button>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Enregistrez les modifications si vous venez de modifier l’ID, puis lancez la synchro (ou rechargez la page après sauvegarde).
              </p>
            </div>
          </div>
          )}

          <div className="pt-4 border-t border-gray-200 dark:border-white/10 flex flex-col sm:flex-row sm:justify-end gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white px-6 py-2.5 rounded-lg font-bold transition-colors disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {saving ? "Sauvegarde..." : "Enregistrer les modifications"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminSettings;
