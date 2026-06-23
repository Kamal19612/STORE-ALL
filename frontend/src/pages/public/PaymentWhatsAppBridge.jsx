import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { CheckCircle, Clock, Home as HomeIcon, MessageSquare, XCircle } from "lucide-react";
import { getPaymentStatus, resolveYengapayReturn } from "../../services/api";
import { useStorefrontHref } from "../../hooks/useStorefrontHref";
import { clearCartAfterPayment } from "../../utils/cartAfterPayment";
import { setActiveStoreCode } from "../../services/store/storeContext";
import { clearYengapayCheckoutPending } from "../../utils/pendingYengapayReturn";

const SUCCESS_YENGAPAY_STATUSES = new Set([
  "successful",
  "success",
  "done",
  "completed",
  "paid",
]);

/**
 * Page post-paiement : confirmer la commande, lien WhatsApp (même onglet), retour boutique à la demande.
 */
const PaymentWhatsAppBridge = () => {
  const { storeCode } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { home } = useStorefrontHref();
  const orderNumber = searchParams.get("order") || "";
  const yengapayPaymentId = searchParams.get("yengapay_payment_id") || "";
  const yengapayStatus = (searchParams.get("yengapay_status") || "").toLowerCase();

  const [status, setStatus] = useState(null);
  const [resolvedOrder, setResolvedOrder] = useState(orderNumber);
  const [whatsappLink, setWhatsappLink] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const shopHome =
    home ||
    `/${String(storeCode || import.meta.env.VITE_STORE_CODE || "spirit")
      .trim()
      .toLowerCase()}`;

  useEffect(() => {
    clearYengapayCheckoutPending();
  }, []);

  useEffect(() => {
    const key = resolvedOrder || orderNumber;
    if (!key) return;
    try {
      const pendingStore = sessionStorage.getItem(`pending_payment_${key}`);
      if (pendingStore && pendingStore.trim()) {
        setActiveStoreCode(pendingStore.trim().toLowerCase());
      }
    } catch {
      /* ignore */
    }
  }, [orderNumber, resolvedOrder]);

  useEffect(() => {
    if (!orderNumber && !yengapayPaymentId) {
      setError("Référence de commande manquante.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 20;
    const yengaSuccess = SUCCESS_YENGAPAY_STATUSES.has(yengapayStatus);

    const markPaidAndClean = (data) => {
      const paid = data.paymentStatus === "PAID" || yengaSuccess;
      if (paid) {
        clearCartAfterPayment();
        const key = data.orderNumber || orderNumber;
        if (key) {
          try {
            sessionStorage.removeItem(`pending_payment_${key}`);
          } catch {
            /* ignore */
          }
        }
      }
      if (data.storeCode) {
        setActiveStoreCode(data.storeCode.trim().toLowerCase());
      }
      return paid;
    };

    const applyStatus = (data) => {
      if (cancelled) return;
      markPaidAndClean(data);
      setStatus(data);
      if (data.orderNumber) {
        setResolvedOrder(data.orderNumber);
      }
      if (!data.whatsappLink) {
        setError("Lien WhatsApp indisponible pour cette commande.");
        setLoading(false);
        return;
      }
      setWhatsappLink(data.whatsappLink);
      setLoading(false);

      const paid = data.paymentStatus === "PAID" || yengaSuccess;
      if (!paid && data.paymentStatus === "PENDING" && attempts < maxAttempts) {
        attempts += 1;
        window.setTimeout(poll, 3000);
      }
    };

    const poll = async () => {
      try {
        let res;
        if (yengapayPaymentId && attempts === 0) {
          res = await resolveYengapayReturn(
            yengapayPaymentId,
            yengapayStatus || undefined,
          );
        } else if (orderNumber) {
          res = await getPaymentStatus(orderNumber);
        } else {
          res = await resolveYengapayReturn(
            yengapayPaymentId,
            yengapayStatus || undefined,
          );
        }
        applyStatus(res.data);
      } catch {
        if (cancelled) return;
        setError("Impossible de charger les informations de paiement.");
        setLoading(false);
      }
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [orderNumber, yengapayPaymentId, yengapayStatus]);

  const displayOrder = resolvedOrder || orderNumber;
  const paid =
    status?.paymentStatus === "PAID" ||
    SUCCESS_YENGAPAY_STATUSES.has(yengapayStatus);
  const pending = status?.paymentStatus === "PENDING" && !paid;

  const handleBackToShop = () => {
    clearCartAfterPayment();
    clearYengapayCheckoutPending();
    if (displayOrder) {
      try {
        sessionStorage.removeItem(`pending_payment_${displayOrder}`);
      } catch {
        /* ignore */
      }
    }
    navigate(shopHome, { replace: true });
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-10 md:py-16 text-center">
      <div className="bg-white p-8 shadow-xl border border-gray-100 rounded-3xl">
        {loading && (
          <>
            <Clock className="h-16 w-16 text-primary mx-auto mb-4 animate-pulse" />
            <h1 className="text-2xl font-black text-secondary">
              Confirmation du paiement…
            </h1>
            {displayOrder ? (
              <p className="mt-3 text-gray-600">Commande #{displayOrder}</p>
            ) : null}
          </>
        )}

        {!loading && error && (
          <>
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-black text-secondary">Erreur</h1>
            <p className="mt-3 text-gray-600">{error}</p>
            <button
              type="button"
              onClick={handleBackToShop}
              className="mt-8 inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-3 px-6 rounded-xl transition-colors"
            >
              <HomeIcon className="h-5 w-5" />
              Retour à la boutique
            </button>
          </>
        )}

        {!loading && !error && whatsappLink && (
          <>
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-black text-secondary">
              {paid ? "Paiement confirmé !" : pending ? "Paiement en cours" : "Commande enregistrée"}
            </h1>
            {displayOrder ? (
              <p className="mt-3 text-gray-600">
                Commande{" "}
                <span className="font-bold text-primary">#{displayOrder}</span>
                {paid ? " — merci pour votre achat." : "."}
              </p>
            ) : null}

            <div className="mt-8 bg-primary/10 p-6 rounded-2xl border border-primary/20">
              <p className="text-secondary font-medium mb-4">
                Pour finaliser, envoyez votre message de confirmation sur WhatsApp :
              </p>
              <a
                href={whatsappLink}
                className="inline-flex items-center gap-3 bg-[#25D366] hover:bg-[#128C7E] text-white font-bold py-4 px-8 rounded-full transition-all shadow-lg w-full sm:w-auto justify-center"
              >
                <MessageSquare className="h-6 w-6" />
                Ouvrir WhatsApp
              </a>
              <p className="text-xs text-gray-500 mt-3">
                Le lien s&apos;ouvre dans cet onglet (pas de nouvelle fenêtre).
              </p>
            </div>

            <button
              type="button"
              onClick={handleBackToShop}
              className="mt-8 inline-flex items-center gap-2 text-secondary font-bold hover:text-primary transition-colors"
            >
              <HomeIcon className="h-5 w-5" />
              Retour à la boutique (nouvelle commande)
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentWhatsAppBridge;
