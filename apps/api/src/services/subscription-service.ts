import { DomainError } from "../lib/domain-error.js";
import { prisma } from "../lib/prisma.js";
import type { AuthenticatedUser } from "./auth-service.js";

const activeSubscriptionStatuses = [
  "trial",
  "active",
  "past_due",
  "grace_period",
  "suspended_limited",
] as const;

export async function getCurrentSubscription(currentUser: AuthenticatedUser) {
  const subscription = await prisma.subscription.findFirst({
    where: {
      organizationId: currentUser.organizationId,
      status: { in: [...activeSubscriptionStatuses] },
    },
    include: {
      plan: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!subscription) {
    throw new DomainError(404, "SUBSCRIPTION_NOT_FOUND", "Suscripcion no encontrada.");
  }

  return {
    id: subscription.id,
    organizationId: subscription.organizationId,
    status: subscription.status,
    billingPeriod: subscription.billingPeriod,
    provider: subscription.provider,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
    graceUntil: subscription.graceUntil,
    plan: {
      id: subscription.plan.id,
      code: subscription.plan.code,
      name: subscription.plan.name,
    },
  };
}

export async function getSubscriptionFeatures(currentUser: AuthenticatedUser) {
  const current = await getCurrentSubscription(currentUser);
  const features = await prisma.planFeature.findMany({
    where: {
      planId: current.plan.id,
    },
    include: {
      feature: true,
    },
    orderBy: {
      feature: {
        code: "asc",
      },
    },
  });

  return {
    subscriptionStatus: current.status,
    planCode: current.plan.code,
    features: features.map((planFeature) => ({
      code: planFeature.feature.code,
      name: planFeature.feature.name,
      enabled: planFeature.enabled,
      limitValue: planFeature.limitValue,
    })),
  };
}

export async function assertFeatureAvailable(currentUser: AuthenticatedUser, featureCode: string) {
  const features = await getSubscriptionFeatures(currentUser);
  const feature = features.features.find((item) => item.code === featureCode);

  if (!feature?.enabled) {
    const code =
      features.subscriptionStatus === "suspended_limited"
        ? "SUBSCRIPTION_SUSPENDED_LIMITED"
        : "FEATURE_NOT_AVAILABLE";

    throw new DomainError(403, code, "Feature no disponible para la suscripcion actual.");
  }

  return feature;
}
