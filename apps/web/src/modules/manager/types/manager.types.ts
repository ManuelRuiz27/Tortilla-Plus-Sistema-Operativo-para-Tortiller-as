export type ManagerDashboardSummary = {
  salesToday: number;
  cashExpected: number;
  pendingWithdrawals: number;
  negativeStockItems: number;
  activeRoutes: number;
  pendingBilling: number;
  cashSession: {
    id: string;
    status: "open" | "closed";
    openedBy: string;
    openedAt: string;
  } | null;
};

export type PendingWithdrawal = {
  id: string;
  requestedAt: string;
  cashierName: string;
  branchName: string;
  amount: number;
  reason: string;
  description: string;
  status: "pending_authorization" | "authorized" | "rejected";
};

export type InventoryItem = {
  productId: string;
  productName: string;
  productType: "tortilla" | "masa" | "package" | "retail" | "service";
  currentStock: number;
  minimumStock: number;
  unit: "kg" | "piece" | "package" | "liter" | "service";
  status: "ok" | "low" | "negative" | "out";
  updatedAt: string;
};

export type ProductionBatch = {
  id: string;
  productionDate: string;
  tortillaKg: number;
  masaKg: number;
  status: "open" | "closed";
};

export type ManagerProduct = {
  id: string;
  name: string;
  sku?: string;
  barcode?: string | null;
  productType: "tortilla" | "masa" | "package" | "retail" | "service";
  unit: "kg" | "piece" | "package" | "liter" | "service";
  isSellable: boolean;
  isStockTracked: boolean;
  requiresProduction: boolean;
  status: "active" | "inactive";
};

export type ManagerPrice = {
  productId: string;
  productName: string;
  saleMode: "by_kg" | "by_amount" | "by_package" | "by_unit";
  price: number;
  effectiveFrom: string;
  status: "active" | "scheduled";
};

export type ManagerCustomer = {
  id: string;
  name: string;
  customerType: "tienda" | "puesto" | "comedor" | "repartidor" | "cliente_frecuente" | "empresa" | "otro";
  phone?: string | null;
  email?: string | null;
  taxId?: string | null;
  notes?: string | null;
  creditEnabled: boolean;
  creditLimit: number;
  currentBalance: number;
  status: "active" | "inactive" | "deleted";
};

export type CustomerBalanceMovement = {
  id: string;
  movementType: string;
  amount: number;
  referenceType?: string | null;
  referenceId?: string | null;
  createdAt: string;
};

export type CustomerBalance = {
  currentBalance: number;
  movements: CustomerBalanceMovement[];
};

export type DeliveryDriver = {
  id: string;
  name: string;
  phone?: string | null;
  status: "active" | "inactive";
  notes?: string | null;
};

export type DeliveryRoute = {
  id: string;
  branchId: string;
  name: string;
  driverId?: string | null;
  driverName?: string | null;
  customerCount: number;
  customers: DeliveryRouteCustomer[];
  status: "active" | "inactive";
};

export type DeliveryRouteCustomer = {
  customerId: string;
  sortOrder: number;
  customer: ManagerCustomer | null;
};

export type DeliveryOrderItem = {
  id: string;
  productId: string;
  productName: string;
  quantityLoaded: number;
  quantityDelivered: number;
  quantityReturned: number;
  unitPrice: number;
  total: number;
};

export type DeliveryOrder = {
  id: string;
  branchId: string;
  routeId?: string | null;
  driverId?: string | null;
  customerId: string;
  customerName?: string;
  status: string;
  total: number;
  amountCollected: number;
  amountPending: number;
  items: DeliveryOrderItem[];
};

export type DeliverySettlement = {
  id: string;
  branchId: string;
  routeId?: string | null;
  driverId?: string | null;
  status: string;
  expectedCashAmount: number;
  deliveredCashAmount: number;
  differenceAmount: number;
  cashSessionId?: string | null;
};

export type BillableSale = {
  id: string;
  folio: string;
  customerName: string;
  saleDate: string;
  total: number;
  status: "billable" | "invoiced" | "global_candidate";
};

export type BillingInvoice = {
  id: string;
  folio: string;
  customerName: string;
  issuedAt: string;
  total: number;
  status: "draft" | "stamped" | "cancelled" | "error";
};

export type BillingDocument = {
  id: string;
  type: "xml" | "pdf";
  url: string;
  createdAt: string;
};

export type BillingDocuments = {
  invoiceId: string;
  cfdiUuid: string | null;
  documents: BillingDocument[];
};

export type BillingReceipt = {
  id: string;
  saleId: string;
  saleFolio: string;
  branchName: string;
  token: string;
  receiptUrl: string;
  qrContent?: string;
  status: "active" | "used" | "expired" | "cancelled";
  saleDate: string;
  expiresAt: string;
  usedAt: string | null;
  expiredAt: string | null;
  total: number;
  invoiceId: string | null;
  cfdiUuid: string | null;
};

export type BillingSummary = {
  billableSales: BillableSale[];
  invoices: BillingInvoice[];
  globalDaily: {
    date: string;
    total: number;
    status: "not_created" | "draft" | "stamped";
  };
  stampErrors: number;
};

export type ReconciliationItem = {
  id: string;
  salePaymentId: string | null;
  providerReference: string | null;
  posAmount: number;
  providerAmount: number;
  status: "matched" | "missing_in_provider" | "missing_in_pos" | "amount_mismatch";
  notes: string | null;
};

export type ReconciliationBatch = {
  id: string;
  branchId: string;
  branchName: string;
  status: "draft" | "matched" | "difference" | "reviewed" | "cancelled";
  posTotal: number;
  providerReportedTotal: number;
  differenceTotal: number;
  reviewedAt: string | null;
  createdAt: string;
  items: ReconciliationItem[];
};

export type ReportPoint = {
  label: string;
  value: number;
};

export type ReportsSummary = {
  salesByDay: ReportPoint[];
  salesByProduct: ReportPoint[];
  salesByBranch: ReportPoint[];
  salesByCustomer: ReportPoint[];
  withdrawalsByReason: ReportPoint[];
  cashDifferences: ReportPoint[];
};

export type SettingsSummary = {
  posDevices: Array<{ id: string; name: string; status: "active" | "inactive"; lastSeen: string }>;
  withdrawalReasons: Array<{ id: string; name: string; direction: "in" | "out"; requiresAuthorization: boolean }>;
  packageConfig: Array<{ productName: string; baseProductName: string; packageWeightGrams: number }>;
  auditLogs: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    branchName: string | null;
    userName: string | null;
    createdAt: string;
  }>;
};

export type CashMovement = {
  id: string;
  movementType: string;
  amount: number;
  description?: string | null;
  status: string;
  createdAt: string;
};

export type CashSummary = {
  id: string;
  branchId: string;
  status: string;
  openingAmount: number;
  cashInTotal: number;
  cashOutTotal: number;
  expectedCashAmount: number;
  sales: {
    cash: number;
    card: number;
    transfer: number;
    credit: number;
  };
  movements: CashMovement[];
};
