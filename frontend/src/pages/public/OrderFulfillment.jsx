import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Truck,
  Store,
  User,
  Phone,
  MessageSquare,
  MapPin,
  CheckCircle,
  ArrowLeft,
  Home as HomeIcon,
  ShoppingBag,
} from "lucide-react";
import { toast } from "react-toastify";
import useCartStore from "../../store/cartStore";
import api, { getPublicSettings } from "../../services/api";
import { submitOrder } from "../../services/orderService";
import { useStorefrontBranding } from "../../context/StorefrontBrandingContext";
import { isCheckoutThemedVitrine } from "../../utils/vitrineTemplate";
import { useStorefrontHref } from "../../hooks/useStorefrontHref";
import ProductImage from "../../components/product/ProductImage";
import { resolveStoreMapsUrl } from "../../utils/pickupWhatsApp";
import { markYengapayCheckoutPending } from "../../utils/pendingYengapayReturn";

const STEPS = {
  CHOICE: "choice",
  PICKUP: "pickup",
  SUCCESS: "success",
};

const OrderFulfillment = () => {
  const { storeCode } = useParams();
  const navigate = useNavigate();
  const { checkout, home } = useStorefrontHref();
  const { displayName, vitrineTemplate, storeInfo } = useStorefrontBranding();
  const { items, clearCart, _hydrated } = useCartStore();

  const isThemed = isCheckoutThemedVitrine(vitrineTemplate);

  const shopHome =
    home ||
    `/${String(storeCode || import.meta.env.VITE_STORE_CODE || "spirit")
      .trim()
      .toLowerCase()}`;

  const total = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  const [step, setStep] = useState(STEPS.CHOICE);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
    customerNotes: "",
  });

  const { data: appSettings = {}, isSuccess: settingsLoaded } = useQuery({
    queryKey: ["publicSettings", storeCode],
    staleTime: 0,
    gcTime: 0,
    queryFn: async () => {
      const response = await getPublicSettings();
      return response.data;
    },
  });

  const dialCode =
    (appSettings.customer_whatsapp_dial_code || "+226").trim() || "+226";
  const dialPrefix = dialCode.endsWith(" ") ? dialCode : `${dialCode} `;
  const yengapayEnabled =
    appSettings.yengapay_enabled === "true" ||
    appSettings.yengapay_enabled === "1" ||
    appSettings.yengapay_enabled === "yes";

  const mapsUrl = resolveStoreMapsUrl(storeInfo, appSettings);

  useEffect(() => {
    if (!settingsLoaded) return;
    setFormData((prev) => {
      if (prev.customerPhone) return prev;
      return { ...prev, customerPhone: dialPrefix };
    });
  }, [settingsLoaded, dialPrefix]);

  useEffect(() => {
    if (!settingsLoaded || !yengapayEnabled) return;
    setPaymentMethod((prev) => (prev === "COD" ? "YENGAPAY" : prev));
  }, [settingsLoaded, yengapayEnabled]);

  useEffect(() => {
    if (!_hydrated) return;
    if (items.length === 0 && !orderSuccess) {
      navigate(shopHome);
    }
  }, [_hydrated, items.length, navigate, shopHome, orderSuccess]);

  const pageWrap = (inner) => (
    <div className={isThemed ? "checkout-page" : undefined}>{inner}</div>
  );

  const handlePhoneChange = (e) => {
    const { value } = e.target;
    if (!value.startsWith(dialPrefix)) {
      setFormData({
        ...formData,
        customerPhone: dialPrefix + value.replace(/^\+?\d*\s*/, ""),
      });
      return;
    }
    setFormData({ ...formData, customerPhone: value });
  };

  const handlePickupSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    const payload = {
      fulfillmentType: "PICKUP",
      paymentMethod,
      customerName: formData.customerName.trim(),
      customerPhone: formData.customerPhone.trim(),
      customerNotes: formData.customerNotes,
      deliveryCost: 0,
      totalAmount: total,
    };

    try {
      const response = await submitOrder(payload, items);
      if (response.data?.yengapayCheckoutUrl) {
        const code = String(storeCode || import.meta.env.VITE_STORE_CODE || "spirit")
          .trim()
          .toLowerCase();
        try {
          sessionStorage.setItem(
            `pending_payment_${response.data.orderNumber}`,
            code,
          );
          markYengapayCheckoutPending(response.data.orderNumber, code);
        } catch {
          /* ignore */
        }
        window.location.href = response.data.yengapayCheckoutUrl;
        return;
      }
      clearCart();
      setOrderSuccess(response.data);
      setStep(STEPS.SUCCESS);
      toast.success("Commande enregistrée !");
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      if (response.data?.whatsappLink) {
        window.open(response.data.whatsappLink, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      console.error("Erreur commande retrait:", error);
      const errorMessage =
        error.response?.data?.message ||
        error?.message ||
        "Une erreur est survenue lors de la commande.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const successMapsUrl =
    orderSuccess?.pickupMapsUrl || mapsUrl;

  if (step === STEPS.SUCCESS && orderSuccess) {
    return pageWrap(
      <div className="max-w-2xl mx-auto px-4 py-4 md:py-10 md:py-20 text-center">
        <div
          className={`bg-white p-8 shadow-xl border border-green-50 ${
            isThemed ? "checkout-success-panel rounded-lg" : "rounded-3xl"
          }`}
        >
          <div className="flex justify-center mb-6">
            <div className="bg-green-100 p-4 rounded-full">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-secondary tracking-tight">
            Merci pour la commande !
          </h1>
          <p className="mt-4 text-gray-600 text-lg">
            Votre commande{" "}
            <span className="font-bold text-primary">
              #{orderSuccess.orderNumber}
            </span>{" "}
            (retrait en boutique) a été enregistrée chez{" "}
            <span className="font-bold text-primary">{displayName}</span>.
          </p>

          {orderSuccess.whatsappLink && (
            <div className="mt-8 bg-primary/10 p-6 rounded-2xl border border-primary/20">
              <p className="text-secondary font-medium mb-4">
                Pour une confirmation rapide, envoyez-nous un message sur
                WhatsApp :
              </p>
              <a
                href={orderSuccess.whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 bg-[#25D366] hover:bg-[#128C7E] text-white font-bold py-4 px-8 rounded-full transition-all transform hover:scale-105 shadow-lg"
              >
                <MessageSquare className="h-6 w-6" />
                Confirmer sur WhatsApp
              </a>
            </div>
          )}

          {successMapsUrl && (
            <div className="mt-8 bg-primary/10 p-6 rounded-2xl border border-primary/20 text-left">
              <p className="text-secondary font-medium mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary shrink-0" />
                Où récupérer votre commande ?
              </p>
              <a
                href={successMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 bg-secondary hover:bg-secondary-light text-white font-bold py-4 px-8 rounded-full transition-all transform hover:scale-105 shadow-lg w-full sm:w-auto justify-center"
              >
                <MapPin className="h-6 w-6" />
                Voir l&apos;emplacement sur Maps
              </a>
              <p className="text-xs text-gray-500 mt-3">
                Conservez ce lien pour vous rendre en boutique au moment du
                retrait.
              </p>
            </div>
          )}

          {!successMapsUrl && (
            <p className="mt-6 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-4">
              L&apos;adresse de la boutique n&apos;est pas encore renseignée.
              Demandez le lieu exact de retrait via WhatsApp.
            </p>
          )}

          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={() => {
                clearCart();
                navigate(shopHome);
              }}
              className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-3 px-6 rounded-xl transition-colors"
            >
              <HomeIcon className="h-5 w-5" />
              Retour à l&apos;accueil
            </button>
          </div>
        </div>
      </div>,
    );
  }

  if (step === STEPS.PICKUP) {
    const phoneValid =
      formData.customerPhone.trim() &&
      formData.customerPhone.trim() !== dialCode.trim();

    return pageWrap(
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-10">
        <button
          type="button"
          onClick={() => setStep(STEPS.CHOICE)}
          className="mb-6 flex items-center gap-2 text-gray-500 hover:text-secondary font-medium transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Changer de mode
        </button>

        <h1
          className={`mb-2 text-center tracking-tight ${
            isThemed
              ? "checkout-vitrine-title"
              : "text-2xl md:text-3xl font-black text-secondary"
          }`}
        >
          Retrait en boutique
        </h1>
        <p className="text-center text-gray-500 mb-8">
          Identifiez-vous pour que {displayName} prépare votre commande.
        </p>

        <div className="grid gap-6 lg:grid-cols-5">
          <div
            className={`lg:col-span-3 bg-white p-4 md:p-8 shadow-sm border border-gray-100 ${
              isThemed ? "checkout-panel" : "rounded-3xl"
            }`}
          >
            <form onSubmit={handlePickupSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-wider">
                  Nom complet ou pseudo
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    name="customerName"
                    required
                    value={formData.customerName}
                    onChange={(e) =>
                      setFormData({ ...formData, customerName: e.target.value })
                    }
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                    placeholder="Votre nom"
                    autoComplete="name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-wider">
                  Numéro WhatsApp
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="tel"
                    name="customerPhone"
                    required
                    value={formData.customerPhone}
                    onChange={handlePhoneChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none font-mono"
                    placeholder={dialPrefix}
                    autoComplete="tel"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-wider">
                  Message (optionnel)
                </label>
                <textarea
                  name="customerNotes"
                  rows={3}
                  value={formData.customerNotes}
                  onChange={(e) =>
                    setFormData({ ...formData, customerNotes: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none resize-none"
                  placeholder="Créneau souhaité, instructions particulières…"
                />
              </div>

              {yengapayEnabled ? (
                <div className="space-y-3">
                  <p className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                    Mode de paiement
                  </p>
                  <label
                    className={`flex items-start gap-3 p-3 border-2 rounded-xl cursor-pointer transition-colors ${
                      paymentMethod === "YENGAPAY"
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-gray-200 hover:border-primary/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="pickupPaymentMethod"
                      value="YENGAPAY"
                      checked={paymentMethod === "YENGAPAY"}
                      onChange={() => setPaymentMethod("YENGAPAY")}
                      className="mt-1"
                    />
                    <div>
                      <span className="font-bold text-secondary">Payer maintenant (YengaPay)</span>
                      <p className="text-xs text-gray-500">Orange Money, Moov, Coris… — recommandé</p>
                    </div>
                  </label>
                  <label
                    className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${
                      paymentMethod === "COD"
                        ? "border-secondary/30 bg-gray-50"
                        : "border-gray-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="pickupPaymentMethod"
                      value="COD"
                      checked={paymentMethod === "COD"}
                      onChange={() => setPaymentMethod("COD")}
                      className="mt-1"
                    />
                    <div>
                      <span className="font-bold text-secondary">Payer en boutique</span>
                      <p className="text-xs text-gray-500">Espèces ou mobile money au retrait</p>
                    </div>
                  </label>
                </div>
              ) : null}

              {mapsUrl && (
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex gap-3">
                  <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-bold text-secondary">Lieu de retrait</p>
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline break-all"
                    >
                      Voir sur Google Maps
                    </a>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={
                  loading || !formData.customerName.trim() || !phoneValid
                }
                className="btn-primary w-full py-4 text-lg font-bold flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <MessageSquare className="h-6 w-6" />
                {loading
                  ? "Enregistrement…"
                  : paymentMethod === "YENGAPAY" && yengapayEnabled
                    ? "Payer avec YengaPay"
                    : "Valider et confirmer sur WhatsApp"}
              </button>

              <p className="text-xs text-gray-400 text-center">
                Votre commande sera enregistrée puis un message WhatsApp sera
                préparé avec le récapitulatif.
              </p>
            </form>
          </div>

          <div
            className={`lg:col-span-2 bg-white p-4 md:p-6 shadow-sm border border-gray-100 h-fit ${
              isThemed ? "checkout-panel" : "rounded-3xl"
            }`}
          >
            <h2 className="font-bold text-secondary flex items-center gap-2 mb-4">
              <ShoppingBag className="h-5 w-5 text-primary" />
              Votre panier
            </h2>
            <ul className="space-y-3 max-h-64 overflow-y-auto">
              {items.map((item) => (
                <li key={item.id} className="flex gap-3 text-sm">
                  <div className="h-12 w-12 shrink-0 rounded-lg overflow-hidden bg-gray-50 border">
                    <ProductImage
                      product={item}
                      alt={item.name}
                      className="h-full w-full object-contain"
                      wrapperClassName="h-full w-full"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-secondary line-clamp-2">
                      {item.name}
                    </p>
                    <p className="text-gray-500">
                      {item.quantity} × {item.price.toLocaleString("fr-FR")}{" "}
                      FCFA
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
              <span className="text-gray-500 text-sm uppercase tracking-wider">
                Total
              </span>
              <span className="font-black text-xl text-secondary">
                {total.toLocaleString("fr-FR")} FCFA
              </span>
            </div>
          </div>
        </div>
      </div>,
    );
  }

  return pageWrap(
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-10">
      <h1
        className={`mb-2 text-center tracking-tight ${
          isThemed
            ? "checkout-vitrine-title"
            : "text-2xl md:text-3xl font-black text-secondary"
        }`}
      >
        Comment souhaitez-vous recevoir votre commande ?
      </h1>
      <p className="text-center text-gray-500 mb-10">
        Choisissez le mode qui vous convient pour finaliser votre achat.
      </p>

      <div className="grid gap-6 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => {
            window.scrollTo({ top: 0, left: 0, behavior: "instant" });
            navigate(checkout);
          }}
          className={`group text-left bg-white p-6 md:p-8 shadow-sm border-2 border-gray-100 hover:border-primary hover:shadow-lg transition-all ${
            isThemed ? "checkout-panel" : "rounded-3xl"
          }`}
        >
          <div className="bg-primary/10 w-14 h-14 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
            <Truck className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-xl font-black text-secondary mb-2">
            Me faire livrer
          </h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            Indiquez votre adresse et suivez le parcours de livraison habituel
            avec calcul des frais.
          </p>
          <span className="inline-block mt-5 text-primary font-bold text-sm group-hover:underline">
            Continuer vers la livraison →
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setStep(STEPS.PICKUP);
            window.scrollTo({ top: 0, left: 0, behavior: "instant" });
          }}
          className={`group text-left bg-white p-6 md:p-8 shadow-sm border-2 border-gray-100 hover:border-secondary hover:shadow-lg transition-all ${
            isThemed ? "checkout-panel" : "rounded-3xl"
          }`}
        >
          <div className="bg-secondary/10 w-14 h-14 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-secondary/20 transition-colors">
            <Store className="h-7 w-7 text-secondary" />
          </div>
          <h2 className="text-xl font-black text-secondary mb-2">
            Passer chercher ma commande
          </h2>
          <p className="text-gray-500 text-sm leading-relaxed">
            Remplissez un court formulaire, envoyez votre demande sur WhatsApp et
            récupérez la commande en boutique.
          </p>
          <span className="inline-block mt-5 text-secondary font-bold text-sm group-hover:underline">
            Choisir le retrait sur place →
          </span>
        </button>
      </div>

      <div
        className={`mt-8 bg-gray-50 border border-gray-100 p-4 md:p-5 ${
          isThemed ? "checkout-panel" : "rounded-2xl"
        }`}
      >
        <p className="text-sm text-gray-600 flex items-center justify-between gap-4">
          <span className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-primary shrink-0" />
            {items.length} article{items.length > 1 ? "s" : ""} dans votre
            panier
          </span>
          <span className="font-black text-secondary whitespace-nowrap">
            {total.toLocaleString("fr-FR")} FCFA
          </span>
        </p>
      </div>
    </div>,
  );
};

export default OrderFulfillment;
