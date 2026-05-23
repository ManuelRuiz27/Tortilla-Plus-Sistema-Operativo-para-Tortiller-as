import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SubscriptionFeatureState } from "../types/session.types";

type SubscriptionState = SubscriptionFeatureState & {
  setSubscription: (subscription: SubscriptionFeatureState) => void;
  hasFeature: (feature: string) => boolean;
};

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      planCode: "free",
      status: "active",
      features: ["pos_basic", "cash_control", "inventory_basic"],
      setSubscription: (subscription) => set(subscription),
      hasFeature: (feature) => get().features.includes(feature)
    }),
    {
      name: "tp-subscription"
    }
  )
);
