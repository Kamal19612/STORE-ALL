import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { getStorefrontCodeFromPath } from "../services/storefrontShopApiPrefix";
import { resolveProductImageUrl } from "../utils/productMedia";

function cartStorageKey() {
  return getStorefrontCodeFromPath() ?? (import.meta.env.VITE_STORE_CODE || "spirit").toLowerCase();
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

      addItem: (product) => {
        const { items } = get();
        const existingItem = items.find((item) => item.id === product.id);
        const normalized = {
          ...product,
          mainImage: resolveProductImageUrl(product?.mainImage) || product?.mainImage,
        };

        if (existingItem) {
          set({
            items: items.map((item) =>
              item.id === product.id
                ? { ...item, quantity: item.quantity + 1, mainImage: normalized.mainImage }
                : item,
            ),
          });
        } else {
          set({ items: [...items, { ...normalized, quantity: 1 }] });
        }
      },

      removeItem: (id) => {
        set({ items: get().items.filter((item) => item.id !== id) });
      },

      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id);
          return;
        }
        set({
          items: get().items.map((item) =>
            item.id === id ? { ...item, quantity } : item,
          ),
        });
      },

      clearCart: () => set({ items: [] }),

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
      onRehydrateStorage: () => (state) => {
        const items = state?.items?.map((item) => ({
          ...item,
          mainImage: resolveProductImageUrl(item.mainImage) || item.mainImage,
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
