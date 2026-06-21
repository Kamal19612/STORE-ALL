import { create } from "zustand";

const usePdfFormModalStore = create((set) => ({
  product: null,
  openForProduct: (product) => set({ product }),
  close: () => set({ product: null }),
}));

export default usePdfFormModalStore;
