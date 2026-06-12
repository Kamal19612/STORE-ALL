import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  Phone,
  User,
  Calendar,
  Package,
  ExternalLink,
  MessageSquare,
  History,
  Truck,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { toast } from "react-toastify";
import adminOrderService from "../../../services/adminOrderService";
import useAuthStore from "../../../store/authStore";
import { useStaffBasePath } from "../../../hooks/useStaffBasePath";
import ProductImage from "../../../components/product/ProductImage";

const AdminOrderDetail = () => {
  const staffBase = useStaffBasePath();
  const { id } = useParams();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const managerStoreId = location.state?.managerStoreId ?? user?.storeId;
  const [order, setOrder] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [deliveryTime, setDeliveryTime] = useState(null);
  const [whatsappSent, setWhatsappSent] = useState(false);
  const [justActioned, setJustActioned] = useState(null); // "confirmed" | "cancelled"
  const [pickupCode, setPickupCode] = useState("");
  const [pickupValidating, setPickupValidating] = useState(false);

  const fetchOrder = useCallback(async (silent = false) => {
    try {
      const [orderData, historyData] = await Promise.all([
        adminOrderService.getOrderById(id, managerStoreId),
        adminOrderService.getOrderHistory(id, managerStoreId),
      ]);
      setOrder(orderData);
      setHistory(historyData);
      setWhatsappPhone((prev) => prev || orderData.customerPhone || "");

      if (orderData.status === "DELIVERED") {
        const deliveredEvent = historyData.find((h) => h.status === "DELIVERED");
        setDeliveryTime(deliveredEvent ? deliveredEvent.createdAt : orderData.updatedAt);
      }
    } catch (error) {
      console.error(error);
      if (!silent) toast.error("Erreur chargement commande");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id, managerStoreId]);

  // Chargement initial + polling 30s silencieux (skip si onglet en arrière-plan)
  useEffect(() => {
    fetchOrder(false);
    const interval = setInterval(() => {
      if (!document.hidden) fetchOrder(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchOrder]);

  const handleStatusChange = async (newStatus) => {
    if (!window.confirm(`Changer le statut en ${newStatus} ?`)) return;

    setUpdating(true);
    const prevOrder = order;
    // Mise à jour optimiste: évite d'attendre une réponse backend qui peut être minimale
    setOrder((cur) => (cur ? { ...cur, status: newStatus } : cur));
    try {
      await adminOrderService.updateOrderStatus(id, newStatus, managerStoreId);
      // Refetch complet (commande + historique) pour refléter l'état exact serveur
      await fetchOrder(true);

      if (newStatus === "CONFIRMED") setJustActioned("confirmed");
      if (newStatus === "CANCELLED") setJustActioned("cancelled");

      toast.success(`Statut mis à jour : ${newStatus}`);
    } catch (error) {
      // rollback si l'update échoue
      if (prevOrder) setOrder(prevOrder);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setUpdating(false);
    }
  };

  const handleCompletePickup = async () => {
    const code = pickupCode.trim();
    if (!code) {
      toast.error("Saisissez le code de confirmation du client");
      return;
    }

    setPickupValidating(true);
    try {
      await adminOrderService.completePickup(id, code, managerStoreId);
      setPickupCode("");
      await fetchOrder(true);
      toast.success("Retrait confirmé — commande marquée comme récupérée");
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        "Code incorrect ou validation impossible";
      toast.error(msg);
    } finally {
      setPickupValidating(false);
    }
  };

  const handleWhatsAppNotify = async () => {
    try {
      const link = await adminOrderService.getWhatsAppNotificationLink(
        id,
        whatsappPhone,
        managerStoreId,
      );
      window.open(link, "_blank");
      setWhatsappSent(true);
    } catch (error) {
      toast.error("Erreur génération lien WhatsApp");
    }
  };

  if (loading) return <div className="p-10 text-center">Chargement...</div>;
  if (!order)
    return (
      <div className="p-10 text-center text-red-500">Commande introuvable</div>
    );

  const isPickup = order.fulfillmentType === "PICKUP";

  const getStatusColor = (status) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-900/50";
      case "CONFIRMED":
        return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-900/50";
      case "SHIPPED":
        return "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-900/50";
      case "DELIVERED":
        return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-900/50";
      case "CANCELLED":
        return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-900/50";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600";
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      PENDING: "En attente",
      CONFIRMED: "Confirmée",
      SHIPPED: "En livraison",
      DELIVERED: isPickup ? "Récupérée" : "Livrée",
      CANCELLED: "Annulée",
    };
    return labels[status] || status;
  };

  const getRoleLabel = (role) => {
    const labels = {
      SUPER_ADMIN: "Super admin",
      MANAGER: "Manager",
    };
    return labels[role] || role;
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case "SUPER_ADMIN": return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300";
      case "MANAGER": return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300";
      default: return "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400";
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="w-full p-3 sm:p-4 md:p-6 bg-gray-50/50 dark:bg-[#1c191a] min-h-dvh transition-colors">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header - Full Width */}
        <div className="bg-white dark:bg-[#242021] rounded-xl shadow-sm border border-gray-200 dark:border-white/10 p-4 sm:p-6 transition-colors">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3 sm:gap-4 min-w-0">
              <Link
                to={`${staffBase}/orders`}
                className="p-2 sm:p-2.5 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors shrink-0 mt-0.5"
                title="Retour"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              </Link>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <h1 className="text-base sm:text-2xl font-bold text-gray-800 dark:text-white">
                    Commande #{order.orderNumber}
                  </h1>
                  <span
                    className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${getStatusColor(order.status)}`}
                  >
                    {getStatusLabel(order.status)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400 shrink-0" />
                    <span className="whitespace-nowrap">{formatDate(order.createdAt)}</span>
                  </div>
                  {order.confirmationCode && (
                    <div className="flex items-center gap-2 px-2 py-0.5 bg-gray-100 dark:bg-white/10 rounded border border-gray-200 dark:border-white/10">
                      <span className="text-gray-500 dark:text-gray-400 text-xs uppercase">
                        Code:
                      </span>
                      <span className="font-mono text-gray-900 dark:text-white">
                        {order.confirmationCode}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Delivery Time Badge */}
            {order.status === "DELIVERED" && deliveryTime && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/30 rounded-lg px-4 py-2 flex items-center gap-3">
                <div className="bg-green-100 dark:bg-green-900/40 p-2 rounded-full">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-[10px] text-green-600 dark:text-green-400 font-bold uppercase tracking-wider">
                    {isPickup ? "Récupérée le" : "Livrée le"}
                  </p>
                  <p className="text-sm font-bold text-green-800 dark:text-green-300">
                    {formatDate(deliveryTime)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Layout - Sticky Sidebar */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Left Column: Order Items & Notes (Takes remaining space) */}
          <div className="flex-1 w-full space-y-6">
            {/* Items Card */}
            <div className="bg-white dark:bg-[#242021] rounded-xl shadow-sm border border-gray-200 dark:border-white/10 overflow-hidden transition-colors">
              <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-[#1c191a]/50 flex justify-between items-center">
                <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Contenu de la commande
                </h3>
                <span className="bg-white dark:bg-[#242021] border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                  {order.items.length} article(s)
                </span>
              </div>

              <div className="divide-y divide-gray-100 dark:divide-white/5">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 sm:p-5 flex flex-row sm:items-center gap-3 sm:gap-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                  >
                    <div className="h-16 w-16 bg-white dark:bg-[#1c191a] rounded-lg border border-gray-200 dark:border-white/10 overflow-hidden shrink-0 p-1">
                      <ProductImage
                        product={item.product}
                        alt={item.product?.name || "Produit"}
                        className="h-full w-full object-contain"
                        wrapperClassName="h-full w-full"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 dark:text-white text-base truncate">
                        {item.product?.name}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        PU: {item.unitPrice.toLocaleString()} FCFA
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center justify-end gap-2 mb-1">
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/10 px-2 py-1 rounded">
                          x{item.quantity}
                        </span>
                      </div>
                      <p className="font-bold text-gray-900 dark:text-white text-lg">
                        {item.totalPrice.toLocaleString()}{" "}
                        <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                          FCFA
                        </span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-gray-50 dark:bg-[#1c191a]/50 px-3 sm:px-6 py-3 sm:py-5 border-t border-gray-200 dark:border-white/10">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400 font-medium">
                    Total Global
                  </span>
                  <span className="text-2xl font-extrabold text-primary tracking-tight">
                    {order.total.toLocaleString()} FCFA
                  </span>
                </div>
              </div>
            </div>

            {/* Note Client */}
            {order.customerNotes && (
              <div className="bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-200 dark:border-amber-900/20 p-4 sm:p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <MessageSquare className="w-24 h-24 text-amber-900 dark:text-amber-500" />
                </div>
                <h4 className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-400 mb-3 relative z-10">
                  <MessageSquare className="h-5 w-5" />
                  Message du client
                </h4>
                <p className="text-amber-900/80 dark:text-amber-200 italic text-base leading-relaxed relative z-10 bg-white/50 dark:bg-black/20 p-4 rounded-lg border border-amber-100 dark:border-amber-900/20">
                  "{order.customerNotes}"
                </p>
              </div>
            )}

            {/* Actions Section - Moved Bottom */}
            <div className="bg-white dark:bg-[#242021] rounded-xl shadow-sm border border-gray-200 dark:border-white/10 p-4 sm:p-6 transition-colors">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2 self-start sm:self-auto">
                  <CheckCircle className="w-5 h-5 text-primary" /> Actions sur la commande
                </h3>

                <div className="flex flex-wrap gap-3 w-full sm:w-auto">
                  {order.status === "PENDING" && (
                    <>
                      <button
                        onClick={() => handleStatusChange("CANCELLED")}
                        disabled={updating}
                        className="group flex-1 sm:flex-none px-5 py-3 bg-white text-red-700 border border-red-200 rounded-xl font-extrabold shadow-sm transition-all flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/25 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed hover:bg-red-50 hover:-translate-y-[1px] hover:shadow-md hover:shadow-red-500/10 active:translate-y-0 active:shadow-sm"
                      >
                        <XCircle className="w-5 h-5 transition-transform group-hover:scale-110" />
                        Annuler
                      </button>
                      <button
                        onClick={() => handleStatusChange("CONFIRMED")}
                        disabled={updating}
                        className="group flex-1 sm:flex-none px-5 py-3 bg-primary text-secondary rounded-xl font-extrabold shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed hover:brightness-110 hover:-translate-y-[1px] hover:shadow-xl hover:shadow-primary/25 active:translate-y-0 active:brightness-95"
                      >
                        <CheckCircle className="w-5 h-5 transition-transform group-hover:scale-110" />
                        Valider
                      </button>
                    </>
                  )}
                  {order.status === "CONFIRMED" && !isPickup && (
                     <button
                        onClick={() => handleStatusChange("CANCELLED")}
                        disabled={updating}
                        className="group flex-1 sm:flex-none px-5 py-3 bg-white text-red-700 border border-red-200 rounded-xl font-extrabold shadow-sm transition-all flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/25 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed hover:bg-red-50 hover:-translate-y-[1px] hover:shadow-md hover:shadow-red-500/10 active:translate-y-0 active:shadow-sm"
                      >
                        <XCircle className="w-5 h-5" />
                        Annuler
                      </button>
                  )}
                  {order.status === "CONFIRMED" && isPickup && (
                    <div className="w-full space-y-3">
                      <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-900/30 rounded-xl p-4">
                        <p className="text-sm font-bold text-teal-900 dark:text-teal-200 mb-1">
                          Validation du retrait en boutique
                        </p>
                        <p className="text-xs text-teal-800/80 dark:text-teal-300/80 mb-3">
                          Demandez au client son code de confirmation
                          {order.confirmationCode ? (
                            <>
                              {" "}
                              (référence staff :{" "}
                              <span className="font-mono font-bold">
                                {order.confirmationCode}
                              </span>
                              )
                            </>
                          ) : (
                            "."
                          )}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            placeholder="Code client"
                            value={pickupCode}
                            onChange={(e) => setPickupCode(e.target.value)}
                            maxLength={10}
                            className="flex-1 bg-white dark:bg-[#1c191a] border border-teal-200 dark:border-teal-800 rounded-xl px-4 py-3 text-center font-mono font-bold text-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                          />
                          <button
                            type="button"
                            onClick={handleCompletePickup}
                            disabled={pickupValidating || updating}
                            className="sm:min-w-[180px] px-5 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-extrabold shadow-md shadow-green-600/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                          >
                            <CheckCircle className="w-5 h-5" />
                            {pickupValidating
                              ? "Validation…"
                              : "Confirmer le retrait"}
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={() => handleStatusChange("CANCELLED")}
                        disabled={updating || pickupValidating}
                        className="group w-full sm:w-auto px-5 py-3 bg-white text-red-700 border border-red-200 rounded-xl font-extrabold shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                      >
                        <XCircle className="w-5 h-5" />
                        Annuler la commande
                      </button>
                    </div>
                  )}
                  {(order.status === "SHIPPED" || order.status === "DELIVERED") && (
                    <p className="text-sm text-gray-500 italic">
                      Les actions sont verrouillées (Commande {getStatusLabel(order.status).toLowerCase()})
                    </p>
                  )}
                  {order.status === "CANCELLED" && (
                    <p className="text-sm text-red-500 font-bold uppercase">Commande Annulée</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Static Sidebar (Does not follow scroll) */}
          <div className="w-full lg:w-[360px] shrink-0 space-y-6">


            {/* 2. Client Info */}
            <div className="bg-white dark:bg-[#242021] rounded-xl shadow-sm border border-gray-200 dark:border-white/10 p-4 sm:p-5 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-500" />
                  Client
                </h3>
                <a
                  href={`tel:${order.customerPhone}`}
                  className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                >
                  <Phone className="w-4 h-4" />
                </a>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-500 dark:text-gray-300 font-bold text-lg">
                    {order.customerName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">
                      {order.customerName}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {order.customerPhone}
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 dark:bg-[#1c191a] rounded-lg border border-gray-100 dark:border-white/10">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-gray-600 dark:text-gray-300 font-medium leading-tight">
                      {order.customerAddress}
                    </p>
                  </div>
                  {order.customerLatitude && (
                    <a
                      href={`https://www.google.com/maps?q=${order.customerLatitude},${order.customerLongitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 w-full flex items-center justify-center gap-2 py-2 bg-white dark:bg-[#242021] border border-gray-200 dark:border-white/10 rounded text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Voir sur la carte
                    </a>
                  )}
                </div>

                {/* WhatsApp Quick Action */}
                <div>
                  {order.status === "PENDING" ? (
                    <div title="Disponible après validation ou annulation de la commande">
                      <button
                        disabled
                        className="w-full py-2 rounded-lg text-xs font-bold uppercase tracking-wide cursor-not-allowed bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-600 border border-dashed border-gray-200 dark:border-white/10 flex items-center justify-center gap-2"
                      >
                        <MessageSquare className="w-4 h-4" />
                        Envoyer notif WhatsApp
                      </button>
                      <p className="text-[10px] text-center text-gray-400 dark:text-gray-500 mt-1">
                        Disponible après validation
                      </p>
                    </div>
                  ) : order.status === "CANCELLED" ? (
                    <button
                      onClick={handleWhatsAppNotify}
                      className={`w-full py-2 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 bg-red-500 text-white hover:brightness-110 ${
                        justActioned === "cancelled"
                          ? "btn-whatsapp-blink"
                          : "shadow-sm shadow-red-500/30 transition-colors"
                      }`}
                    >
                      <MessageSquare className="w-4 h-4" />
                      {justActioned === "cancelled"
                        ? "⚡ Notifier annulation"
                        : "Notifier annulation"}
                    </button>
                  ) : (
                    <button
                      onClick={handleWhatsAppNotify}
                      className={`w-full py-2 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 bg-[#25D366] text-white hover:brightness-110 ${
                        justActioned === "confirmed" && !whatsappSent
                          ? "btn-whatsapp-blink"
                          : "shadow-sm shadow-green-500/30 transition-colors"
                      }`}
                    >
                      <MessageSquare className="w-4 h-4" />
                      {justActioned === "confirmed" && !whatsappSent
                        ? "⚡ Envoyer notif WhatsApp"
                        : "Envoyer notif WhatsApp"}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 3. Delivery / Pickup Info */}
            <div className="bg-white dark:bg-[#242021] rounded-xl shadow-sm border border-gray-200 dark:border-white/10 p-4 sm:p-5 transition-colors">
              <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                <Truck className="w-5 h-5 text-purple-500" />
                {order.fulfillmentType === "PICKUP" ? "Retrait en boutique" : "Livraison"}
              </h3>

              {/* Delivery Details */}
              <div className="mb-6 space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#1c191a] rounded-lg border border-gray-100 dark:border-white/5 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#242021] flex items-center justify-center shadow-sm text-xl border border-gray-100 dark:border-white/5">
                      {order.fulfillmentType === "PICKUP"
                        ? "🏪"
                        : order.deliveryType === "EXPRESS"
                          ? "⚡"
                          : order.deliveryType === "PROGRAMMER"
                            ? "📅"
                            : "🛵"}
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Mode</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        {order.fulfillmentType === "PICKUP"
                          ? "Retrait sur place"
                          : order.deliveryType === "EXPRESS"
                            ? "Express"
                            : order.deliveryType === "PROGRAMMER"
                              ? "Programmé"
                              : "Standard"}
                      </p>
                    </div>
                  </div>
                  {order.scheduledTime && (
                    <div className="text-right px-3 py-1 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-100 dark:border-purple-900/30">
                      <p className="text-[10px] text-purple-600 dark:text-purple-400 font-bold uppercase tracking-wider">Horaire</p>
                      <p className="text-sm font-black text-purple-700 dark:text-purple-300">{order.scheduledTime}</p>
                    </div>
                  )}
                </div>

                {isPickup && order.status === "CONFIRMED" && (
                  <div className="bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-200 dark:border-teal-900/30 p-3 text-xs text-teal-800 dark:text-teal-200">
                    En attente du client en boutique — validez le retrait avec son
                    code dans la section <strong>Actions</strong>.
                  </div>
                )}

                {isPickup && order.status === "DELIVERED" && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-900/30 text-sm text-green-800 dark:text-green-300 font-medium">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    Retrait validé — produits remis au client.
                  </div>
                )}

                {!isPickup && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-gray-50 dark:bg-[#1c191a] rounded-lg border border-gray-100 dark:border-white/5">
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Frais</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        {order.deliveryCost ? `${order.deliveryCost.toLocaleString()} F` : "Gratuit"}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-[#1c191a] rounded-lg border border-gray-100 dark:border-white/5">
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Distance</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        {order.distance ? `${order.distance.toFixed(1)} km` : "N/A"}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {!isPickup && (
              <div className="border-t border-gray-100 dark:border-white/5 pt-4">
                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase mb-3 tracking-wider">Livreur assigné</p>
                {order.deliveryAgent ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold">
                        {order.deliveryAgent.username.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white text-sm">
                          {order.deliveryAgent.username}
                        </p>
                        <p className="text-xs text-purple-600 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/20 px-1.5 py-0.5 rounded inline-block">
                          Agent #{order.deliveryAgent.id}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href={`mailto:${order.deliveryAgent.email}`}
                        className="flex flex-col items-center justify-center p-2 bg-gray-50 dark:bg-[#1c191a] rounded hover:bg-gray-100 dark:hover:bg-white/5 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-white/10"
                      >
                        <User className="w-4 h-4 text-gray-400 mb-1" />
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                          Email
                        </span>
                      </a>
                      {order.deliveryAgent.phone ? (
                        <a
                          href={`tel:${order.deliveryAgent.phone}`}
                          className="flex flex-col items-center justify-center p-2 bg-purple-50 dark:bg-purple-900/10 rounded hover:bg-purple-100 dark:hover:bg-purple-900/20 transition-colors border border-purple-100 dark:border-purple-900/20"
                        >
                          <Phone className="w-4 h-4 text-purple-500 mb-1" />
                          <span className="text-[10px] text-purple-700 dark:text-purple-300 font-bold">
                            {order.deliveryAgent.phone}
                          </span>
                        </a>
                      ) : (
                        <div className="flex flex-col items-center justify-center p-2 bg-gray-50 dark:bg-[#1c191a] rounded border border-dashed border-gray-200 dark:border-gray-700 opacity-50">
                          <Phone className="w-4 h-4 text-gray-400 mb-1" />
                          <span className="text-[10px] text-gray-400">N/A</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 bg-gray-50 dark:bg-[#1c191a] rounded-lg border border-dashed border-gray-200 dark:border-white/10">
                    <Truck className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                      Non assigné
                    </p>
                  </div>
                )}
              </div>
              )}
            </div>

            {/* 4. History (Compact) */}
            {history.length > 0 && (
              <div className="bg-white dark:bg-[#242021] rounded-xl shadow-sm border border-gray-200 dark:border-white/10 p-4 sm:p-5 transition-colors">
                <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                  <History className="w-5 h-5 text-gray-500" />
                  Historique
                </h3>
                <div className="relative pl-2 border-l-2 border-gray-100 dark:border-white/10 space-y-6">
                  {history.slice(0, 5).map((event, idx) => (
                    <div key={idx} className="relative pl-4">
                      <div
                        className={`absolute -left-[5px] top-1.5 w-2 h-2 rounded-full border border-white dark:border-[#242021] shadow-sm ${
                          event.status === "DELIVERED"
                            ? "bg-green-500"
                            : event.status === "CANCELLED"
                              ? "bg-red-500"
                              : idx === 0
                                ? "bg-blue-500"
                                : "bg-gray-300 dark:bg-gray-600"
                        }`}
                      ></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide">
                          {getStatusLabel(event.status)}
                        </p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                          {formatDate(event.createdAt)}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          {event.actorUsername ? (
                            <>
                              <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                                {event.actorUsername}
                              </span>
                              {event.actorRole && (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${getRoleBadgeClass(event.actorRole)}`}>
                                  {getRoleLabel(event.actorRole)}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-[10px] font-medium text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/20 px-1.5 py-0.5 rounded">
                              🤖 Bot Telegram
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOrderDetail;
