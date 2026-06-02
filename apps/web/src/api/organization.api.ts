import { httpClient } from "./http-client";
import type { BillingSummary } from "../modules/platform/types/platform.types";

export type OrganizationUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: "active" | "inactive";
  roles: string[];
  branches: Array<{ branchId: string; branchName: string; isDefault: boolean }>;
};

export type OrganizationBranch = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  timezone: string;
  status: "active" | "inactive";
};

export type OrganizationPosDevice = {
  id: string;
  branchId: string;
  branchName: string | null;
  name: string;
  code: string;
  type: string;
  status: string;
  licensed: boolean;
  lastSeenAt: string | null;
};

export type OrganizationSummary = {
  id: string;
  name: string;
  legalName: string | null;
  taxId: string | null;
  contactEmail: string;
  contactPhone: string | null;
  status: string;
  subscription: { id: string; status: string; planCode: string; planName: string } | null;
  users: OrganizationUser[];
  branches: OrganizationBranch[];
  posDevices: OrganizationPosDevice[];
};

export function organizationSummaryRequest() {
  return httpClient<OrganizationSummary>("/organization/summary");
}

export function organizationBillingSummaryRequest() {
  return httpClient<BillingSummary>("/organization/billing-summary");
}

export function organizationCfdiUsageRequest() {
  return httpClient<BillingSummary["cfdiUsage"]>("/organization/cfdi-usage");
}

export function createOrganizationUserRequest(payload: {
  name: string;
  email: string;
  role: "manager" | "supervisor" | "cashier";
  branchId?: string;
  password?: string;
  pin?: string;
}) {
  return httpClient<OrganizationUser>("/organization/users", { method: "POST", body: payload });
}

export function createOrganizationBranchRequest(payload: { name: string; address?: string; phone?: string }) {
  return httpClient<OrganizationBranch>("/organization/branches", { method: "POST", body: payload });
}

export function createOrganizationPosDeviceRequest(payload: { name: string; branchId: string; deviceCode?: string }) {
  return httpClient<OrganizationPosDevice>("/organization/pos-devices", { method: "POST", body: payload });
}

export function updateOrganizationUserStatusRequest(userId: string, status: "active" | "inactive") {
  return httpClient<OrganizationUser>(`/organization/users/${userId}/status`, { method: "PATCH", body: { status } });
}

export function resetOrganizationUserPinRequest(userId: string, pin?: string) {
  return httpClient<{ id: string; temporaryPin: string }>(`/organization/users/${userId}/reset-pin`, { method: "POST", body: pin ? { pin } : {} });
}
