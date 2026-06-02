export type PlatformDashboard = {
  organizationsTotal: number;
  organizationsActive: number;
  organizationsSuspended: number;
  branchesActive: number;
  posDevicesActive: number;
  posDevicesLicensed: number;
  subscriptionsActive: number;
  subscriptionsTrial: number;
  subscriptionsPastDue: number;
  monthlyRecurringRevenue: number;
  paymentsCurrentMonth: number;
  alerts: Array<{ type: string; message: string; count: number }>;
};

export type PlatformOrganization = {
  id: string;
  name: string;
  legalName?: string | null;
  taxId?: string | null;
  contactEmail: string;
  contactPhone?: string | null;
  status: string;
  plan?: string | null;
  subscriptionStatus?: string | null;
  branches: number;
  posDevicesActive: number;
  posDevicesLicensed: number;
  lastPaymentAt?: string | null;
  createdAt: string;
  subscriptionId?: string | null;
};

export type PlatformPosDevice = {
  id: string;
  organizationId: string;
  organizationName?: string | null;
  branchId: string;
  branchName?: string | null;
  name: string;
  code: string;
  type: string;
  status: string;
  licensed: boolean;
  lastSeenAt?: string | null;
  updatedAt: string;
};

export type PlatformPayment = {
  id: string;
  organizationId: string;
  organizationName?: string | null;
  subscriptionId: string;
  planCode?: string | null;
  provider: string;
  amount: string;
  currency: string;
  status: string;
  paidAt?: string | null;
  createdAt: string;
};

export type PlatformAuditLog = {
  id: string;
  organizationId?: string | null;
  organizationName?: string | null;
  branchName?: string | null;
  userName?: string | null;
  deviceName?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
};

export type PlatformOrganizationDetail = PlatformOrganization & {
  branches: Array<{ id: string; name: string; status: string }>;
  users: Array<{ id: string; name: string; email: string; status: string; roles: string[] }>;
  subscription: {
    id: string;
    planCode: string;
    planName: string;
    status: string;
    billingPeriod: string;
    currentPeriodEnd?: string | null;
    items: Array<{ id: string; itemType: string; quantity: number; unitPrice: string; currency: string; status: string }>;
  } | null;
  posDevices: PlatformPosDevice[];
  payments: PlatformPayment[];
  auditLogs: PlatformAuditLog[];
};
