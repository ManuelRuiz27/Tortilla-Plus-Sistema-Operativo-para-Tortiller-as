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
  subscriptionsGrace: number;
  organizationsGrace: number;
  monthlyRecurringRevenue: number;
  paymentsCurrentMonth: number;
  paymentsSubtotalCurrentMonth: number;
  paymentsTaxCurrentMonth: number;
  accountsReceivable: number;
  taxReceivable: number;
  setupRevenueCurrentMonth: number;
  cfdiOverageRevenueCurrentMonth: number;
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
  billingCycleId?: string | null;
  planCode?: string | null;
  provider: string;
  subtotal?: string;
  taxTotal?: string;
  amount: string;
  currency: string;
  status: string;
  paymentMethod?: string | null;
  reference?: string | null;
  notes?: string | null;
  note?: string | null;
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

export type BillingCycleItem = {
  id: string;
  itemType: string;
  description: string;
  quantity: string;
  unitPrice: string;
  subtotal: string;
  taxAmount: string;
  total: string;
  currency: string;
};

export type BillingCycle = {
  id: string;
  organizationId: string;
  subscriptionId: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  status: string;
  subtotal: string;
  taxTotal: string;
  total: string;
  paidTotal: string;
  balanceDue: string;
  currency: string;
  paidAt?: string | null;
  createdAt: string;
  items: BillingCycleItem[];
};

export type BillingSummary = {
  subscription: PlatformOrganizationDetail["subscription"] | null;
  currentCycle: BillingCycle | null;
  pendingBalance: string;
  limits: { branches: number; pos: number; terminals: number; cfdi: number };
  usage: { branches: number; pos: number; licensedPos: number; terminals: number; cfdi: number };
  cfdiUsage: CfdiUsage;
  pendingOneTimeCharges: OneTimeCharge[];
  cycles: BillingCycle[];
  payments: PlatformPayment[];
};

export type CommercialPlan = {
  code: string;
  name: string;
  monthlyPrice: string;
  limits: { branches: number; pos: number; terminals: number; cfdi: number; routes: boolean; billingCfdi: boolean; advancedReports: boolean };
};

export type CfdiUsage = {
  id: string;
  organizationId: string;
  billingCycleId?: string | null;
  periodStart: string;
  periodEnd: string;
  includedLimit: number;
  usedCount: number;
  globalInvoiceCount: number;
  individualInvoiceCount: number;
  overageCount: number;
  overageUnitPrice: string;
  overageTotal: string;
  currency: string;
};

export type OneTimeCharge = {
  id: string;
  organizationId: string;
  subscriptionId?: string | null;
  billingCycleId?: string | null;
  chargeType: string;
  description: string;
  amount: string;
  taxAmount: string;
  total: string;
  currency: string;
  status: string;
  createdAt: string;
};
