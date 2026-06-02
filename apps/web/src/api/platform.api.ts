import { httpClient, httpDownload } from "./http-client";
import type {
  PlatformAuditLog,
  BillingCycle,
  BillingSummary,
  CommercialPlan,
  CfdiUsage,
  OneTimeCharge,
  PlatformDashboard,
  PlatformOrganization,
  PlatformOrganizationDetail,
  PlatformPayment,
  PlatformPosDevice
} from "../modules/platform/types/platform.types";

export type PlatformPlanCode = "free" | "paid" | "mostrador" | "operativo" | "comercial";

export function platformDashboardRequest() {
  return httpClient<PlatformDashboard>("/platform/dashboard");
}

export function platformCommercialPlansRequest() {
  return httpClient<CommercialPlan[]>("/platform/commercial-plans");
}

export function platformOrganizationsRequest() {
  return httpClient<PlatformOrganization[]>("/platform/organizations");
}

export function platformOrganizationRequest(id: string) {
  return httpClient<PlatformOrganizationDetail>(`/platform/organizations/${id}`);
}

export function platformBillingSummaryRequest(organizationId: string) {
  return httpClient<BillingSummary>(`/platform/organizations/${organizationId}/billing-summary`);
}

export function platformBillingCyclesRequest(organizationId: string) {
  return httpClient<BillingCycle[]>(`/platform/organizations/${organizationId}/billing-cycles`);
}

export function platformCfdiUsageRequest(organizationId: string) {
  return httpClient<CfdiUsage>(`/platform/organizations/${organizationId}/cfdi-usage`);
}

export function createPlatformOneTimeChargeRequest(organizationId: string, payload: {
  chargeType: string;
  description: string;
  amount: string;
  currency?: string;
}) {
  return httpClient<OneTimeCharge>(`/platform/organizations/${organizationId}/one-time-charges`, {
    method: "POST",
    body: payload
  });
}

export function updatePlatformSubscriptionItemsRequest(organizationId: string, payload: {
  items: Array<{ id?: string; itemType: string; quantity: number; unitPrice: string; currency?: string; status?: string }>;
}) {
  return httpClient(`/platform/organizations/${organizationId}/subscription-items`, {
    method: "PATCH",
    body: payload
  });
}

export function generatePlatformBillingCycleRequest(organizationId: string) {
  return httpClient<BillingCycle>(`/platform/organizations/${organizationId}/billing-cycles/generate`, {
    method: "POST",
    body: {}
  });
}

export function recalculatePlatformBillingCycleRequest(billingCycleId: string) {
  return httpClient<BillingCycle>(`/platform/billing-cycles/${billingCycleId}/recalculate`, {
    method: "PATCH"
  });
}

export function markPlatformBillingCyclePaidRequest(billingCycleId: string, payload?: { reference?: string; notes?: string }) {
  return httpClient<{ cycle: BillingCycle; payment: PlatformPayment | null }>(`/platform/billing-cycles/${billingCycleId}/mark-paid`, {
    method: "POST",
    body: payload ?? {}
  });
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
  planCode: PlatformPlanCode;
  owner?: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    pin?: string;
  };
}) {
  return httpClient<{ id: string; name: string; status: string; owner?: { id: string; name: string; email: string } | null }>("/platform/organizations", {
    method: "POST",
    body: payload
  });
}

export function createPlatformOrganizationOwnerRequest(
  organizationId: string,
  payload: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    pin?: string;
  }
) {
  return httpClient<{ id: string; name: string; email: string; role: string }>(`/platform/organizations/${organizationId}/owner`, {
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
    planCode?: PlatformPlanCode;
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
  billingCycleId?: string;
  amount: string;
  currency?: string;
  paymentMethod?: string;
  reference?: string;
  paidAt?: string;
  note?: string;
  notes?: string;
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

export function downloadPlatformSaasIncomeReportRequest() {
  return httpDownload("/platform/reports/saas-income");
}

export function downloadPlatformAccountsReceivableReportRequest() {
  return httpDownload("/platform/reports/accounts-receivable");
}
