import { useState, useEffect } from "react";
import {
  Upload,
  Link as LinkIcon,
  FileText,
  X,
  Check,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { toast } from "react-toastify";
import adminProductService from "../../services/adminProductService";
import useAuthStore from "../../store/authStore";

/**
 * @param {object} props
 * @param {boolean} props.isOpen
 * @param {() => void} props.onClose
 * @param {() => void} [props.onSuccess]
 * @param {number|string} [props.managerStoreId] — boutique explicite (ex. super admin)
 * @param {"full"|"sheetsOnly"} [props.variant]
 */
const ImportProductModal = ({
  isOpen,
  onClose,
  onSuccess,
  managerStoreId,
  variant = "full",
}) => {
  const sheetsOnly = variant === "sheetsOnly";
  const [activeTab, setActiveTab] = useState("file"); // 'file' or 'url'
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [serviceAccountEmail, setServiceAccountEmail] = useState(null);

  const resolveManagerStoreId = () => {
    if (managerStoreId != null && managerStoreId !== "") {
      const n = Number(managerStoreId);
      if (Number.isFinite(n)) return n;
    }
    const uid = useAuthStore.getState().user?.storeId;
    if (uid != null && uid !== "") {
      const n = Number(uid);
      if (Number.isFinite(n)) return n;
    }
    return null;
  };

  useEffect(() => {
    if (!isOpen) return;
    setFile(null);
    setUrl("");
    setSummary(null);
    setServiceAccountEmail(null);
    setActiveTab(sheetsOnly ? "url" : "file");

    const sid = resolveManagerStoreId();
    if (sid == null) return;
    adminProductService
      .getSheetConfig(sid)
      .then((cfg) => {
        if (cfg?.serviceAccountEmail) {
          setServiceAccountEmail(cfg.serviceAccountEmail);
        }
      })
      .catch(() => {});
  }, [isOpen, sheetsOnly, managerStoreId]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUrlChange = (e) => {
    setUrl(e.target.value);
  };

  const applySheetResultToasts = (result) => {
    if (result.successCount > 0) {
      toast.success(
        `${result.successCount} produit(s) importé(s) depuis Google Sheets.`,
      );
      onSuccess?.();
    } else if (result.failureCount > 0) {
      const firstErr =
        result.errorMessages && result.errorMessages[0]
          ? ` ${result.errorMessages[0]}`
          : "";
      toast.warn(`Aucun produit importé.${firstErr}`);
    }
  };

  const handleSyncFromSettings = async () => {
    const sid = resolveManagerStoreId();
    if (sid == null) {
      toast.error("Identifiant boutique manquant. Sélectionnez une boutique.");
      return;
    }
    setLoading(true);
    setSummary(null);
    try {
      const result = await adminProductService.syncGoogleSheet(sid);
      setSummary(result);
      applySheetResultToasts(result);
    } catch (error) {
      console.error(error);
      toast.error(
        error.response?.data?.message || "Erreur synchronisation Google Sheets.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    setLoading(true);
    setSummary(null);
    try {
      const sid = resolveManagerStoreId();
      const isUrl = activeTab === "url" || sheetsOnly;

      if (isUrl) {
        if (!url.trim()) {
          toast.error("Collez le lien ou l’ID du Google Sheet.");
          setLoading(false);
          return;
        }
        if (sid == null) {
          toast.error("Identifiant boutique manquant. Sélectionnez une boutique.");
          setLoading(false);
          return;
        }
        let spreadsheetId = url.trim();
        const idMatch = spreadsheetId.match(
          /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
        );
        if (idMatch && idMatch[1]) {
          spreadsheetId = idMatch[1];
        }
        const gidMatch = url.match(/[?&#]gid=(\d+)/);
        const sheetGid = gidMatch && gidMatch[1] ? gidMatch[1] : undefined;

        const result = await adminProductService.importFromGoogleSheets(
          spreadsheetId,
          sheetGid,
          sid,
        );
        setSummary(result);
        applySheetResultToasts(result);
        setLoading(false);
        return;
      }

      if (!file) {
        toast.error("Veuillez sélectionner un fichier ou une URL.");
        setLoading(false);
        return;
      }
      if (sid == null) {
        toast.error("Identifiant boutique manquant.");
        setLoading(false);
        return;
      }

      const result = await adminProductService.importProducts(file, sid);
      setSummary(result);

      if (result.successCount > 0) {
        toast.success(`${result.successCount} produits importés avec succès !`);
        onSuccess?.();
      } else if (result.failureCount > 0) {
        toast.warn("Aucun produit importé. Vérifiez le format.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de l'importation.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setUrl("");
    setSummary(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#242021] rounded-2xl shadow-xl w-full max-w-lg overflow-hidden transition-colors border border-gray-100 dark:border-white/10">
        <div className="p-6 border-b border-gray-100 dark:border-white/10 flex justify-between items-center">
          <h2 className="text-xl font-bold text-secondary dark:text-white">
            {sheetsOnly ? "Google Sheets — catalogue" : "Importer des Produits"}
          </h2>
          <button
            onClick={reset}
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full dark:text-gray-400"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {!summary ? (
            <>
              {!sheetsOnly && (
                <div className="flex gap-4 mb-6 border-b border-gray-100 dark:border-white/10">
                  <button
                    type="button"
                    className={`pb-2 px-4 font-medium transition-colors border-b-2 ${activeTab === "file" ? "border-primary text-primary" : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"}`}
                    onClick={() => setActiveTab("file")}
                  >
                    Fichier CSV
                  </button>
                  <button
                    type="button"
                    className={`pb-2 px-4 font-medium transition-colors border-b-2 ${activeTab === "url" ? "border-primary text-primary" : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"}`}
                    onClick={() => setActiveTab("url")}
                  >
                    Google Sheet (Public)
                  </button>
                </div>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                {sheetsOnly ? (
                  <>
                    Import pour <strong>une boutique</strong> (celle sélectionnée sur la page).{" "}
                    <strong>Synchro (réglages)</strong> utilise l’ID de feuille enregistré dans les paramètres de cette boutique.{" "}
                    Sinon collez une URL / ID de classeur public.
                  </>
                ) : (
                  <>
                    CSV / Sheet : si les lignes ont un <strong>ID externe</strong>, les produits actifs de la boutique qui ne figurent plus dans le fichier sont{" "}
                    <strong>désactivés</strong> (comme une suppression douce). Export CSV depuis la liste produits pour récupérer le même format.
                  </>
                )}
              </p>

              {/* Content */}
              <div className="min-h-[150px]">
                {!sheetsOnly && activeTab === "file" ? (
                  <label
                    htmlFor="csv-file-input"
                    className={`border-2 border-dashed border-gray-200 dark:border-white/20 rounded-xl p-8 flex flex-col items-center justify-center text-center transition-colors ${!file ? "hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer" : ""}`}
                  >
                    <Upload className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-4" />
                    {file ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium">
                          <FileText className="h-5 w-5" />
                          {file.name}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setFile(null);
                          }}
                          className="text-sm text-red-500 hover:text-red-700 underline"
                        >
                          Changer de fichier
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="text-gray-600 dark:text-gray-300 font-medium">
                          Glissez votre CSV ici ou cliquez
                        </p>
                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                          Format: Nom, Catégorie, Prix, Image, Description
                        </p>
                      </>
                    )}
                    <input
                      id="csv-file-input"
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      className="hidden"
                      disabled={file !== null}
                    />
                  </label>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                        Lien Google Sheet (Public)
                      </label>
                      <div className="relative">
                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="url"
                          value={url}
                          onChange={handleUrlChange}
                          placeholder="https://docs.google.com/spreadsheets/d/..."
                          className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-white/20 rounded-xl focus:ring-2 focus:ring-primary outline-none bg-white dark:bg-[#1c191a] dark:text-white"
                        />
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                        Assurez-vous que le lien est accessible ("Tous les
                        utilisateurs disposant du lien").
                      </p>
                      {serviceAccountEmail ? (
                        <div className="mt-3 rounded-lg border border-blue-200 dark:border-blue-800/50 bg-blue-50/80 dark:bg-blue-950/30 px-3 py-2">
                          <p className="text-xs text-blue-800 dark:text-blue-200 font-medium">
                            Compte de service Google — ajoutez-le en{" "}
                            <strong>Lecteur</strong> sur votre Sheet :
                          </p>
                          <p className="mt-1 text-xs font-mono text-blue-900 dark:text-blue-100 break-all select-all">
                            {serviceAccountEmail}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-semibold">
                          💡 Ajoutez l&apos;email du compte de service Google configuré sur le backend en &quot;Lecteur&quot; sur votre Sheet (sinon l&apos;API ne pourra pas lire le fichier).
                          <br />
                          📄 Colonne optionnelle <strong>PDF</strong> ou <strong>PDF modèle</strong> : URL vers un PDF AcroForm (Google Drive en partage public, ou lien direct).
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-100 dark:border-green-900/30 flex items-center gap-4">
                <div className="bg-green-100 dark:bg-green-900/40 p-2 rounded-full text-green-600 dark:text-green-400">
                  <Check className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-bold text-green-800 dark:text-green-300">
                    Importation terminée
                  </p>
                  <div className="text-green-600 dark:text-green-400 text-sm grid grid-cols-2 gap-x-4">
                    <span>Traités : {summary.totalProcessed}</span>
                    <span>
                      Succès :{" "}
                      {summary.successCount != null
                        ? summary.successCount
                        : summary.createdCount + summary.updatedCount}
                    </span>
                    <span>Créés : {summary.createdCount}</span>
                    <span>Mis à jour : {summary.updatedCount}</span>
                    {summary.deactivatedCount > 0 && (
                      <span className="text-orange-600">Désactivés : {summary.deactivatedCount}</span>
                    )}
                  </div>
                </div>
              </div>

              {summary.failureCount > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-900/30">
                  <div className="flex items-center gap-2 mb-2 text-red-800 dark:text-red-300 font-bold">
                    <AlertCircle className="h-5 w-5" />
                    {summary.failureCount} Erreurs
                  </div>
                  <div className="max-h-32 overflow-y-auto text-xs text-red-600 dark:text-red-400 space-y-1 bg-white dark:bg-[#1c191a] p-2 rounded border border-red-100 dark:border-red-900/30">
                    {(summary.errorMessages || []).map((msg, i) => (
                      <div key={i}>{msg}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-[#242021] flex flex-wrap justify-end gap-3 rounded-b-2xl">
          {!summary ? (
            <>
              <button
                type="button"
                onClick={reset}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-colors"
              >
                Annuler
              </button>
              {sheetsOnly && (
                <button
                  type="button"
                  onClick={handleSyncFromSettings}
                  disabled={loading || resolveManagerStoreId() == null}
                  title={
                    resolveManagerStoreId() == null
                      ? "Sélectionnez une boutique"
                      : "Utilise google_sheet_id des paramètres de la boutique"
                  }
                  className="px-4 py-2 rounded-lg border border-gray-200 dark:border-white/15 bg-white/70 dark:bg-white/5 text-gray-800 dark:text-gray-100 font-semibold hover:bg-white dark:hover:bg-white/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  {loading ? (
                    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Synchro (réglages)
                </button>
              )}
              <button
                type="button"
                onClick={handleImport}
                disabled={
                  loading ||
                  (sheetsOnly ? !url.trim() : !file && !url.trim())
                }
                className="px-6 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading && (
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                )}
                {sheetsOnly ? "Importer ce classeur" : "Lancer l'import"}
              </button>
            </>
          ) : (
            <button
              onClick={reset}
              className="px-6 py-2 bg-gray-800 dark:bg-gray-700 text-white font-bold rounded-lg hover:bg-gray-900 dark:hover:bg-gray-600 transition-colors"
            >
              Fermer
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportProductModal;
