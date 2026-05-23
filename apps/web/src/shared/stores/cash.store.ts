import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CashSession } from "../types/session.types";

type CashState = {
  activeCashSessionId: string | null;
  status: "unknown" | "not_open" | "open" | "closing" | "closed";
  setCashSession: (session: CashSession | null) => void;
  clearCashSession: () => void;
};

export const useCashStore = create<CashState>()(
  persist(
    (set) => ({
      activeCashSessionId: null,
      status: "unknown",
      setCashSession: (session) =>
        set({
          activeCashSessionId: session?.id ?? null,
          status: session?.status ?? "not_open"
        }),
      clearCashSession: () => set({ activeCashSessionId: null, status: "unknown" })
    }),
    {
      name: "tp-cash"
    }
  )
);
