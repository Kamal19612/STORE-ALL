import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import {
  MapPin,
  Phone,
  User,
  Home as HomeIcon,
  MessageSquare,
  Send,
  CheckCircle,
} from "lucide-react";
import axios from "axios";
import useCartStore from "../../store/cartStore";
import api, { getPublicSettings } from "../../services/api";
import { withShopPrefix } from "../../services/storefrontShopApiPrefix";
import { toast } from "react-toastify";
import { getExplicitStoreCode } from "../../services/store/storeContext";
import { useStorefrontBranding } from "../../context/StorefrontBrandingContext";
import ProductImage from "../../components/product/ProductImage";

// Instance axios sans intercepteur 401 → pour les appels publics sans token
const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
});

publicApi.interceptors.request.use((config) => {
  if (typeof config.url === "string" && config.url.startsWith("/")) {
    config.url = withShopPrefix(config.url);
  }
  return config;
});

// Toujours envoyer le store code (multi-store) même sur les appels publics.
publicApi.interceptors.request.use((config) => {
  config.headers = config.headers ?? {};
  const headerStore = getExplicitStoreCode();
  if (headerStore) {
    config.headers["X-Store-Code"] = headerStore;
  } else {
    delete config.headers["X-Store-Code"];
  }
  return config;
});

const Checkout = () => {
  const { storeCode } = useParams();
  const { vitrineTemplate } = useStorefrontBranding();
  const isThemedCheckout =
    vitrineTemplate === "alibaba" || vitrineTemplate === "brandsama";
  const { items, clearCart, _hydrated } = useCartStore();
  const navigate = useNavigate();

  const pageWrap = (inner) => (
    <div className={isThemedCheckout ? "checkout-page" : undefined}>{inner}</div>
  );

  const shopHome = `/${String(storeCode || import.meta.env.VITE_STORE_CODE || "spirit")
    .trim()
    .toLowerCase()}`;

  // Calculer le total directement pour garantir la réactivité
  const total = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
    customerAddress: "",
    customerNotes: "",
    customerLatitude: null,
    customerLongitude: null,
    deliveryType: "STANDARD",
    scheduledTime: "",
    manualLocationLink: "",
  });

  const shortLinkDebounceRef = useRef(null);
  const locationDebounceRef = useRef(null);
  // true si l'adresse exacte a été auto-remplie (pour ne pas écraser une saisie manuelle)
  const addressAutoFilledRef = useRef(false);
  // Miroir des coordonnées client pour les lire depuis resolveStoreLocation (évite la race condition)
  const customerCoordsRef = useRef({ lat: null, lng: null });

  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [linkLoading, setLinkLoading] = useState(false);
  const [distanceLoading, setDistanceLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [pushPrompt, setPushPrompt] = useState(null); // null | "asking" | "subscribed" | "denied"
  const [baseDeliveryCost, setBaseDeliveryCost] = useState(0);
  const [typeSurcharge, setTypeSurcharge] = useState(0);
  const [deliveryCost, setDeliveryCost] = useState(0);
  const [distance, setDistance] = useState(null);
  // Coordonnées du magasin résolues une seule fois (store_location peut être une URL ou "lat,lng")
  const [storeCoords, setStoreCoords] = useState(null);
  const [storeLocationResolving, setStoreLocationResolving] = useState(false);
  const [storeLocationFailed, setStoreLocationFailed] = useState(false);

  // useQuery met les settings en cache → pas de re-fetch au retour sur l'onglet
  const { data: appSettings = {}, isSuccess: settingsLoaded } = useQuery({
    queryKey: ["publicSettings", storeCode],
    staleTime: 0,
    gcTime: 0,
    queryFn: async () => {
      const response = await getPublicSettings();
      return response.data;
    },
  });

  // Indicatif (piloté par l'admin). Fallback: Burkina (+226).
  const dialCode = (appSettings.customer_whatsapp_dial_code || "+226").trim() || "+226";
  const dialPrefix = dialCode.endsWith(" ") ? dialCode : dialCode + " ";

  // Initialiser / réaligner le téléphone dès que les settings sont chargés.
  // On le fait 1) au premier chargement et 2) si l'admin change l'indicatif.
  useEffect(() => {
    if (!settingsLoaded) return;
    setFormData((prev) => {
      const current = (prev.customerPhone || "").trim();
      if (!current) {
        return { ...prev, customerPhone: dialPrefix };
      }
      // Si l'utilisateur avait l'ancien indicatif forcé, on le remplace.
      if (!prev.customerPhone.startsWith(dialPrefix)) {
        const rest = prev.customerPhone.replace(/^\+?[0-9]+\s*/, "");
        return { ...prev, customerPhone: dialPrefix + rest };
      }
      return prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsLoaded, dialPrefix]);

  const isResolvableStoreLocation = (loc) => {
    if (!loc || !String(loc).trim()) return false;
    const t = String(loc).trim().toLowerCase();
    if (t.includes("docs.google.com") || t.includes("spreadsheets") || t.includes("/sheet")) {
      return false;
    }
    const parts = t.split(",");
    if (parts.length === 2) {
      const lat = parseFloat(parts[0]);
      const lng = parseFloat(parts[1]);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return true;
      }
    }
    return (
      t.includes("google.com/maps") ||
      t.includes("maps.google") ||
      t.includes("maps.app.goo.gl") ||
      t.includes("goo.gl/")
    );
  };

  useEffect(() => {
    setStoreCoords(null);
    setStoreLocationFailed(false);
    setStoreLocationResolving(false);
    if (!appSettings.store_location) return;
    if (!isResolvableStoreLocation(appSettings.store_location)) {
      setStoreLocationFailed(true);
      return;
    }
    resolveStoreLocation(appSettings.store_location);
  }, [appSettings.store_location]);

  const resolveStoreLocation = async (loc) => {
    setStoreLocationResolving(true);
    setStoreLocationFailed(false);
    let resolved = null;

    // Format "lat,lng" direct
    const parts = loc.split(",");
    if (parts.length === 2) {
      const lat = parseFloat(parts[0]);
      const lng = parseFloat(parts[1]);
      if (!isNaN(lat) && !isNaN(lng)) resolved = { lat, lng };
    }

    // URL Google Maps → résolution via le backend
    if (!resolved) {
      try {
        const res = await publicApi.get(`/public/resolve-location?url=${encodeURIComponent(loc)}`);
        if (res.data?.success) resolved = { lat: res.data.lat, lng: res.data.lng };
        else console.error("store_location non résolu:", res.data?.message);
      } catch (e) {
        console.error("Impossible de résoudre store_location:", e);
      }
    }

    setStoreLocationResolving(false);
    if (!resolved) {
      setStoreLocationFailed(true);
      return;
    }
    // setStoreCoords déclenche l'useEffect de calcul de distance
    // (storeCoords est dans ses dépendances → le recalcul se fait automatiquement)
    setStoreCoords(resolved);
  };

  useEffect(() => {
    // Attendre que Zustand ait fini de restaurer le panier depuis localStorage
    // avant de décider de rediriger. Sans ce guard, un rechargement de page
    // (onglet mobile discardé, retour navigateur) vide le panier affiché.
    if (!_hydrated) return;
    if (items.length === 0 && !orderSuccess) {
      navigate(shopHome);
    }
  }, [_hydrated, items, navigate, orderSuccess, shopHome]);

  // Remonter en haut dès que la commande est confirmée
  // (pas de changement de route → ScrollToTop ne se déclenche pas)
  useEffect(() => {
    if (orderSuccess) {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      document.querySelectorAll("main").forEach((el) => {
        el.scrollTop = 0;
      });
      // Double RAF pour couvrir tout rendu différé
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          window.scrollTo({ top: 0, left: 0, behavior: "instant" });
          document.querySelectorAll("main").forEach((el) => {
            el.scrollTop = 0;
          });
        })
      );
    }
  }, [orderSuccess]);

  // Distance à vol d'oiseau (Haversine) — utilisée uniquement en fallback
  const haversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // Distance estimée par Haversine × 1.30 (calibré pour Ouagadougou — optimisé sur 3 trajets réels)
  const calculateDistance = async (lat1, lon1, lat2, lon2) => {
    return haversineDistance(lat1, lon1, lat2, lon2) * 1.30;
  };

  // Extraire les coordonnées d'une URL Google Maps complète (non-courte)
  const extractCoordinatesFromFullLink = (link) => {
    if (!link) return null;
    const patterns = [
      // !3d!4d en priorité : coordonnées exactes du pin (dans le champ data=)
      /!3d(-?[0-9]{1,3}\.[0-9]+)!4d(-?[0-9]{1,3}\.[0-9]+)/,
      /\/@(-?[0-9]{1,3}\.[0-9]+),(-?[0-9]{1,3}\.[0-9]+)/,    // /@lat,lng (viewport)
      /[?&]q=(-?[0-9]{1,3}\.[0-9]+),(-?[0-9]{1,3}\.[0-9]+)/,  // ?q=lat,lng
      /[?&]ll=(-?[0-9]{1,3}\.[0-9]+),(-?[0-9]{1,3}\.[0-9]+)/, // ?ll=lat,lng
    ];
    for (const regex of patterns) {
      const match = link.match(regex);
      if (match) {
        const lat = parseFloat(match[1]);
        const lng = parseFloat(match[2]);
        if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          return { lat, lng };
        }
      }
    }
    return null;
  };

  // Résoudre un lien court ou un Plus Code via le backend
  const resolveShortLink = async (link) => {
    try {
      const response = await publicApi.get(`/public/resolve-location?url=${encodeURIComponent(link)}`);
      if (response.data?.success) {
        return { lat: response.data.lat, lng: response.data.lng };
      }
    } catch (e) {
      console.error("Erreur résolution lien:", e);
    }
    return null;
  };

  // Résolution immédiate d'un lien/Plus Code collé (utilisée par onPaste et onChange)
  const resolveLinkValue = (value) => {
    const trimmed = value.trim();

    // Plus Code brut
    const isPlusCode = /^[0-9A-Z]{4,8}\+[0-9A-Z]{2,3}/i.test(trimmed);
    if (isPlusCode && trimmed.length > 5) {
      setLinkLoading(true);
      resolveShortLink(trimmed).then((coords) => {
        setLinkLoading(false);
        if (coords) {
          applyCoords(coords.lat, coords.lng, "manualLocationLink", value);
          toast.success("Coordonnées GPS extraites du Plus Code !");
        } else {
          toast.error("Plus Code non reconnu. Astuce: ajoutez la ville (ex: 9CXR+XVG, Ouagadougou).");
        }
      });
      return true;
    }

    // Lien court maps.app.goo.gl
    const isShortLink = value.includes("maps.app.goo.gl") || value.includes("goo.gl/");
    if (isShortLink && value.length > 20) {
      setLinkLoading(true);
      resolveShortLink(value).then((coords) => {
        setLinkLoading(false);
        if (coords) {
          applyCoords(coords.lat, coords.lng, "manualLocationLink", value);
          toast.success("Coordonnées GPS extraites avec succès !");
        } else {
          toast.error("Impossible d'extraire les coordonnées. Essayez un lien Google Maps classique.");
        }
      });
      return true;
    }

    // Lien Google Maps complet → extraction directe d'abord, backend en fallback
    const isGoogleMapsUrl = value.includes("google.com/maps") || value.includes("maps.google.com");
    if (isGoogleMapsUrl) {
      const coords = extractCoordinatesFromFullLink(value);
      if (coords) {
        applyCoords(coords.lat, coords.lng, "manualLocationLink", value);
        toast.success("Coordonnées GPS extraites du lien !");
        return true;
      }
      // Fallback backend : l'URL ne contient pas de coordonnées lisibles directement
      setLinkLoading(true);
      resolveShortLink(value).then((resolved) => {
        setLinkLoading(false);
        if (resolved) {
          applyCoords(resolved.lat, resolved.lng, "manualLocationLink", value);
          toast.success("Coordonnées GPS extraites avec succès !");
        } else {
          toast.error("Impossible d'extraire les coordonnées de ce lien.");
        }
      });
      return true;
    }

    return false;
  };

  // Géocodage inverse : coordonnées → adresse lisible via Nominatim
  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=fr`,
        { headers: { "User-Agent": "STORE-ALL/1.0" } }
      );
      const data = await res.json();
      if (!data?.address) return null;
      const a = data.address;
      const parts = [
        a.quarter || a.suburb || a.neighbourhood || a.hamlet || "",
        a.road || a.pedestrian || a.footway || "",
        a.city || a.town || a.village || a.county || "",
      ].filter(Boolean);
      return parts.length ? parts.join(", ") : (data.display_name?.split(",").slice(0, 3).join(",") || null);
    } catch {
      return null;
    }
  };

  // Met à jour les coordonnées sans utiliser de closure stale
  const applyCoords = (lat, lng, fieldName, fieldValue) => {
    // Miroir synchrone pour resolveStoreLocation (race condition)
    customerCoordsRef.current = { lat, lng };

    // Mise à jour immédiate des coordonnées (et du champ déclencheur si fourni)
    setFormData((prev) => ({
      ...prev,
      customerLatitude: lat,
      customerLongitude: lng,
      ...(fieldName ? { [fieldName]: fieldValue } : {}),
    }));

    // Géocodage inverse asynchrone → auto-remplir l'adresse si non saisie manuellement
    reverseGeocode(lat, lng).then((addr) => {
      if (!addr) return;
      setFormData((prev) => {
        if (prev.customerAddress && !addressAutoFilledRef.current) return prev;
        addressAutoFilledRef.current = true;
        return { ...prev, customerAddress: addr };
      });
    });
  };

  useEffect(() => {
    if (!formData.customerLatitude || !formData.customerLongitude || !storeCoords) return;

    setDistanceLoading(true);
    setDistance(null);

    console.info("[Coords] Boutique:", storeCoords.lat, storeCoords.lng);
    console.info("[Coords] Client:", formData.customerLatitude, formData.customerLongitude);

    calculateDistance(
      storeCoords.lat, storeCoords.lng,
      formData.customerLatitude, formData.customerLongitude
    ).then((d) => {
      setDistance(d);
      setDistanceLoading(false);
    });
  }, [formData.customerLatitude, formData.customerLongitude, storeCoords]);

  // Calculer les frais selon le type/mode (indépendant de la distance)
  useEffect(() => {
    let surcharge = 0;
    if (formData.deliveryType === "EXPRESS") {
      surcharge = parseInt(appSettings.express_surcharge || "1000");
    } else if (formData.deliveryType === "PROGRAMMER") {
      surcharge = parseInt(appSettings.scheduled_surcharge || "500");
    }
    setTypeSurcharge(surcharge);
  }, [formData.deliveryType, appSettings.express_surcharge, appSettings.scheduled_surcharge]);

  // Calculer les frais selon la distance
  useEffect(() => {
    let baseCost = 0;
    if (distance !== null) {
      baseCost = parseInt(appSettings.dist_tier_3_price || "3500");
      const d1 = parseFloat(appSettings.dist_tier_1_limit || "5");
      const p1 = parseInt(appSettings.dist_tier_1_price || "1000");
      const d2 = parseFloat(appSettings.dist_tier_2_limit || "10");
      const p2 = parseInt(appSettings.dist_tier_2_price || "2000");

      if (distance <= d1) {
        baseCost = p1;
      } else if (distance <= d2) {
        baseCost = p2;
      }
    }
    setBaseDeliveryCost(baseCost);
  }, [distance, appSettings.dist_tier_1_limit, appSettings.dist_tier_1_price, appSettings.dist_tier_2_limit, appSettings.dist_tier_2_price, appSettings.dist_tier_3_price]);

  // Calcul du coût global (Strict paramétrage Admin)
  useEffect(() => {
    // Toujours appliquer la distance et la surcharge selon les grilles de l'administrateur
    setDeliveryCost(baseDeliveryCost + typeSurcharge);
  }, [baseDeliveryCost, typeSurcharge]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "customerPhone") {
      // Garantir que l'indicatif (config admin) reste au début
      if (!value.startsWith(dialPrefix)) {
        setFormData({
          ...formData,
          [name]: dialPrefix + value.replace(/^\+?\d*\s*/, ""),
        });
        return;
      }
    }

    if (name === "customerAddress") {
      // L'utilisateur modifie manuellement l'adresse → désactiver l'auto-remplissage
      addressAutoFilledRef.current = false;
    }

    if (name === "manualLocationLink") {
      // Debounce pour la frappe clavier : ne déclenche la résolution
      // qu'après 500ms d'inactivité (onPaste déclenche immédiatement, sans debounce)
      if (shortLinkDebounceRef.current) clearTimeout(shortLinkDebounceRef.current);
      if (locationDebounceRef.current) clearTimeout(locationDebounceRef.current);
      shortLinkDebounceRef.current = setTimeout(() => {
        resolveLinkValue(value);
      }, 500);
    }

    setFormData({ ...formData, [name]: value });
  };

  const getGeolocation = () => {
    setGpsLoading(true);
    if (!navigator.geolocation) {
      toast.error(
        "La géolocalisation n'est pas supportée par votre navigateur.",
      );
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        applyCoords(latitude, longitude, "manualLocationLink",
          `https://www.google.com/maps?q=${latitude},${longitude}`);
        toast.success("Position récupérée avec succès !");
        setGpsLoading(false);
      },
      (error) => {
        console.error("Erreur GPS:", error);
        toast.error(
          "Impossible de récupérer votre position. Vérifiez vos permissions.",
        );
        setGpsLoading(false);
      },
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      ...formData,
      fulfillmentType: "DELIVERY",
      deliveryCost,
      distance,
      totalAmount: total + deliveryCost,
      items: items.map((item) => ({
        productId: item.id,
        quantity: item.quantity,
      })),
    };

    try {
      const response = await api.post("/orders", payload);
      setOrderSuccess(response.data);
      toast.success("Commande enregistrée !");
    } catch (error) {
      console.error("Erreur commande:", error);
      const errorMessage = error.response?.data?.message || "Une erreur est survenue lors de la commande.";
      const validationErrors = error.response?.data?.errors;

      if (validationErrors && Array.isArray(validationErrors)) {
        const detail = validationErrors.map(err => err.defaultMessage || err).join(", ");
        toast.error(`Erreur de validation: ${detail}`);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── Push notification helper ────────────────────────────────────────────────
  const VAPID_PUBLIC_KEY = "BFgwMeEPKmjceqgeKQqezk_yyf_FLa7LTW7eul_0HnSMfPfPFnKwH-fSGjxCUU5cmiCAdIvqlTJkSGUBkhPgFCw";

  const subscribePush = async (orderNumber) => {
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setPushPrompt("denied");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushPrompt("denied");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      const sub = existing || await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      const json = sub.toJSON();
      await publicApi.post("/notifications/push/customer-subscribe", {
        orderNumber,
        endpoint: json.endpoint,
        keys: json.keys,
      });
      setPushPrompt("subscribed");
    } catch (err) {
      console.error("Push subscribe error", err);
      setPushPrompt("denied");
    }
  };

  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
  }
  // ─────────────────────────────────────────────────────────────────────────────

  if (orderSuccess) {
    return pageWrap(
      <div className="max-w-2xl mx-auto px-4 py-4 md:py-10 md:py-20 text-center">
        <div
          className={`bg-white p-8 shadow-xl border border-green-50 ${
            isThemedCheckout ? "checkout-success-panel rounded-lg" : "rounded-3xl"
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
            a été reçue.
          </p>

          <div className="mt-8 bg-primary/10 p-6 rounded-2xl border border-primary/20">
            <p className="text-secondary font-medium mb-4">
              Pour une confirmation rapide, envoyez-nous un message sur WhatsApp
              :
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

          {/* Notification push client */}
          {pushPrompt === null && (
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-5 text-left">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🔔</span>
                <div className="flex-1">
                  <p className="font-bold text-blue-900 text-sm">
                    Recevoir des notifications de suivi ?
                  </p>
                  <p className="text-blue-700 text-xs mt-1">
                    Soyez alerté(e) dès que votre commande est confirmée ou annulée, même si vous fermez cette page.
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => {
                        setPushPrompt("asking");
                        subscribePush(orderSuccess.orderNumber);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
                    >
                      Oui, m'alerter
                    </button>
                    <button
                      onClick={() => setPushPrompt("denied")}
                      className="bg-white hover:bg-gray-50 text-gray-600 text-xs font-medium px-4 py-2 rounded-lg border border-gray-200 transition-colors"
                    >
                      Non merci
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {pushPrompt === "asking" && (
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center text-blue-700 text-sm">
              Activation en cours…
            </div>
          )}

          {pushPrompt === "subscribed" && (
            <div className="mt-6 bg-green-50 border border-green-200 rounded-2xl p-4 text-center text-green-700 text-sm font-medium">
              ✅ Vous serez notifié(e) dès que votre commande sera traitée.
            </div>
          )}

          <div className="mt-8 flex justify-center">
            <button
              onClick={() => {
                clearCart();
                navigate(shopHome);
              }}
              className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-3 px-6 rounded-xl transition-colors"
            >
              <HomeIcon className="h-5 w-5" />
              Retour à l'accueil
            </button>
          </div>
        </div>
      </div>,
    );
  }

  return pageWrap(
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-10">
      <h1
        className={`mb-8 text-center first-letter:uppercase lowercase tracking-tight ${
          isThemedCheckout
            ? "checkout-vitrine-title"
            : "text-2xl md:text-3xl font-black text-secondary"
        }`}
      >
        Finaliser ma commande
      </h1>

      <div className="w-full">
        {/* Formulaire */}
        <div
          className={`bg-white p-4 md:p-8 shadow-sm border border-gray-100 ${
            isThemedCheckout ? "checkout-panel" : "rounded-3xl"
          }`}
        >
          <form onSubmit={handleSubmit} autoComplete="off" className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-secondary flex items-center gap-2 mb-6">
                <span
                  className={`bg-primary text-white h-7 w-7 flex items-center justify-center text-sm ${
                    isThemedCheckout ? "checkout-step-badge" : "rounded-full"
                  }`}
                >
                  1
                </span>
                Informations Personnelles
              </h2>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-wider">
                  Nom complet ou Pseudo
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    name="customerName"
                    required
                    value={formData.customerName}
                    onChange={handleInputChange}
                    placeholder="Ex: Jean Dupont"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
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
                    onChange={handleInputChange}
                    placeholder="Ex: 0707070707"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-gray-100">
              <h2 className="text-xl font-bold text-secondary flex items-center gap-2 mb-6">
                <span
                  className={`bg-primary text-white h-7 w-7 flex items-center justify-center text-sm ${
                    isThemedCheckout ? "checkout-step-badge" : "rounded-full"
                  }`}
                >
                  2
                </span>
                Livraison
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Position GPS — affiché en premier sur mobile, à droite sur desktop */}
                <div className="flex flex-col md:order-last">
                  <label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-wider">
                    Position GPS
                  </label>
                  <div className="flex-1 bg-gray-50 p-4 rounded-2xl border border-dashed border-gray-300 flex flex-col">
                    <p className="text-xs text-gray-600 mb-3">
                      Pour aider le livreur, partagez votre position GPS actuelle.
                    </p>

                    {/* Lien ou Plus Code — intégré dans la section GPS */}
                    <div className="mb-3">
                      <label className="block text-xs font-bold text-gray-600 mb-1 uppercase tracking-wider">
                        Lien ou Plus Code Google Maps
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          name="manualLocationLink"
                          value={formData.manualLocationLink}
                          onChange={handleInputChange}
                          onPaste={(e) => {
                            // Déclencher immédiatement à la colle, sans debounce
                            const pasted = e.clipboardData.getData("text");
                            if (!pasted) return;
                            // Annuler le debounce éventuel du onChange
                            if (shortLinkDebounceRef.current) clearTimeout(shortLinkDebounceRef.current);
                            if (locationDebounceRef.current) clearTimeout(locationDebounceRef.current);
                            // Mise à jour du champ puis résolution immédiate
                            setFormData((prev) => ({ ...prev, manualLocationLink: pasted }));
                            resolveLinkValue(pasted);
                            e.preventDefault();
                          }}
                          placeholder="Lien Maps ou Plus Code (ex: 9CXR+XVG, Ouagadougou)"
                          className={`w-full pl-9 py-2 bg-white border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-sm ${linkLoading ? "pr-8 border-primary/50" : "pr-3 border-gray-200"}`}
                        />
                        {linkLoading && (
                          <svg className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {linkLoading ? "Extraction des coordonnées en cours..." : "Accepte : lien Google Maps, lien court (maps.app.goo.gl) ou Plus Code"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={getGeolocation}
                      disabled={gpsLoading}
                      className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold transition-all ${formData.customerLatitude
                        ? "bg-green-100 text-green-700 border border-green-200"
                        : "bg-white text-secondary border border-gray-200 hover:border-primary hover:text-primary active:scale-95"
                        }`}
                    >
                      <MapPin
                        className={`h-5 w-5 ${gpsLoading ? "animate-spin" : ""}`}
                      />
                      {formData.customerLatitude
                        ? "Position récupérée ✅"
                        : "Récupérer ma position GPS"}
                    </button>
                  </div>
                </div>

                {/* Adresse exacte — affiché en second sur mobile, à gauche sur desktop */}
                <div className="md:order-first">
                  <label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-wider">
                    Adresse exacte
                  </label>
                  <div className="relative h-full">
                    <HomeIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <textarea
                      name="customerAddress"
                      required
                      rows="3"
                      value={formData.customerAddress}
                      onChange={handleInputChange}
                      placeholder="Quartier, rue, repères visuels..."
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                    ></textarea>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">
                  Type de livraison
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "STANDARD", label: "Standard", icon: "🛵", desc: "Plage horaire", surcharge: 0 },
                    { id: "EXPRESS", label: "Express", icon: "⚡", desc: "Sous 1h", surcharge: parseInt(appSettings.express_surcharge || "1000") },
                    { id: "PROGRAMMER", label: "Programmer", icon: "📅", desc: "Heure précise", surcharge: parseInt(appSettings.scheduled_surcharge || "500") },
                  ].map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, deliveryType: type.id, scheduledTime: "" })}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all relative ${
                        formData.deliveryType === type.id
                          ? `border-primary bg-primary/5 text-secondary shadow-sm ${
                              isThemedCheckout ? "delivery-type-active" : ""
                            }`
                          : "border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200"
                      }`}
                    >
                      {type.surcharge > 0 && (
                        <span className="absolute -top-2 -right-1 md:-right-2 bg-secondary text-white text-[7px] md:text-[8px] px-1 md:px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap">
                          +{type.surcharge} F
                        </span>
                      )}
                      <span className="text-lg md:text-xl mb-1" translate="no">{type.icon}</span>
                      <span className="text-[10px] md:text-xs font-bold leading-tight" translate="no">{type.label}</span>
                      <span className="text-[8px] md:text-[10px] opacity-70 leading-tight hidden xs:block" translate="no">{type.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {formData.deliveryType === "STANDARD" && (
                <div className="pt-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">
                    Plage horaire souhaitée
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {["Matin (8h-12h)", "Après-midi (14h-18h)"].map((range) => (
                      <button
                        key={range}
                        type="button"
                        onClick={() => setFormData({ ...formData, scheduledTime: range })}
                        className={`py-2 px-3 rounded-lg border text-sm transition-all ${formData.scheduledTime === range
                          ? "bg-primary text-secondary border-primary font-bold shadow-sm"
                          : "bg-white border-gray-200 text-gray-600 hover:border-primary/50"
                          }`}
                      >
                        {range}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {formData.deliveryType === "EXPRESS" && (
                <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 mt-2">
                  <p className="text-sm text-orange-800 flex items-center gap-2 font-medium">
                    <span className="text-lg">⚡</span> Livraison prioritaire immédiate (estimée sous 45-60 min).
                  </p>
                </div>
              )}

              {formData.deliveryType === "PROGRAMMER" && (
                <div className="pt-2">
                  <label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-wider">
                    Heure précise de livraison
                  </label>
                  <input
                    type="time"
                    name="scheduledTime"
                    required
                    value={formData.scheduledTime}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                  />
                </div>
              )}

              {settingsLoaded && !appSettings.store_location && !distanceLoading && distance === null && (
                <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 mt-4 text-sm text-amber-800">
                  ⚠️ La position du magasin n'est pas configurée (lien Google Maps ou coordonnées GPS requis). Contactez l'administrateur.
                </div>
              )}

              {settingsLoaded && storeLocationFailed && !distanceLoading && distance === null && (
                <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 mt-4 text-sm text-amber-800">
                  ⚠️ Le lien de position du magasin est invalide (un Google Sheet ne convient pas). Demandez à l'administrateur un lien Google Maps ou des coordonnées GPS.
                </div>
              )}

              {(distanceLoading || distance !== null) && (
                <div className="bg-primary/5 p-4 rounded-2xl border border-primary/20 mt-4 overflow-hidden">
                  {distanceLoading ? (
                    <div className="flex items-center justify-center gap-3 text-gray-500">
                      <svg className="animate-spin h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span className="text-sm font-medium">Calcul de la distance en cours...</span>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs font-bold text-gray-500 uppercase">Distance estimée</p>
                        <p className="text-lg font-black text-secondary">{distance.toFixed(1)} km</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-gray-500 uppercase">Coût livraison</p>
                        <p className="text-lg font-black text-primary">
                          {deliveryCost === 0 ? "GRATUIT" : `${deliveryCost.toLocaleString()} FCFA`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Récapitulatif Final */}
              <div className="mt-8 pt-6 border-t-2 border-dashed border-gray-100 space-y-3">
                <div className="flex justify-between items-center text-gray-600">
                  <span className="text-sm font-medium">Sous-total (Produits)</span>
                  <span className="font-bold">{total.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between items-center text-gray-600">
                  <span className="text-sm font-medium">Type de livraison ({formData.deliveryType})</span>
                  <span className="font-bold text-secondary">
                    {(() => {
                      if (typeSurcharge > 0) return `+ ${typeSurcharge.toLocaleString()} FCFA`;
                      return "Inclus";
                    })()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-gray-600">
                  <span className="text-sm font-medium">Frais de zone (Distance)</span>
                  <span className="font-bold text-primary">
                    {(() => {
                      const hasCustomerCoords =
                        formData.customerLatitude != null && formData.customerLongitude != null;
                      if (distanceLoading) {
                        return <span className="text-xs text-gray-400 animate-pulse">Calcul...</span>;
                      }
                      if (distance !== null) {
                        return `+ ${baseDeliveryCost.toLocaleString()} FCFA`;
                      }
                      if (hasCustomerCoords && (storeLocationResolving || (appSettings.store_location && !storeCoords))) {
                        return <span className="text-xs text-gray-400 animate-pulse">Calcul magasin...</span>;
                      }
                      if (hasCustomerCoords && (storeLocationFailed || !appSettings.store_location)) {
                        return <span className="text-xs text-amber-600">Magasin non localisé</span>;
                      }
                      return <span className="text-xs text-gray-400">Partagez votre position</span>;
                    })()}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-3 mt-2 border-t border-gray-100">
                  <span className="text-lg font-black text-secondary uppercase tracking-tight">Total à payer</span>
                  <span className="text-2xl font-black text-secondary">
                    {(total + deliveryCost).toLocaleString()} FCFA
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1 uppercase tracking-wider">
                  Notes (Optionnel)
                </label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <textarea
                    name="customerNotes"
                    rows="2"
                    value={formData.customerNotes}
                    onChange={handleInputChange}
                    placeholder="Précisions pour la livraison..."
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                  ></textarea>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={
                loading ||
                distanceLoading ||
                distance === null ||
                !formData.customerName.trim() ||
                !formData.customerPhone.trim() ||
                formData.customerPhone.trim() === dialCode ||
                !formData.customerAddress.trim() ||
                (formData.deliveryType === "PROGRAMMER" && !formData.scheduledTime)
              }
              className="w-full btn-primary py-4 text-lg flex items-center justify-center gap-3 shadow-xl shadow-primary/20 mt-6 disabled:bg-gray-300 disabled:shadow-none transition-all"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Traitement...
                </span>
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  Confirmer ma commande
                </>
              )}
            </button>
            {(distance === null || !formData.customerName.trim() || !formData.customerPhone.trim() || formData.customerPhone.trim() === dialCode || !formData.customerAddress.trim() || (formData.deliveryType === "PROGRAMMER" && !formData.scheduledTime)) && !loading && (
              <p className="text-center text-[10px] text-red-500 mt-2 font-bold uppercase tracking-widest">
                {formData.customerLatitude && (storeLocationFailed || !appSettings.store_location)
                  ? "⚠️ Position du magasin invalide ou manquante — contactez l'administrateur"
                  : "⚠️ Veuillez remplir tous les champs obligatoires et récupérer votre position GPS pour continuer"}
              </p>
            )}
          </form>
        </div>

        {/* Récapitulatif */}
        {/* Section Récapitulatif de la Commande (Masquée)
        <div className="space-y-6">
          <div className="bg-secondary text-white p-8 rounded-3xl shadow-xl">
            <h2 className="text-xl font-bold mb-6 uppercase tracking-tight flex items-center gap-2">
              <ShoppingBag className="text-primary" />
              Résumé de la commande
            </h2>

            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center bg-secondary-light/50 p-3 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-white rounded-lg flex-shrink-0 overflow-hidden">
                      <ProductImage
                        product={item}
                        alt={item.name}
                        className="h-full w-full object-contain object-center"
                        wrapperClassName="h-full w-full"
                      />
                    </div>
                    <div>
                      <p className="font-bold text-sm line-clamp-1">
                        {item.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        Qté: {item.quantity}
                      </p>
                    </div>
                  </div>
                  <span className="font-bold text-primary">
                    {(item.price * item.quantity).toLocaleString()} FCFA
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-8 border-t border-secondary-light space-y-4">
              <div className="flex justify-between text-gray-300">
                <span>Sous-total</span>
                <span>{total.toLocaleString()} FCFA</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Livraison</span>
                <span className="text-xs italic">À définir</span>
              </div>
              <div className="flex justify-between items-center text-2xl font-black pt-4 border-t border-secondary-light">
                <span className="text-primary uppercase text-sm tracking-widest">
                  Total
                </span>
                <span>{total.toLocaleString()} FCFA</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-100 flex items-start gap-4">
            <div className="bg-primary/10 p-3 rounded-2xl text-primary">
              <MessageSquare className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-bold text-secondary">Besoin d'aide ?</h4>
              <p className="text-sm text-gray-500 mt-1">
                Notre équipe est disponible sur WhatsApp pour répondre à vos
                questions sur la livraison.
              </p>
            </div>
          </div>
        </div>
        */}
      </div>
    </div>,
  );
};

export default Checkout;
