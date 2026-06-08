import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import adminOrderService from "../../../services/adminOrderService";
import { useSseEvent } from "../../../hooks/useNotifications";
import useAuthStore from "../../../store/authStore";
import { useStaffBasePath } from "../../../hooks/useStaffBasePath";

const AdminOrderList = () => {
  const staffBase = useStaffBasePath();
  const storeId = useAuthStore((s) => s.user?.storeId);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const navigate = useNavigate();

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await adminOrderService.getAllOrders(page, 50, storeId);

      let ordersArray = [];
      let pages = 1;

      if (Array.isArray(data)) {
        ordersArray = data;
      } else if (data && typeof data === "object") {
        ordersArray = data.content || [];
        pages = data.totalPages || 1;
      }

      setOrders(ordersArray);
      setTotalPages(pages);
    } catch (error) {
      console.error("Erreur chargement commandes:", error);
      if (!silent) {
        toast.error(
          `Impossible de charger les commandes: ${error.response?.data?.message || error.message}`,
        );
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [page, storeId]);

  // Rafraîchissement instantané à chaque nouvelle commande (via SSE du Layout)
  useSseEvent("new_order", () => fetchOrders(true));

  // Chargement initial + polling 30s silencieux (skip si onglet en arrière-plan)
  useEffect(() => {
    fetchOrders(false);
    const interval = setInterval(() => {
      if (!document.hidden) fetchOrders(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const handleDelete = async (id) => {
    if (
      window.confirm(
        "Êtes-vous sûr de vouloir supprimer cette commande définitivement ?",
      )
    ) {
      try {
        await adminOrderService.deleteOrder(id, storeId);
        toast.success("Commande supprimée");
        fetchOrders();
      } catch (error) {
        toast.error("Erreur suppression (Permission insuffisante ?)");
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border border-yellow-100 dark:border-yellow-900/50";
      case "CONFIRMED":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-100 dark:border-blue-900/50";
      case "SHIPPED":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-100 dark:border-purple-900/50";
      case "DELIVERED":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border border-green-100 dark:border-green-900/50";
      case "CANCELLED":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border border-red-100 dark:border-red-900/50";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border border-gray-100 dark:border-gray-600";
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      PENDING: "En attente",
      CONFIRMED: "Confirmée",
      SHIPPED: "En livraison",
      DELIVERED: "Livrée",
      CANCELLED: "Annulée",
    };
    return labels[status] || status;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString("fr-FR");
  };

  return (
    <div className="p-2 sm:p-4">
      <div className="flex flex-col gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-800 dark:text-white">
            Gestion des Commandes
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Suivi des achats clients
          </p>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-3">
        {loading ? (
          // Mobile Skeleton
          [...Array(3)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-[#242021] rounded-lg p-4 animate-pulse">
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-3"></div>
              <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
              <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          ))
        ) : orders.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Aucune commande trouvée.
          </div>
        ) : (
          orders.map((order) => (
            <div
              key={order.id}
              className="bg-white dark:bg-[#242021] rounded-lg shadow-sm border border-gray-100 dark:border-white/10 p-3 sm:p-4"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="font-bold text-gray-900 dark:text-white text-sm sm:text-base">
                  #{order.orderNumber}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                  {getStatusLabel(order.status)}
                </span>
              </div>
              <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                {order.customerName}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                {order.customerPhone}
              </div>
              <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100 dark:border-white/5">
                <span className="font-bold text-primary dark:text-primary-400 text-sm sm:text-base">
                  {order.total.toLocaleString()} FCA
                </span>
                <div className="flex gap-2">
                  <Link
                    to={`${staffBase}/orders/${order.id}`}
                    state={{ managerStoreId: storeId }}
                    className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                    title="Voir"
                  >
                    <Eye className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => handleDelete(order.id)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block bg-white dark:bg-[#242021] rounded-xl shadow-sm border border-gray-100 dark:border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 dark:bg-[#1c191a] border-b border-gray-200 dark:border-white/10">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">N°</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase hidden sm:table-cell">Date</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Client</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase hidden md:table-cell">Code</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Total</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase hidden sm:table-cell">Statut</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white text-sm">#{order.orderNumber}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-sm hidden sm:table-cell">{formatDate(order.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{order.customerName}</div>
                    <div className="text-xs text-gray-500">{order.customerPhone}</div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {order.confirmationCode ? (
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-mono bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        {order.confirmationCode}
                      </span>
                    ) : <span className="text-xs text-gray-400">-</span>}
                  </td>
                  <td className="px-4 py-3 font-bold text-primary dark:text-primary-400 text-sm">{order.total.toLocaleString()} FCA</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        to={`${staffBase}/orders/${order.id}`}
                        state={{ managerStoreId: storeId }}
                        className="p-2 text-gray-500 hover:text-blue-600 rounded-lg"
                        title="Voir"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <button onClick={() => handleDelete(order.id)} className="p-2 text-gray-500 hover:text-red-600 rounded-lg" title="Supprimer">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {orders.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4 bg-white dark:bg-[#242021] p-3 sm:p-4 rounded-lg border border-gray-100 dark:border-white/10">
          <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Page {page + 1} / {totalPages || 1}
          </span>
          <div className="flex gap-2 self-end sm:self-auto">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-1.5 border rounded-lg text-xs sm:text-sm hover:bg-gray-50 disabled:opacity-50">
              Précédent
            </button>
            <button onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages - 1} className="px-3 py-1.5 border rounded-lg text-xs sm:text-sm hover:bg-gray-50 disabled:opacity-50">
              Suivant
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrderList;
