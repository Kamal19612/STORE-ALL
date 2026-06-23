import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { Eye, Trash2 } from "lucide-react";
import {
  clearSuperStoreOrders,
  deleteSuperOrder,
  listStores,
  listSuperOrders,
} from "../../../services/adminSupervisionService";
import { setActiveStoreCode } from "../../../services/store/storeContext";

const statusLabels = {
  PENDING: "En attente",
  CONFIRMED: "Confirmée",
  SHIPPED: "En livraison",
  DELIVERED: "Livrée",
  CANCELLED: "Annulée",
  REJECTED: "Refusée",
};

export default function SuperAdminOrders() {
  const [stores, setStores] = useState([]);
  const [storeId, setStoreId] = useState("");
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [clearConfirmText, setClearConfirmText] = useState("");
  const [clearLoading, setClearLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const selectedStore = stores.find((s) => String(s.id) === String(storeId));

  useEffect(() => {
    listStores()
      .then(setStores)
      .catch(() => toast.error("Impossible de charger les boutiques"));
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const sid = storeId === "" ? undefined : Number(storeId);
      const data = await listSuperOrders({ page, size: 20, storeId: sid });
      setRows(data.content || []);
      setTotalPages(data.totalPages ?? 1);
    } catch (e) {
      toast.error(e.response?.data?.message || "Erreur chargement commandes");
    } finally {
      setLoading(false);
    }
  }, [page, storeId]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleDeleteOrder = async (order) => {
    const label = order.orderNumber ? `#${order.orderNumber}` : `ID ${order.id}`;
    if (
      !window.confirm(
        `Supprimer définitivement la commande ${label} ?\n\nCette action est irréversible (base de données, historique, PDF).`,
      )
    ) {
      return;
    }
    setDeletingId(order.id);
    try {
      await deleteSuperOrder(order.id);
      toast.success(`Commande ${label} supprimée définitivement`);
      fetchOrders();
    } catch (e) {
      toast.error(e.response?.data?.message || "Impossible de supprimer la commande");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-2 sm:p-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-800 dark:text-white">
            Commandes
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Toutes les boutiques · suppression définitive en base
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
          <div className="flex flex-col gap-1 min-w-[200px]">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Boutique</label>
            <select
              value={storeId}
              onChange={(e) => {
                setPage(0);
                setStoreId(e.target.value);
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
          {storeId ? (
            <button
              type="button"
              onClick={() => setClearModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-bold"
            >
              <Trash2 className="h-4 w-4" />
              Vider les commandes
            </button>
          ) : null}
        </div>
      </div>

      <div className="bg-white dark:bg-[#242021] rounded-xl border border-gray-100 dark:border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-[#1c191a] border-b border-gray-200 dark:border-white/10">
              <tr>
                <th className="px-3 py-2 font-semibold text-gray-600 dark:text-gray-400">N°</th>
                <th className="px-3 py-2 font-semibold text-gray-600 dark:text-gray-400">Boutique</th>
                <th className="px-3 py-2 font-semibold text-gray-600 dark:text-gray-400">Client</th>
                <th className="px-3 py-2 font-semibold text-gray-600 dark:text-gray-400">Date</th>
                <th className="px-3 py-2 font-semibold text-gray-600 dark:text-gray-400">Total</th>
                <th className="px-3 py-2 font-semibold text-gray-600 dark:text-gray-400">Statut</th>
                <th className="px-3 py-2 font-semibold text-gray-600 dark:text-gray-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-gray-500">
                    Chargement…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-gray-500">
                    Aucune commande
                  </td>
                </tr>
              ) : (
                rows.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">#{o.orderNumber}</td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                      <span className="font-medium">{o.storeName}</span>
                      <span className="text-gray-400 ml-1">({o.storeCode})</span>
                    </td>
                    <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{o.customerName}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                      {o.createdAt ? new Date(o.createdAt).toLocaleString("fr-FR") : "—"}
                    </td>
                    <td className="px-3 py-2 text-gray-900 dark:text-white">
                      {o.total != null ? `${Number(o.total).toLocaleString()} F` : "—"}
                    </td>
                    <td className="px-3 py-2">{statusLabels[o.status] || o.status}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Link
                          to={`/admin/orders/${o.id}`}
                          state={{ managerStoreId: o.storeId }}
                          onClick={() => setActiveStoreCode(o.storeCode)}
                          className="inline-flex p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                          title="Détail"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDeleteOrder(o)}
                          disabled={deletingId === o.id}
                          className="inline-flex p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-50"
                          title="Supprimer définitivement"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
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
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="px-3 py-1 rounded-lg bg-gray-100 dark:bg-white/10 disabled:opacity-40"
            >
              Précédent
            </button>
            <span className="self-center text-sm text-gray-600 dark:text-gray-400">
              {page + 1} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 rounded-lg bg-gray-100 dark:bg-white/10 disabled:opacity-40"
            >
              Suivant
            </button>
          </div>
        )}
      </div>

      {clearModalOpen && storeId && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-[#242021] rounded-xl shadow-xl max-w-md w-full p-6 border border-gray-200 dark:border-white/10">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              Vider les commandes de la boutique
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Boutique :{" "}
              <strong className="text-gray-900 dark:text-white">
                {selectedStore?.name ?? `#${storeId}`}
              </strong>
              {selectedStore?.code ? (
                <span className="text-gray-500"> ({selectedStore.code})</span>
              ) : null}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Toutes les commandes de cette boutique seront{" "}
              <strong className="text-red-600">supprimées définitivement</strong> de la base
              (lignes, historique, notifications, PDF).{" "}
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
                    const res = await clearSuperStoreOrders(Number(storeId));
                    toast.success(
                      `${res.deletedCount ?? 0} commande(s) supprimée(s) définitivement pour cette boutique.`,
                    );
                    setClearModalOpen(false);
                    setClearConfirmText("");
                    setPage(0);
                    fetchOrders();
                  } catch (err) {
                    toast.error(
                      err.response?.data?.message ||
                        err.response?.data?.error ||
                        "Échec du vidage des commandes",
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
                Supprimer toutes les commandes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
