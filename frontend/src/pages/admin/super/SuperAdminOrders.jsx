import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { Eye } from "lucide-react";
import { listStores, listSuperOrders } from "../../../services/adminSupervisionService";
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

  return (
    <div className="p-2 sm:p-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-800 dark:text-white">
            Commandes
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Toutes les boutiques · filtre optionnel
          </p>
        </div>
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
                <th className="px-3 py-2 font-semibold text-gray-600 dark:text-gray-400 text-right">Voir</th>
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
                      <Link
                        to={`/admin/orders/${o.id}`}
                        state={{ managerStoreId: o.storeId }}
                        onClick={() => setActiveStoreCode(o.storeCode)}
                        className="inline-flex p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                        title="Détail (contexte boutique appliqué)"
                      >
                        <Eye className="h-4 w-4" />
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
    </div>
  );
}
