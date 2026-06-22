import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { getStorefrontCodeFromPath } from "../services/storefrontShopApiPrefix";
import { resolveProductImageUrl } from "../utils/productMedia";
import {
  clearCartPdfBlobs,
  removeCartPdfBlob,
  setCartPdfBlob,
} from "./cartPdfBlobStore";

function cartStorageKey() {
  return getStorefrontCodeFromPath() ?? (import.meta.env.VITE_STORE_CODE || "spirit").toLowerCase();
}

function newCartLineId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeCartProduct(product) {
  return {
    ...product,
    mainImage: resolveProductImageUrl(product?.mainImage) || product?.mainImage,
  };
}

function needsPdfCustomization(product) {
  return Boolean(product?.hasPdfTemplate);
}

const shopCartJsonStorage = createJSONStorage(() => ({
  getItem: () => localStorage.getItem(`cart_${cartStorageKey()}`),
  setItem: (_name, value) => localStorage.setItem(`cart_${cartStorageKey()}`, value),
  removeItem: () => localStorage.removeItem(`cart_${cartStorageKey()}`),
}));

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      _hydrated: false,

      addItem: (product, customization = null) => {
        const { items } = get();
        const normalized = normalizeCartProduct(product);

        if (needsPdfCustomization(product)) {
          const { pdfFieldValues, filledPdfBlob } = customization || {};
          if (!filledPdfBlob || !pdfFieldValues) {
            throw new Error("Le formulaire PDF doit être rempli avant l'ajout au panier.");
          }
          const cartLineId = newCartLineId();
          setCartPdfBlob(cartLineId, filledPdfBlob);
          set({
            items: [
              ...items,
              {
                ...normalized,
                cartLineId,
                quantity: 1,
                hasPdfCustomization: true,
                pdfFieldValues,
              },
            ],
          });
          return cartLineId;
        }

        const existingItem = items.find(
          (item) => item.id === product.id && !item.hasPdfCustomization,
        );
        if (existingItem) {
          set({
            items: items.map((item) =>
              item.cartLineId === existingItem.cartLineId
                ? { ...item, quantity: item.quantity + 1 }
                : item,
            ),
          });
          return existingItem.cartLineId;
        }

        const cartLineId = newCartLineId();
        set({
          items: [
            ...items,
            {
              ...normalized,
              cartLineId,
              quantity: 1,
              hasPdfCustomization: false,
            },
          ],
        });
        return cartLineId;
      },

      removeItem: (cartLineId) => {
        removeCartPdfBlob(cartLineId);
        set({ items: get().items.filter((item) => item.cartLineId !== cartLineId) });
      },

      /** Retire la ligne standard (sans PDF) d'un produit — compat cartes produit. */
      removeProductFromCart: (productId) => {
        const line = get().items.find(
          (item) => item.id === productId && !item.hasPdfCustomization,
        );
        if (line) get().removeItem(line.cartLineId);
      },

      updateQuantity: (cartLineId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(cartLineId);
          return;
        }
        set({
          items: get().items.map((item) =>
            item.cartLineId === cartLineId ? { ...item, quantity } : item,
          ),
        });
      },

      clearCart: () => {
        clearCartPdfBlobs();
        set({ items: [] });
      },

      isProductInCart: (productId) =>
        get().items.some((item) => item.id === productId),

      get total() {
        return get().items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0,
        );
      },

      get itemCount() {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },
    }),
    {
      name: "cart",
      storage: shopCartJsonStorage,
      partialize: (state) => ({
        items: state.items.map(
          ({ cartLineId, id, name, price, quantity, mainImage, hasPdfCustomization, pdfFieldValues, requiresPdfForm, hasPdfTemplate, slug }) => ({
            cartLineId: cartLineId || newCartLineId(),
            id,
            name,
            price,
            quantity,
            mainImage,
            hasPdfCustomization: Boolean(hasPdfCustomization),
            pdfFieldValues: pdfFieldValues || null,
            requiresPdfForm: Boolean(requiresPdfForm),
            hasPdfTemplate: Boolean(hasPdfTemplate),
            slug,
          }),
        ),
      }),
      onRehydrateStorage: () => (state) => {
        const items = state?.items?.map((item) => ({
          ...item,
          cartLineId: item.cartLineId || newCartLineId(),
          mainImage: resolveProductImageUrl(item.mainImage) || item.mainImage,
          hasPdfCustomization: Boolean(item.hasPdfCustomization),
        }));
        useCartStore.setState({
          _hydrated: true,
          ...(items ? { items } : {}),
        });
      },
    },
  ),
);

export default useCartStore;
