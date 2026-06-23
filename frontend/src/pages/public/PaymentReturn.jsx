import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { CheckCircle, Clock, ExternalLink, XCircle, Home as HomeIcon } from "lucide-react";
import { getPaymentStatus, resolveYengapayReturn } from "../../services/api";
import { useStorefrontHref } from "../../hooks/useStorefrontHref";
import { clearCartAfterPayment } from "../../utils/cartAfterPayment";
import { setActiveStoreCode } from "../../services/store/storeContext";

const SUCCESS_YENGAPAY_STATUSES = new Set(["successful", "success", "done", "completed", "paid"]);

const PaymentReturn = () => {
  const { storeCode } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { home } = useStorefrontHref();
  const orderNumber = searchParams.get("order") || "";
  const yengapayPaymentId = searchParams.get("yengapay_payment_id") || "";
  const yengapayStatus = (searchParams.get("yengapay_status") || "").toLowerCase();

  const [status, setStatus] = useState(null);
  const [resolvedOrderNumber, setResolvedOrderNumber] = useState(orderNumber);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const whatsappRedirected = useRef(false);

  useEffect(() => {
    const key = resolvedOrderNumber || orderNumber;
    if (!key) return;
    try {
      const pendingStore = sessionStorage.getItem(`pending_payment_${key}`);
      if (pendingStore && pendingStore.trim()) {
        setActiveStoreCode(pendingStore.trim().toLowerCase());
      }
    } catch {
      /* ignore */
    }
  }, [orderNumber, resolvedOrderNumber]);

  useEffect(() => {
    const yengaSuccess = SUCCESS_YENGAPAY_STATUSES.has(yengapayStatus);

    if (!orderNumber && !yengapayPaymentId) {
      setError("Référence de paiement manquante.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 20;

    const applyStatus = (data) => {
      setStatus(data);
      setLoading(false);
      if (data.orderNumber) {
        setResolvedOrderNumber(data.orderNumber);
      }
      if (data.storeCode) {
        try {
          setActiveStoreCode(data.storeCode.trim().toLowerCase());
        } catch {
          /* ignore */
        }
      }
    };

    const maybeClearCart = (data) => {
      const yengaOk = SUCCESS_YENGAPAY_STATUSES.has(yengapayStatus);
      if (
        data.paymentStatus === "PAID" ||
        yengaOk ||
        data.paymentStatus === "FAILED" ||
        data.paymentStatus === "CANCELLED"
      ) {
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
    };

    const pollByOrder = async () => {
      try {
        const res = await getPaymentStatus(orderNumber);
        if (cancelled) return;
        applyStatus(res.data);
        maybeClearCart(res.data);

        if (res.data.paymentStatus === "PENDING" && attempts < maxAttempts) {
          attempts += 1;
          setTimeout(pollByOrder, 3000);
        }
      } catch {
        if (cancelled) return;
        setError("Impossible de vérifier le paiement.");
        setLoading(false);
      }
    };

    const resolveByYengapayId = async () => {
      try {
        const res = await resolveYengapayReturn(
          yengapayPaymentId,
          yengapayStatus || undefined,
        );
        if (cancelled) return;
        applyStatus(res.data);
        maybeClearCart(res.data);

        if (res.data.paymentStatus === "PENDING" && attempts < maxAttempts) {
          attempts += 1;
          setTimeout(resolveByYengapayId, 3000);
        }
      } catch {
        if (cancelled) return;
        setError("Paiement introuvable ou non reconnu.");
        setLoading(false);
      }
    };

    if (orderNumber) {
      pollByOrder();
    } else {
      resolveByYengapayId();
    }

    return () => {
      cancelled = true;
    };
  }, [orderNumber, yengapayPaymentId, yengapayStatus]);

  const displayOrder = resolvedOrderNumber || orderNumber;
  const paid = status?.paymentStatus === "PAID";
  const failed =
    status?.paymentStatus === "FAILED" || status?.paymentStatus === "CANCELLED";
  const pending = status?.paymentStatus === "PENDING";
  const yengaSuccess = SUCCESS_YENGAPAY_STATUSES.has(yengapayStatus);

  useEffect(() => {
    const canRedirect =
      status?.whatsappLink &&
      (paid || (yengaSuccess && status.whatsappLink));
    if (!canRedirect || whatsappRedirected.current) return;
    whatsappRedirected.current = true;

    const code = String(
      storeCode || status?.storeCode || import.meta.env.VITE_STORE_CODE || "spirit",
    )
      .trim()
      .toLowerCase();
    const order = encodeURIComponent(displayOrder || status.orderNumber || orderNumber);
    const extra = yengapayPaymentId
      ? `&yengapay_payment_id=${encodeURIComponent(yengapayPaymentId)}${
          yengapayStatus ? `&yengapay_status=${encodeURIComponent(yengapayStatus)}` : ""
        }`
      : "";
    navigate(`/${code}/paiement/whatsapp?order=${order}${extra}`, { replace: true });
  }, [paid, yengaSuccess, status, displayOrder, orderNumber, storeCode, navigate, yengapayPaymentId, yengapayStatus]);

  const shopHome =
    home ||
    `/${String(storeCode || status?.storeCode || import.meta.env.VITE_STORE_CODE || "spirit")
      .trim()
      .toLowerCase()}`;

  return (
    <div className="max-w-xl mx-auto px-4 py-10 md:py-16 text-center">
      <div className="bg-white p-8 shadow-xl border border-gray-100 rounded-3xl">
        {loading && (
          <>
            <Clock className="h-16 w-16 text-primary mx-auto mb-4 animate-pulse" />
            <h1 className="text-2xl font-black text-secondary">Vérification du paiement…</h1>
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
          </>
        )}

        {!loading && !error && paid && (
          <>
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-black text-secondary">Paiement confirmé !</h1>
            <p className="mt-3 text-gray-600">
              Votre commande{" "}
              {displayOrder ? (
                <span className="font-bold text-primary">#{displayOrder}</span>
              ) : (
                "a"
              )}{" "}
              a été payée avec succès.
            </p>
            {status?.whatsappLink ? (
              <div className="mt-6 space-y-3">
                <p className="text-sm text-gray-500">
                  Vous allez être redirigé vers la page de confirmation WhatsApp.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const code = String(
                      storeCode || status?.storeCode || import.meta.env.VITE_STORE_CODE || "spirit",
                    )
                      .trim()
                      .toLowerCase();
                    navigate(
                      `/${code}/paiement/whatsapp?order=${encodeURIComponent(displayOrder)}`,
                    );
                  }}
                  className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white font-bold py-3 px-6 rounded-full"
                >
                  <ExternalLink className="h-5 w-5" />
                  Confirmer sur WhatsApp
                </button>
              </div>
            ) : (
              <p className="mt-4 text-sm text-amber-700">
                Paiement enregistré. Contactez la boutique si vous souhaitez confirmer par WhatsApp.
              </p>
            )}
          </>
        )}

        {!loading && !error && failed && (
          <>
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-black text-secondary">Paiement non abouti</h1>
            <p className="mt-3 text-gray-600">
              Le paiement{displayOrder ? ` de la commande #${displayOrder}` : ""} a échoué ou a été annulé.
            </p>
          </>
        )}

        {!loading && !error && pending && (
          <>
            <Clock className="h-16 w-16 text-amber-500 mx-auto mb-4" />
            <h1 className="text-2xl font-black text-secondary">Paiement en cours</h1>
            <p className="mt-3 text-gray-600">
              Votre paiement est en attente de confirmation. Vous recevrez une notification
              dès validation.
            </p>
          </>
        )}

        <button
          type="button"
          onClick={() => navigate(shopHome)}
          className="mt-8 inline-flex items-center gap-2 text-secondary font-bold hover:text-primary transition-colors"
        >
          <HomeIcon className="h-5 w-5" />
          Retour à l&apos;accueil
        </button>
      </div>
    </div>
  );
};

export default PaymentReturn;
