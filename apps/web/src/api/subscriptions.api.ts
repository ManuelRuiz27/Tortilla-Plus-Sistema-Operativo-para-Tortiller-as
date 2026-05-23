import { httpClient } from "./http-client";
import { useMocks } from "./mock-data";
import type { SubscriptionFeatureState } from "../shared/types/session.types";

type ApiSubscriptionFeatures = {
  subscriptionStatus: string;
  planCode: string;
  features: Array<{ code: string; enabled: boolean }>;
};

const demoSubscription: SubscriptionFeatureState = {
  planCode: "paid",
  status: "active",
  features: [
    "pos_basic",
    "cash_control",
    "inventory_basic",
    "production_control",
    "customer_credit",
    "delivery_routes",
    "billing_cfdi",
    "advanced_reports"
  ]
};

function mapSubscriptionFeatures(payload: ApiSubscriptionFeatures): SubscriptionFeatureState {
  return {
    planCode: payload.planCode,
    status: payload.subscriptionStatus,
    features: payload.features.filter((feature) => feature.enabled).map((feature) => feature.code)
  };
}

export function currentSubscriptionRequest(): Promise<SubscriptionFeatureState> {
  if (useMocks) {
    return Promise.resolve(demoSubscription);
  }

  return httpClient<SubscriptionFeatureState>("/subscriptions/current");
}

export function subscriptionFeaturesRequest(): Promise<SubscriptionFeatureState> {
  if (useMocks) {
    return Promise.resolve(demoSubscription);
  }

  return httpClient<ApiSubscriptionFeatures>("/subscriptions/features").then(mapSubscriptionFeatures);
}
