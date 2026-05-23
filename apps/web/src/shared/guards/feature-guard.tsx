import type { ReactNode } from "react";
import { BlockedState } from "../components/blocked-state";
import { useSubscriptionStore } from "../stores/subscription.store";

type FeatureGuardProps = {
  feature: string;
  label: string;
  children: ReactNode;
};

export function FeatureGuard({ feature, label, children }: FeatureGuardProps) {
  const hasFeature = useSubscriptionStore((state) => state.hasFeature(feature));

  if (!hasFeature) {
    return (
      <BlockedState
        title={`${label} no esta disponible en tu plan`}
        message="Este modulo esta bloqueado por la suscripcion actual."
      />
    );
  }

  return children;
}
