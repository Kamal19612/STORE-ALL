import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { Settings, Save, RefreshCw } from "lucide-react";
import {
  getSuperTelegramPlatformSettings,
  updateSuperTelegramPlatformSettings,
  getSuperApplicationSummary,
  sendSuperTelegramTest,
} from "../../../services/adminSupervisionService";

const inputCls =
  "w-full p-2 border border-gray-300 dark:border-white/10 rounded bg-white dark:bg-[#1c191a] text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-colors";
const labelCls = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";
const sectionTitleCls =
  "text-lg font-semibold text-gray-800 dark:text-white border-b border-gray-200 dark:border-white/10 pb-2";

export default function SuperAdminSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [telegramBotToken, setTelegramBotToken] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [appSummary, setAppSummary] = useState(null);
  const [telegramActionLoading, setTelegramActionLoading] = useState(false);
  const [telegramTestText, setTelegramTestText] = useState("Test Telegram (super admin)");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tg, summary] = await Promise.all([
        getSuperTelegramPlatformSettings(),
        getSuperApplicationSummary(),
      ]);
      setTelegramBotToken(tg.telegram_bot_token ?? "");
      setTelegramChatId(tg.telegram_chat_id ?? "");
      setAppSummary(summary);
    } catch (e) {
      toast.error(e.response?.data?.message || "Impossible de charger les paramètres plateforme.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaveTelegram = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSuperTelegramPlatformSettings({
        telegram_bot_token: telegramBotToken,
        telegram_chat_id: telegramChatId,
      });
      toast.success("Paramètres Telegram plateforme enregistrés. Webhook ré-enregistré côté serveur.");
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Échec de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTelegramActionLoading(true);
    try {
      await sendSuperTelegramTest(telegramTestText);
      toast.success("Message de test envoyé (chat ID plateforme ou résolution serveur).");
    } catch (err) {
      toast.error("Impossible d'envoyer le test Telegram.");
    } finally {
      setTelegramActionLoading(false);
    }
  };

  if (loading) {
    return <div className="p-4 sm:p-8 text-gray-600 dark:text-gray-300">Chargement…</div>;
  }

  return (
    <div className="p-2 sm:p-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-lg sm:text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <Settings className="w-7 h-7 text-primary shrink-0" />
          Paramètres plateforme
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
          Token bot et webhook Telegram au niveau plateforme. Les identifiants Telegram par boutique se gèrent lors de la{" "}
          <Link to="/admin/super/store-new" className="text-primary font-medium underline-offset-2 hover:underline">
            création / édition boutique
          </Link>
          .
        </p>
      </div>

      <div className="bg-white dark:bg-[#242021] rounded-lg shadow-md p-4 sm:p-6 space-y-8">
        <section>
          <h2 className={sectionTitleCls}>Gestion de l&apos;application</h2>
          {appSummary ? (
            <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-gray-200 dark:border-white/10 p-3">
                <dt className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Boutiques</dt>
                <dd className="text-lg font-semibold text-gray-900 dark:text-white">{String(appSummary.storeCount ?? "—")}</dd>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-white/10 p-3">
                <dt className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Code boutique par défaut</dt>
                <dd className="font-mono text-gray-900 dark:text-white">{appSummary.defaultStoreCode || "—"}</dd>
              </div>
              <div className="rounded-lg border border-blue-200/80 dark:border-blue-900/40 p-3 sm:col-span-2 bg-blue-50/40 dark:bg-blue-950/20">
                <dt className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase mb-2">Telegram (aperçu technique)</dt>
                <dd className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-blue-900 dark:text-blue-100 font-mono">
                  <span>URL webhook configurée : {appSummary.webhookUrlConfigured ? "oui" : "non"}</span>
                  <span>Secret webhook : {appSummary.webhookSecretConfigured ? "oui" : "non"}</span>
                  <span>Token présent : {appSummary.resolvedBotTokenPresent ? "oui" : "non"}</span>
                  <span>Chat ID défaut (plateforme) : {appSummary.resolvedChatIdPresent ? "oui" : "non"}</span>
                  <span>getMe OK : {appSummary.tokenHealthGetMe ? "oui" : "non"}</span>
                  <span>Boutiques avec chat dédié : {appSummary.storesWithOwnTelegramChat ?? "—"}</span>
                  <span>Boutiques sur chat défaut : {appSummary.storesUsingDefaultTelegramChat ?? "—"}</span>
                  <span>Boutiques sans chat résolu : {appSummary.storesWithoutTelegramChat ?? "—"}</span>
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-gray-500">Résumé indisponible.</p>
          )}
          <button
            type="button"
            onClick={load}
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            <RefreshCw className="w-4 h-4" />
            Actualiser le résumé
          </button>
        </section>

        <section>
          <h2 className={sectionTitleCls}>Telegram (plateforme)</h2>
          <form onSubmit={handleSaveTelegram} className="mt-4 space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 p-3 rounded-lg">
              <label className="block text-sm font-bold text-blue-800 dark:text-blue-300 mb-1">Bot token (plateforme)</label>
              <input
                type="password"
                value={telegramBotToken}
                onChange={(e) => setTelegramBotToken(e.target.value)}
                placeholder="123456789:AAE…"
                autoComplete="off"
                className={`${inputCls} font-mono border-blue-300 dark:border-blue-700`}
              />
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                Bot commun à toutes les boutiques (clé <code className="text-[10px]">telegram_bot_token</code>). Surcharge optionnelle par boutique dans les paramètres manager.
              </p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 p-3 rounded-lg">
              <label className="block text-sm font-bold text-blue-800 dark:text-blue-300 mb-1">Chat ID tests / défaut (plateforme)</label>
              <input
                type="text"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                placeholder="Ex. 5654423490"
                className={`${inputCls} font-mono border-blue-300 dark:border-blue-700`}
              />
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                Chat de secours si une boutique n&apos;a pas d&apos;ID Telegram propre (fiche boutique ou surcharge manager). Tests super admin sans contexte boutique.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg font-bold text-sm disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? "Enregistrement…" : "Enregistrer Telegram"}
              </button>
            </div>
          </form>

          <div className="mt-6 space-y-3 bg-amber-50/50 dark:bg-amber-950/15 border border-amber-200/80 dark:border-amber-900/40 rounded-lg p-4">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Webhook Telegram</p>
            <p className="text-xs text-amber-900/80 dark:text-amber-100/90">
              Envoi d&apos;un message de test vers le chat configuré (plateforme ou résolution serveur).
            </p>
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
              <div className="flex-1">
                <label className={labelCls}>Texte du message de test</label>
                <input
                  type="text"
                  value={telegramTestText}
                  onChange={(e) => setTelegramTestText(e.target.value)}
                  className={`${inputCls} font-mono text-sm`}
                />
              </div>
              <button
                type="button"
                disabled={telegramActionLoading}
                onClick={handleTest}
                className="sm:self-end inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold text-sm disabled:opacity-50"
              >
                Envoyer test
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
