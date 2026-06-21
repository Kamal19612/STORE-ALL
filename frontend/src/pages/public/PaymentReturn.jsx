import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { CheckCircle, Clock, XCircle, Home as HomeIcon } from "lucide-react";
import { getPaymentStatus } from "../../services/api";
import { useStorefrontHref } from "../../hooks/useStorefrontHref";

const PaymentReturn = () => {
  const { storeCode } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { home } = useStorefrontHref();
  const orderNumber = searchParams.get("order") || "";

  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!orderNumber) {
      setError("Numéro de commande manquant.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 20;

    const poll = async () => {
      try {
        const res = await getPaymentStatus(orderNumber);
        if (cancelled) return;
        setStatus(res.data);
        setLoading(false);

        if (res.data.paymentStatus === "PENDING" && attempts < maxAttempts) {
          attempts += 1;
          setTimeout(poll, 3000);
        }
      } catch (err) {
        if (cancelled) return;
        setError("Impossible de vérifier le paiement.");
        setLoading(false);
      }
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [orderNumber]);

  const shopHome =
    home ||
    `/${String(storeCode || import.meta.env.VITE_STORE_CODE || "spirit")
      .trim()
      .toLowerCase()}`;

  const paid = status?.paymentStatus === "PAID";
  const failed =
    status?.paymentStatus === "FAILED" || status?.paymentStatus === "CANCELLED";
  const pending = status?.paymentStatus === "PENDING";

  return (
    <div className="max-w-xl mx-auto px-4 py-10 md:py-16 text-center">
      <div className="bg-white p-8 shadow-xl border border-gray-100 rounded-3xl">
        {loading && (
          <>
            <Clock className="h-16 w-16 text-primary mx-auto mb-4 animate-pulse" />
            <h1 className="text-2xl font-black text-secondary">Vérification du paiement…</h1>
            <p className="mt-3 text-gray-600">Commande #{orderNumber}</p>
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
              Votre commande <span className="font-bold text-primary">#{orderNumber}</span>{" "}
              a été payée avec succès.
            </p>
            {status?.whatsappLink ? (
              <a
                href={status.whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-6 bg-[#25D366] hover:bg-[#128C7E] text-white font-bold py-3 px-6 rounded-full"
              >
                Confirmer sur WhatsApp
              </a>
            ) : null}
          </>
        )}

        {!loading && !error && failed && (
          <>
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-black text-secondary">Paiement non abouti</h1>
            <p className="mt-3 text-gray-600">
              Le paiement de la commande #{orderNumber} a échoué ou a été annulé.
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
