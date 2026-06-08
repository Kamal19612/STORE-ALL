import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { Pencil, Download, Upload, Table2, Trash2, AlertTriangle } from "lucide-react";
import {
  listStores,
  listSuperProducts,
  exportSuperProductsCsv,
  importSuperProductsCsv,
  clearSuperStoreProducts,
} from "../../../services/adminSupervisionService";
import { setActiveStoreCode } from "../../../services/store/storeContext";
import ImportProductModal from "../../../components/admin/ImportProductModal";

/** Boutons verre : fond léger, bordure, hover et léger scale au clic */
const glassBtn =
  "inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ease-out " +
  "bg-white/35 dark:bg-white/[0.07] hover:bg-white/55 dark:hover:bg-white/12 " +
  "border border-gray-400/35 dark:border-white/18 backdrop-blur-md " +
  "text-gray-900 dark:text-gray-100 shadow-sm hover:shadow-md " +
  "active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100";

export default function SuperAdminProducts() {
  const [stores, setStores] = useState([]);
  const [storeId, setStoreId] = useState("");
  const [search, setSearch] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [csvBusy, setCsvBusy] = useState(false);
  const [sheetModalOpen, setSheetModalOpen] = useState(false);
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [clearConfirmText, setClearConfirmText] = useState("");
  const [clearLoading, setClearLoading] = useState(false);

  useEffect(() => {
    listStores()
      .then(setStores)
      .catch(() => toast.error("Impossible de charger les boutiques"));
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const sid = storeId === "" ? undefined : Number(storeId);
      const data = await listSuperProducts({ page, size: 20, storeId: sid, search });
      setRows(data.content || []);
      setTotalPages(data.totalPages ?? 1);
    } catch (e) {
      toast.error(e.response?.data?.message || "Erreur chargement produits");
    } finally {
      setLoading(false);
    }
  }, [page, storeId, search]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const applySearch = (e) => {
    e.preventDefault();
    setPage(0);
    setSearch(searchDraft.trim());
  };

  const handleExportCsv = async () => {
    setCsvBusy(true);
    try {
      const sid = storeId === "" ? undefined : Number(storeId);
      await exportSuperProductsCsv(sid);
      toast.success("Export CSV lancé");
    } catch {
      toast.error("Export CSV impossible");
    } finally {
      setCsvBusy(false);
    }
  };

  const handleImportCsv = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setCsvBusy(true);
    try {
      const sid = storeId === "" ? undefined : Number(storeId);
      const summary = await importSuperProductsCsv(file, sid);
      toast.success(
        `Import : ${summary.successCount ?? 0} OK, désactivés ${summary.deactivatedCount ?? 0}, erreurs ${summary.failureCount ?? 0}`,
      );
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || "Import CSV échoué");
    } finally {
      setCsvBusy(false);
    }
  };

  return (
    <div className="p-2 sm:p-4">
      <div className="flex flex-col gap-4 mb-6">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-800 dark:text-white">
            Produits
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Toutes les boutiques · filtre et recherche par nom · CSV multi-boutiques (colonne{" "}
            <code className="text-xs bg-gray-100 dark:bg-white/10 px-1 rounded">store_code</code>) ou une boutique via le filtre + import ·{" "}
            <strong className="font-medium text-gray-600 dark:text-gray-300">Google Sheets</strong> : choisissez une boutique puis import ou synchro depuis les paramètres.{" "}
            <strong className="font-medium text-gray-600 dark:text-gray-300">Vider le catalogue</strong> : une boutique doit être sélectionnée dans le filtre (pas « Toutes »).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={csvBusy}
            onClick={handleExportCsv}
            className={glassBtn}
          >
            <Download className="h-4 w-4 shrink-0 opacity-80" />
            Export CSV {storeId ? "(boutique)" : "(toutes)"}
          </button>
          <label className={`${glassBtn} cursor-pointer`}>
            <Upload className="h-4 w-4 shrink-0 opacity-80" />
            Import CSV
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleImportCsv} disabled={csvBusy} />
          </label>
          <button
            type="button"
            disabled={!storeId || csvBusy}
            onClick={() => setSheetModalOpen(true)}
            title={!storeId ? "Sélectionnez une boutique dans le filtre ci-dessous" : "Import ou synchro Google Sheets pour cette boutique"}
            className={glassBtn}
          >
            <Table2 className="h-4 w-4 shrink-0 opacity-80" />
            Google Sheets
          </button>
          <button
            type="button"
            disabled={!storeId || csvBusy}
            onClick={() => {
              setClearConfirmText("");
              setClearModalOpen(true);
            }}
            title={
              !storeId
                ? "Sélectionnez une boutique dans le filtre (obligatoire)"
                : "Supprimer définitivement tous les produits de cette boutique"
            }
            className={
              glassBtn +
              " border-red-300/60 dark:border-red-800/50 text-red-800 dark:text-red-300 hover:bg-red-50/80 dark:hover:bg-red-950/30"
            }
          >
            <Trash2 className="h-4 w-4 shrink-0 opacity-90" />
            Vider le catalogue
          </button>
        </div>
        <form onSubmit={applySearch} className="flex flex-col sm:flex-row flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1 min-w-[200px]">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Boutique</label>
            <select
              value={storeId}
              onChange={(e) => {
                setPage(0);
                const next = e.target.value;
                setStoreId(next);
                const picked = stores.find((s) => String(s.id) === String(next));
                if (picked?.code) {
                  setActiveStoreCode(picked.code);
                } else {
                  setActiveStoreCode(null);
                }
              }}
              className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#242021] px-3 py-2 text-sm text-gray-900 dark:text-white"
            >
              <option value="">Toutes</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Recherche nom</label>
            <input
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              placeholder="Ex. chocolat"
              className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#242021] px-3 py-2 text-sm text-gray-900 dark:text-white"
            />
          </div>
          <button type="submit" className={`${glassBtn} min-w-[5.5rem]`}>
            Filtrer
          </button>
        </form>
      </div>

      <div className="bg-white dark:bg-[#242021] rounded-xl border border-gray-100 dark:border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-[#1c191a] border-b border-gray-200 dark:border-white/10">
              <tr>
                <th className="px-3 py-2 font-semibold text-gray-600 dark:text-gray-400">Produit</th>
                <th className="px-3 py-2 font-semibold text-gray-600 dark:text-gray-400">Slug</th>
                <th className="px-3 py-2 font-semibold text-gray-600 dark:text-gray-400">Boutique</th>
                <th className="px-3 py-2 font-semibold text-gray-600 dark:text-gray-400">Prix</th>
                <th className="px-3 py-2 font-semibold text-gray-600 dark:text-gray-400">Actif</th>
                <th className="px-3 py-2 font-semibold text-gray-600 dark:text-gray-400 text-right">Éditer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-gray-500">
                    Chargement…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-gray-500">
                    Aucun produit
                  </td>
                </tr>
              ) : (
                rows.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">{p.name}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{p.slug}</td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                      {p.storeName} <span className="text-gray-400">({p.storeCode})</span>
                    </td>
                    <td className="px-3 py-2 text-gray-900 dark:text-white">
                      {p.price != null ? `${Number(p.price).toLocaleString()} F` : "—"}
                    </td>
                    <td className="px-3 py-2">{p.active ? "Oui" : "Non"}</td>
                    <td className="px-3 py-2 text-right">
                      <Link
                        to={`/admin/products/edit/${p.id}`}
                        state={{ managerStoreId: p.storeId }}
                        onClick={() => setActiveStoreCode(p.storeCode)}
                        className="inline-flex p-2 text-amber-700 dark:text-[#f5ad41] hover:bg-amber-50 dark:hover:bg-white/5 rounded-lg"
                        title="Édition (contexte boutique)"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 p-3 border-t border-gray-100 dark:border-white/10">
            <button
              type="button"
              disabled={page <= 0}
              onClick={() => setPage((x) => Math.max(0, x - 1))}
              className={`${glassBtn} px-3 py-1.5 text-xs sm:text-sm`}
            >
              Précédent
            </button>
            <span className="self-center text-sm text-gray-600 dark:text-gray-400">
              {page + 1} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((x) => x + 1)}
              className={`${glassBtn} px-3 py-1.5 text-xs sm:text-sm`}
            >
              Suivant
            </button>
          </div>
        )}
      </div>

      <ImportProductModal
        variant="sheetsOnly"
        isOpen={sheetModalOpen}
        onClose={() => setSheetModalOpen(false)}
        onSuccess={() => fetchProducts()}
        managerStoreId={storeId ? Number(storeId) : undefined}
      />

      {clearModalOpen && storeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-[#242021] rounded-2xl shadow-2xl w-full max-w-md p-6 border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Vider le catalogue</h2>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Boutique :{" "}
              <strong className="text-gray-900 dark:text-white">
                {stores.find((s) => String(s.id) === String(storeId))?.name ?? `#${storeId}`}
              </strong>
              <span className="text-gray-500">
                {" "}
                ({stores.find((s) => String(s.id) === String(storeId))?.code ?? "—"})
              </span>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Cette action supprimera <strong className="text-red-600">définitivement</strong> tous les produits de{" "}
              <strong>cette boutique uniquement</strong>, ainsi que les lignes de commande liées à ces produits.{" "}
              <strong>Irréversible.</strong>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Tapez <strong className="text-red-600 font-mono">VIDER</strong> pour confirmer :
            </p>
            <input
              type="text"
              value={clearConfirmText}
              onChange={(e) => setClearConfirmText(e.target.value)}
              placeholder="VIDER"
              className="w-full px-4 py-2 border border-gray-300 dark:border-white/20 rounded-lg mb-4 text-sm bg-white dark:bg-[#1c191a] dark:text-white focus:ring-2 focus:ring-red-500 outline-none"
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setClearModalOpen(false);
                  setClearConfirmText("");
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-white/10 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={clearConfirmText !== "VIDER" || clearLoading}
                onClick={async () => {
                  if (clearConfirmText !== "VIDER" || !storeId) return;
                  setClearLoading(true);
                  try {
                    const res = await clearSuperStoreProducts(Number(storeId));
                    toast.success(
                      `Catalogue vidé — ${res.deletedCount ?? 0} produit(s) supprimé(s) pour cette boutique.`,
                    );
                    setClearModalOpen(false);
                    setClearConfirmText("");
                    fetchProducts();
                  } catch (err) {
                    toast.error(
                      err.response?.data?.message ||
                        err.response?.data?.error ||
                        "Échec : impossible de vider le catalogue",
                    );
                  } finally {
                    setClearLoading(false);
                  }
                }}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {clearLoading && (
                  <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                Supprimer tout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
