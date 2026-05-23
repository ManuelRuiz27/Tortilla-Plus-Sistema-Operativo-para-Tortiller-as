import { create } from "zustand";
import type { PosCartItem } from "../types/pos.types";

type PosCartStore = {
  items: PosCartItem[];
  subtotal: number;
  total: number;
  saleDraftId: string | null;
  addItem: (item: PosCartItem) => void;
  removeItem: (localId: string) => void;
  clearCart: () => void;
  setSaleDraftId: (saleId: string) => void;
  clearSaleDraftId: () => void;
};

function calculateTotal(items: PosCartItem[]): number {
  return Number(items.reduce((sum, item) => sum + item.total, 0).toFixed(2));
}

export const usePosCartStore = create<PosCartStore>()((set) => ({
  items: [],
  subtotal: 0,
  total: 0,
  saleDraftId: null,
  addItem: (item) =>
    set((state) => {
      const items = [...state.items, item];
      const total = calculateTotal(items);
      return { items, subtotal: total, total };
    }),
  removeItem: (localId) =>
    set((state) => {
      const items = state.items.filter((item) => item.localId !== localId);
      const total = calculateTotal(items);
      return { items, subtotal: total, total };
    }),
  clearCart: () => set({ items: [], subtotal: 0, total: 0, saleDraftId: null }),
  setSaleDraftId: (saleDraftId) => set({ saleDraftId }),
  clearSaleDraftId: () => set({ saleDraftId: null })
}));
