import { httpClient } from "./http-client";
import type {
  PlatformAuditLog,
  PlatformDashboard,
  PlatformOrganization,
  PlatformOrganizationDetail,
  PlatformPayment,
  PlatformPosDevice
} from "../modules/platform/types/platform.types";

export function platformDashboardRequest() {
  return httpClient<PlatformDashboard>("/platform/dashboard");
}

export function platformOrganizationsRequest() {
  return httpClient<PlatformOrganization[]>("/platform/organizations");
}

export function platformOrganizationRequest(id: string) {
  return httpClient<PlatformOrganizationDetail>(`/platform/organizations/${id}`);
}

export function updatePlatformOrganizationRequest(
  organizationId: string,
  payload: {
    name?: string;
    legalName?: string;
    taxId?: string;
    contactEmail?: string;
    contactPhone?: string;
  }
) {
  return httpClient<{ id: string; name: string; status: string }>(`/platform/organizations/${organizationId}`, {
    method: "PATCH",
    body: payload
  });
}

export function createPlatformOrganizationRequest(payload: {
  name: string;
  legalName?: string;
  taxId?: string;
  contactEmail: string;
  contactPhone?: string;
  planCode: "free" | "paid";
}) {
  return httpClient<{ id: string; name: string; status: string }>("/platform/organizations", {
    method: "POST",
    body: payload
  });
}

export function updatePlatformOrganizationStatusRequest(organizationId: string, status: string) {
  return httpClient<{ id: string; status: string }>(`/platform/organizations/${organizationId}/status`, {
    method: "PATCH",
    body: { status }
  });
}

export function updatePlatformSubscriptionRequest(
  organizationId: string,
  payload: {
    planCode?: "free" | "paid";
    status: string;
    billingPeriod: "monthly" | "annual";
  }
) {
  return httpClient(`/platform/organizations/${organizationId}/subscription`, {
    method: "PATCH",
    body: payload
  });
}

export function platformPosDevicesRequest() {
  return httpClient<PlatformPosDevice[]>("/platform/pos-devices");
}

export function updatePlatformPosDeviceStatusRequest(posDeviceId: string, status: string) {
  return httpClient(`/platform/pos-devices/${posDeviceId}/status`, {
    method: "PATCH",
    body: { status }
  });
}

export function updatePlatformPosDeviceLicenseRequest(posDeviceId: string, licensed: boolean) {
  return httpClient(`/platform/pos-devices/${posDeviceId}/license`, {
    method: "PATCH",
    body: { licensed }
  });
}

export function platformPaymentsRequest() {
  return httpClient<PlatformPayment[]>("/platform/payments");
}

export function createPlatformManualPaymentRequest(payload: {
  organizationId: string;
  subscriptionId: string;
  amount: string;
  currency?: string;
  paidAt?: string;
  note?: string;
}) {
  return httpClient<PlatformPayment>("/platform/payments/manual", {
    method: "POST",
    body: payload
  });
}

export function platformAuditLogRequest(filters?: {
  organizationId?: string;
  userId?: string;
  action?: string;
  from?: string;
  to?: string;
}) {
  const searchParams = new URLSearchParams();
  if (filters?.organizationId) searchParams.set("organizationId", filters.organizationId);
  if (filters?.userId) searchParams.set("userId", filters.userId);
  if (filters?.action) searchParams.set("action", filters.action);
  if (filters?.from) searchParams.set("from", filters.from);
  if (filters?.to) searchParams.set("to", filters.to);
  const query = searchParams.toString();
  return httpClient<PlatformAuditLog[]>(`/platform/audit-log${query ? `?${query}` : ""}`);
}
