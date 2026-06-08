import { useState, useEffect } from "react";
import { Link as LinkIcon, X, Check, AlertCircle } from "lucide-react";
import { toast } from "react-toastify";
import { importSuperStoresFromGoogleSheets } from "../../services/adminSupervisionService";

/**
 * Import multi-boutiques depuis un Google Sheet (colonnes code, name/nom, etc.).
 * N’utilise pas l’ID feuille produits en base.
 */
export default function ImportStoresSheetModal({ isOpen, onClose, onSuccess }) {
  const [url, setUrl] = useState("");
  const [gid, setGid] = useState("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setUrl("");
    setGid("");
    setSummary(null);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleImport = async () => {
    if (!url.trim()) {
      toast.error("Collez le lien ou l’ID du Google Sheet.");
      return;
    }
    let spreadsheetId = url.trim();
    const idMatch = spreadsheetId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (idMatch && idMatch[1]) spreadsheetId = idMatch[1];
    const gidMatch = url.match(/[?&#]gid=(\d+)/);
    const gidFromUrl = gidMatch && gidMatch[1] ? gidMatch[1] : null;
    const sheetGid = gid.trim() ? gid.trim() : gidFromUrl;

    setLoading(true);
    setSummary(null);
    try {
      const result = await importSuperStoresFromGoogleSheets(
        spreadsheetId,
        sheetGid || undefined,
      );
      setSummary(result);
      const ok = (result.successCount ?? 0) > 0;
      if (ok) {
        toast.success(`${result.successCount ?? 0} boutique(s) importée(s) ou mise(s) à jour.`);
        onSuccess?.();
      } else if ((result.failureCount ?? 0) > 0) {
        const first = result.errorMessages?.[0];
        toast.warn(first ? `Aucune ligne OK. ${first}` : "Aucune ligne importée.");
      } else {
        toast.info("Import terminé (aucune ligne traitée ?).");
      }
    } catch (e) {
      toast.error(e.response?.data?.message || "Erreur import Google Sheet.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setUrl("");
    setGid("");
    setSummary(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#242021] rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-100 dark:border-white/10">
        <div className="p-5 border-b border-gray-100 dark:border-white/10 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Google Sheets — boutiques
          </h2>
          <button
            type="button"
            onClick={reset}
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">
          {!summary ? (
            <>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Feuille avec en-tête <strong>code</strong> et <strong>name</strong> (ou <strong>nom</strong>), optionnel : phone, contact_email, maps_url, telegram_id, domain. Les codes existants sont mis à jour.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Lien ou ID du classeur
                  </label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/…"
                      className="w-full pl-9 pr-3 py-2.5 border border-gray-200 dark:border-white/20 rounded-xl bg-white dark:bg-[#1c191a] text-gray-900 dark:text-white text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    GID onglet (optionnel)
                  </label>
                  <input
                    type="text"
                    value={gid}
                    onChange={(e) => setGid(e.target.value)}
                    placeholder="Ex. 0 — sinon 1er onglet ou gid dans l’URL"
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-white/20 rounded-xl bg-white dark:bg-[#1c191a] text-gray-900 dark:text-white text-sm"
                  />
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  Partage « lecteur avec le lien » ou accès compte de service Google du backend sur le classeur.
                </p>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-100 dark:border-green-900/30 flex items-start gap-3">
                <Check className="h-6 w-6 text-green-600 shrink-0 mt-0.5" />
                <div className="text-sm text-green-800 dark:text-green-300">
                  <p className="font-bold mb-1">Import terminé</p>
                  <p>Succès : {summary.successCount ?? 0}</p>
                  <p>Erreurs : {summary.failureCount ?? summary.errorCount ?? 0}</p>
                </div>
              </div>
              {(summary.failureCount > 0 || (summary.errorMessages?.length ?? 0) > 0) && (
                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-100 dark:border-red-900/30">
                  <div className="flex items-center gap-2 text-red-800 dark:text-red-300 font-semibold text-sm mb-2">
                    <AlertCircle className="h-4 w-4" />
                    Détail
                  </div>
                  <div className="max-h-28 overflow-y-auto text-xs text-red-700 dark:text-red-400 space-y-1">
                    {(summary.errorMessages || []).map((msg, i) => (
                      <div key={i}>{msg}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-5 border-t border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-[#1c191a] flex justify-end gap-2">
          {!summary ? (
            <>
              <button
                type="button"
                onClick={reset}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={loading || !url.trim()}
                onClick={handleImport}
                className="px-5 py-2 rounded-lg bg-[#f5ad41] text-[#242021] text-sm font-semibold disabled:opacity-50"
              >
                {loading ? "Import…" : "Importer"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={reset}
              className="px-5 py-2 rounded-lg bg-gray-800 text-white text-sm font-semibold"
            >
              Fermer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
