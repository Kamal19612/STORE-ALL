import { useEffect, useRef, useCallback } from "react";
import { toast } from "react-toastify";
import useAuthStore from "../store/authStore";
import { sendBrowserNotification } from "./useBrowserNotifications";
import { EventSourcePolyfill } from "event-source-polyfill";
import { getExplicitStoreCode } from "../services/store/storeContext";
import { isDisplayablePdfFieldValue } from "../utils/pdfFieldDisplay";

// ─── Audio ────────────────────────────────────────────────────────────────────

function formatItemCustomizations(itemCustomizations) {
  if (!Array.isArray(itemCustomizations) || itemCustomizations.length === 0) {
    return "";
  }
  return itemCustomizations
    .map((item) => {
      const fields = (Array.isArray(item.fields) ? item.fields : []).filter((f) =>
        isDisplayablePdfFieldValue(f?.value),
      );
      if (fields.length === 0) return "";
      const lines = fields.map((f) => `  • ${f.label || f.key}: ${f.value ?? ""}`);
      return `📝 ${item.productName || "Produit"}\n${lines.join("\n")}`;
    })
    .filter(Boolean)
    .join("\n");
}

let sharedAudioCtx = null;

function getAudioContext() {
  if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    sharedAudioCtx = new AC();
  }
  return sharedAudioCtx;
}

function unlockAudio() {
  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") ctx.resume();
}
if (typeof window !== "undefined") {
  ["click", "touchstart", "keydown"].forEach((evt) =>
    window.addEventListener(evt, unlockAudio, { once: false, passive: true })
  );
}

async function playNotificationSound(type) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") await ctx.resume();

    const beep = (freq, startTime, duration, gainValue = 0.4) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(gainValue, startTime + 0.01);
      gain.gain.linearRampToValueAtTime(0, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration + 0.05);
    };

    if (type === "order") {
      beep(880, ctx.currentTime + 0.0, 0.12);
      beep(880, ctx.currentTime + 0.18, 0.12);
      beep(880, ctx.currentTime + 0.36, 0.20);
    } else {
      beep(660, ctx.currentTime + 0.0, 0.15);
      beep(880, ctx.currentTime + 0.22, 0.25, 0.5);
    }
  } catch (_) {}
}

// ─── Hook principal SSE ───────────────────────────────────────────────────────

/**
 * Ouvre UNE SEULE connexion SSE par rôle dans le Layout.
 * Diffuse les événements via window.dispatchEvent(CustomEvent) pour
 * que les pages enfants puissent s'abonner sans créer une 2ème connexion.
 *
 * @param {"admin" | "delivery"} role
 */
export function useNotifications(role) {
  const { token } = useAuthStore();
  const esRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const reconnectDelayRef = useRef(5000);

  const connect = useCallback(() => {
    if (!token) return;

    // Fermer une éventuelle connexion précédente avant d'en ouvrir une nouvelle
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    const baseUrl = import.meta.env.VITE_API_URL || "/api";
    const endpoint = role === "delivery" ? "delivery" : "admin";
    const urlNoQuery = `${baseUrl}/notifications/stream/${endpoint}`;

    const headers = { Authorization: `Bearer ${token}` };
    // Pool livraison global : pas de filtre boutique sur le flux SSE.
    if (role !== "delivery") {
      const storeCode = getExplicitStoreCode();
      if (storeCode) headers["X-Store-Code"] = storeCode;
    }

    const es = new EventSourcePolyfill(urlNoQuery, {
      headers,
      heartbeatTimeout: 60000,
    });
    esRef.current = es;

    es.addEventListener("new_order", (e) => {
      try {
        const data = JSON.parse(e.data);
        const isPickup = data.fulfillmentType === "PICKUP";
        const typeLabel = isPickup
          ? "🏪 Retrait"
          : data.deliveryType === "EXPRESS"
            ? "⚡ Express"
            : data.deliveryType === "PROGRAMMER"
              ? "🕐 Programmée"
              : "";
        const orderTitle = isPickup ? "🏪 Retrait en boutique" : "🛒 Nouvelle commande";

        const customizationLines = formatItemCustomizations(data.itemCustomizations);
        const baseLine = `${orderTitle} #${data.orderNumber}\n${data.customerName}${typeLabel ? " · " + typeLabel : ""}`;
        const toastMessage = customizationLines
          ? `${baseLine}\n\n${customizationLines}`
          : baseLine;

        playNotificationSound("order");

        toast.info(toastMessage, { autoClose: 12000, style: { whiteSpace: "pre-line" } });

        // Notification système uniquement si l'onglet est en arrière-plan
        // (évite le doublon avec le Web Push qui arrive aussi du backend)
        if (document.hidden) {
          const bodyBase = `#${data.orderNumber} — ${data.customerName}${typeLabel ? "\n" + typeLabel : ""}`;
          sendBrowserNotification(orderTitle, {
            body: customizationLines ? `${bodyBase}\n\n${customizationLines}` : bodyBase,
            tag: `order-${data.orderNumber}`,
            requireInteraction: true,
          });
        }

        window.dispatchEvent(new CustomEvent("sse:new_order", { detail: data }));
      } catch (_) {}
    });

    es.addEventListener("new_delivery", (e) => {
      try {
        const data = JSON.parse(e.data);
        const typeLabel =
          data.deliveryType === "EXPRESS" ? "⚡ Express" :
          data.deliveryType === "PROGRAMMER" ? "🕐 Programmée" : "";

        playNotificationSound("delivery");

        toast.success(
          `🚚 Nouvelle livraison disponible !\n#${data.orderNumber}${typeLabel ? " · " + typeLabel : ""}`,
          { autoClose: 12000, style: { whiteSpace: "pre-line" } }
        );

        // Notification système uniquement si l'onglet est en arrière-plan
        if (document.hidden) {
          sendBrowserNotification("🚚 Nouvelle livraison disponible", {
            body: `Commande #${data.orderNumber}${typeLabel ? " · " + typeLabel : ""}`,
            tag: `delivery-${data.orderNumber}`,
            requireInteraction: true,
          });
        }

        window.dispatchEvent(new CustomEvent("sse:new_delivery", { detail: data }));
      } catch (_) {}
    });

    es.addEventListener("order_status", (e) => {
      try {
        const data = JSON.parse(e.data);
        // Exemple: "Commande #ORD-... confirmée"
        const isPickup = data.fulfillmentType === "PICKUP";
        const statusLabel = data.status === "CONFIRMED"
          ? "confirmée"
          : data.status === "CANCELLED"
            ? "annulée"
            : data.status === "REJECTED"
              ? "rejetée"
              : data.status === "SHIPPED"
                ? "en livraison"
                : data.status === "DELIVERED"
                  ? (isPickup ? "récupérée" : "livrée")
                  : String(data.status || "").toLowerCase();

        toast.info(
          `📦 Statut mis à jour : #${data.orderNumber} → ${statusLabel}`,
          { autoClose: 6000 }
        );

        window.dispatchEvent(new CustomEvent("sse:order_status", { detail: data }));
      } catch (_) {}
    });

    es.addEventListener("connected", () => {
      reconnectDelayRef.current = 5000;
      console.info(`[SSE] Connecté au flux ${role}`);
    });

    es.onerror = (evt) => {
      const status = evt?.status;
      if (status === 401 || status === 403) {
        try {
          useAuthStore.getState().logout?.();
        } catch {}
        if (!window.location.pathname.includes("/login")) window.location.href = "/login";
        return;
      }
      es.close();
      esRef.current = null;
      const delay = reconnectDelayRef.current;
      reconnectDelayRef.current = Math.min(Math.round(delay * 1.5), 60000);
      reconnectTimerRef.current = setTimeout(connect, delay);
    };
  }, [token, role]);

  useEffect(() => {
    const initialTimer = setTimeout(connect, 1500);
    return () => {
      clearTimeout(initialTimer);
      esRef.current?.close();
      esRef.current = null;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };
  }, [connect]);
}

// ─── Hook secondaire pour les pages enfants ───────────────────────────────────

/**
 * Permet à une page enfant de s'abonner aux événements SSE
 * sans créer de nouvelle connexion.
 *
 * @param {"new_order" | "new_delivery"} eventType
 * @param {Function} callback  - appelé avec `detail` de l'événement
 */
export function useSseEvent(eventType, callback) {
  const stableCallback = useRef(callback);
  useEffect(() => { stableCallback.current = callback; }, [callback]);

  useEffect(() => {
    const handler = (e) => stableCallback.current(e.detail);
    window.addEventListener(`sse:${eventType}`, handler);
    return () => window.removeEventListener(`sse:${eventType}`, handler);
  }, [eventType]);
}
