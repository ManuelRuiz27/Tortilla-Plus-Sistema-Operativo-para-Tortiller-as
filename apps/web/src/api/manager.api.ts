import {
  buildDemoBillingSummary,
  buildDemoCustomerBalance,
  buildDemoCustomers,
  buildDemoDrivers,
  buildDemoDeliveryOrders,
  buildDemoDeliverySettlement,
  buildDemoInventory,
  buildDemoManagerProducts,
  buildDemoManagerSummary,
  buildDemoPrices,
  buildDemoProduction,
  buildDemoReportsSummary,
  buildDemoRoutes,
  buildDemoSettingsSummary,
  buildDemoWithdrawals,
  useMocks
} from "./mock-data";
import { ApiErrorException } from "./api-error";
import { httpClient } from "./http-client";
import type {
  BillingDocuments,
  BillingReceipt,
  BillingSummary,
  CustomerBalance,
  CustomerBalanceMovement,
  DeliveryDriver,
  DeliveryOrder,
  DeliveryRoute,
  DeliverySettlement,
  InventoryItem,
  ManagerDashboardSummary,
  ManagerCustomer,
  ManagerPrice,
  ManagerProduct,
  PendingWithdrawal,
  ProductionBatch,
  ReconciliationBatch,
  ReportsSummary,
  SettingsSummary
} from "../modules/manager/types/manager.types";

type ApiInventoryStock = {
  productId: string;
  product?: { name?: string; productType?: string; unit?: string } | null;
  quantity: string | number;
  minimumQuantity: string | number;
  updatedAt: string;
};

type ApiProduct = {
  id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  productType?: string;
  unit?: string;
  isSellable?: boolean;
  isStockTracked?: boolean;
  requiresProduction?: boolean;
  status?: string;
};

type ApiBranchPrice = {
  productId: string;
  product?: { name?: string } | null;
  saleMode?: string;
  price: string | number;
  activeFrom?: string;
  status?: string;
};

type ApiCustomer = {
  id: string;
  name: string;
  customerType?: string;
  phone?: string | null;
  email?: string | null;
  taxId?: string | null;
  creditEnabled?: boolean;
  creditLimit?: string | number;
  currentBalance?: string | number;
  status?: string;
  notes?: string | null;
};

type ApiCustomerBalanceMovement = {
  id: string;
  movementType: string;
  amount: string | number;
  referenceType?: string | null;
  referenceId?: string | null;
  createdAt: string;
};

type ApiCustomerBalance = {
  currentBalance: string | number;
  movements: ApiCustomerBalanceMovement[];
};

type ApiCustomerPrice = {
  id: string;
  customerId: string;
  productId: string;
  branchId?: string | null;
  saleMode: string;
  price: string | number;
  product?: { id: string; name: string } | null;
  branch?: { id: string; name: string } | null;
  activeFrom: string;
  status: string;
};

type ApiDeliveryDriver = {
  id: string;
  name: string;
  phone?: string | null;
  status?: string;
  notes?: string | null;
};

type ApiDeliveryRoute = {
  id: string;
  branchId: string;
  name: string;
  driverId?: string | null;
  driver?: { id: string; name: string } | null;
  customers?: Array<{
    customerId: string;
    sortOrder: number;
    customer?: ApiCustomer | null;
  }>;
  status?: string;
};

type ApiDeliveryOrder = {
  id: string;
  branchId: string;
  routeId?: string | null;
  driverId?: string | null;
  customerId: string;
  customer?: { id: string; name: string } | null;
  status: string;
  total: string | number;
  amountCollected: string | number;
  amountPending: string | number;
  items?: Array<{
    id: string;
    productId: string;
    product?: { name?: string } | null;
    quantityLoaded: string | number;
    quantityDelivered: string | number;
    quantityReturned: string | number;
    unitPrice: string | number;
    total: string | number;
  }>;
};

type ApiDeliverySettlement = {
  id: string;
  branchId: string;
  routeId?: string | null;
  driverId?: string | null;
  status: string;
  expectedCashAmount: string | number;
  deliveredCashAmount: string | number;
  differenceAmount: string | number;
  cashSessionId?: string | null;
};

const productTypes = new Set(["tortilla", "masa", "package", "retail", "service"]);
const productUnits = new Set(["kg", "piece", "package", "liter", "service"]);
const saleModes = new Set(["by_kg", "by_amount", "by_package", "by_unit"]);
const customerTypes = new Set(["tienda", "puesto", "comedor", "repartidor", "cliente_frecuente", "empresa", "otro"]);

function productType(value: string | undefined): ManagerProduct["productType"] {
  return productTypes.has(value ?? "") ? (value as ManagerProduct["productType"]) : "retail";
}

function productUnit(value: string | undefined): ManagerProduct["unit"] {
  return productUnits.has(value ?? "") ? (value as ManagerProduct["unit"]) : "piece";
}

function saleMode(value: string | undefined): ManagerPrice["saleMode"] {
  return saleModes.has(value ?? "") ? (value as ManagerPrice["saleMode"]) : "by_unit";
}

function stockStatus(currentStock: number, minimumStock: number): InventoryItem["status"] {
  if (currentStock < 0) return "negative";
  if (currentStock === 0) return "out";
  if (currentStock <= minimumStock) return "low";
  return "ok";
}

function mapInventoryItem(stock: ApiInventoryStock): InventoryItem {
  const currentStock = Number(stock.quantity);
  const minimumStock = Number(stock.minimumQuantity);

  return {
    productId: stock.productId,
    productName: stock.product?.name ?? "Producto",
    productType: productType(stock.product?.productType),
    currentStock,
    minimumStock,
    unit: productUnit(stock.product?.unit),
    status: stockStatus(currentStock, minimumStock),
    updatedAt: stock.updatedAt
  };
}

function mapManagerProduct(product: ApiProduct): ManagerProduct {
  return {
    id: product.id,
    name: product.name,
    sku: product.sku ?? undefined,
    barcode: product.barcode,
    productType: productType(product.productType),
    unit: productUnit(product.unit),
    isSellable: product.isSellable ?? true,
    isStockTracked: product.isStockTracked ?? false,
    requiresProduction: product.requiresProduction ?? false,
    status: product.status === "inactive" ? "inactive" : "active"
  };
}

function mapManagerPrice(price: ApiBranchPrice): ManagerPrice {
  return {
    productId: price.productId,
    productName: price.product?.name ?? "Producto",
    saleMode: saleMode(price.saleMode),
    price: Number(price.price),
    effectiveFrom: price.activeFrom ?? new Date().toISOString(),
    status: price.status === "scheduled" ? "scheduled" : "active"
  };
}

function customerType(value: string | undefined): ManagerCustomer["customerType"] {
  return customerTypes.has(value ?? "") ? (value as ManagerCustomer["customerType"]) : "cliente_frecuente";
}

function mapCustomer(customer: ApiCustomer): ManagerCustomer {
  const status = customer.status === "inactive" || customer.status === "deleted" ? customer.status : "active";

  return {
    id: customer.id,
    name: customer.name,
    customerType: customerType(customer.customerType),
    phone: customer.phone,
    email: customer.email,
    taxId: customer.taxId,
    notes: customer.notes,
    creditEnabled: customer.creditEnabled ?? false,
    creditLimit: Number(customer.creditLimit ?? 0),
    currentBalance: Number(customer.currentBalance ?? 0),
    status
  };
}

function mapCustomerBalanceMovement(movement: ApiCustomerBalanceMovement): CustomerBalanceMovement {
  return {
    id: movement.id,
    movementType: movement.movementType,
    amount: Number(movement.amount),
    referenceType: movement.referenceType,
    referenceId: movement.referenceId,
    createdAt: movement.createdAt
  };
}

function mapCustomerBalance(payload: ApiCustomerBalance): CustomerBalance {
  return {
    currentBalance: Number(payload.currentBalance),
    movements: payload.movements.map(mapCustomerBalanceMovement)
  };
}

function mapDriver(driver: ApiDeliveryDriver): DeliveryDriver {
  return {
    id: driver.id,
    name: driver.name,
    phone: driver.phone,
    notes: driver.notes,
    status: driver.status === "inactive" ? "inactive" : "active"
  };
}

function mapRoute(route: ApiDeliveryRoute): DeliveryRoute {
  const customers = route.customers ?? [];
  return {
    id: route.id,
    branchId: route.branchId,
    name: route.name,
    driverId: route.driverId,
    driverName: route.driver?.name ?? null,
    customerCount: customers.length,
    customers: customers.map((assignment) => ({
      customerId: assignment.customerId,
      sortOrder: assignment.sortOrder,
      customer: assignment.customer ? mapCustomer(assignment.customer) : null
    })),
    status: route.status === "inactive" ? "inactive" : "active"
  };
}

function mapDeliveryOrder(order: ApiDeliveryOrder): DeliveryOrder {
  return {
    id: order.id,
    branchId: order.branchId,
    routeId: order.routeId,
    driverId: order.driverId,
    customerId: order.customerId,
    customerName: order.customer?.name,
    status: order.status,
    total: Number(order.total),
    amountCollected: Number(order.amountCollected),
    amountPending: Number(order.amountPending),
    items:
      order.items?.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product?.name ?? "Producto",
        quantityLoaded: Number(item.quantityLoaded),
        quantityDelivered: Number(item.quantityDelivered),
        quantityReturned: Number(item.quantityReturned),
        unitPrice: Number(item.unitPrice),
        total: Number(item.total)
      })) ?? []
  };
}

function mapDeliverySettlement(settlement: ApiDeliverySettlement): DeliverySettlement {
  return {
    id: settlement.id,
    branchId: settlement.branchId,
    routeId: settlement.routeId,
    driverId: settlement.driverId,
    status: settlement.status,
    expectedCashAmount: Number(settlement.expectedCashAmount),
    deliveredCashAmount: Number(settlement.deliveredCashAmount),
    differenceAmount: Number(settlement.differenceAmount),
    cashSessionId: settlement.cashSessionId
  };
}

export function managerDashboardRequest(filters: { branchId?: string | null } = {}): Promise<ManagerDashboardSummary> {
  if (!useMocks) {
    const params = new URLSearchParams();
    if (filters.branchId) params.set("branchId", filters.branchId);
    const query = params.toString();
    return httpClient<ManagerDashboardSummary>(`/manager/dashboard${query ? `?${query}` : ""}`);
  }

  return Promise.resolve(buildDemoManagerSummary());
}

export function pendingWithdrawalsRequest(): Promise<PendingWithdrawal[]> {
  if (!useMocks) {
    return Promise.reject(demoModuleUnavailable("pending-withdrawals"));
  }

  return Promise.resolve(buildDemoWithdrawals());
}

export function authorizeWithdrawalRequest(payload: { id: string; pin: string }): Promise<void> {
  if (useMocks) {
    return payload.pin === "1234" ? Promise.resolve() : Promise.reject(new Error("PIN incorrecto."));
  }

  return httpClient<void>(`/cash-movements/${payload.id}/authorize`, {
    method: "POST",
    body: { pin: payload.pin }
  });
}

export function rejectWithdrawalRequest(payload: { id: string; reason: string }): Promise<void> {
  if (useMocks) {
    return Promise.resolve();
  }

  return httpClient<void>(`/cash-movements/${payload.id}/reject`, {
    method: "POST",
    body: { reason: payload.reason }
  });
}

export async function inventoryRequest(branchId: string): Promise<InventoryItem[]> {
  if (useMocks) {
    return Promise.resolve(buildDemoInventory());
  }

  const stocks = await httpClient<ApiInventoryStock[]>(`/inventory/branch/${branchId}`);
  return stocks.map(mapInventoryItem);
}

export function inventoryAdjustmentRequest(payload: {
  branchId: string;
  productId: string;
  direction: "in" | "out";
  quantity: string;
  reason: string;
}): Promise<void> {
  if (useMocks) {
    return Promise.resolve();
  }

  return httpClient<void>("/inventory/adjustments", {
    method: "POST",
    body: payload
  });
}

export function createWasteRecordRequest(payload: {
  branchId: string;
  productId: string;
  quantity: string;
  wasteReason: "tortilla_rota" | "masa_echada_a_perder" | "producto_vencido" | "devolucion_no_revendible" | "otro";
}): Promise<void> {
  if (useMocks) {
    return Promise.resolve();
  }

  return httpClient<void>("/waste-records", {
    method: "POST",
    body: payload
  });
}

export function productionBatchesRequest(): Promise<ProductionBatch[]> {
  if (!useMocks) {
    return Promise.reject(demoModuleUnavailable("production-batches"));
  }

  return Promise.resolve(buildDemoProduction());
}

export function createProductionBatchRequest(payload: {
  branchId: string;
  items: Array<{ productId: string; quantity: string; unit: ManagerProduct["unit"] }>;
}): Promise<void> {
  if (useMocks) {
    return Promise.resolve();
  }

  return httpClient<void>("/production/batches", {
    method: "POST",
    body: {
      branchId: payload.branchId,
      productionDate: new Date().toISOString().slice(0, 10),
      items: payload.items.filter((item) => Number(item.quantity) > 0)
    }
  });
}

export function closeProductionBatchRequest(batchId: string): Promise<void> {
  if (useMocks) {
    return Promise.resolve();
  }

  return httpClient<void>(`/production/batches/${batchId}/close`, {
    method: "PATCH"
  });
}

export async function managerProductsRequest(): Promise<ManagerProduct[]> {
  if (useMocks) {
    return Promise.resolve(buildDemoManagerProducts());
  }

  const products = await httpClient<ApiProduct[]>("/products");
  return products.map(mapManagerProduct);
}

export function createManagerProductRequest(payload: {
  name: string;
  sku?: string;
  barcode?: string;
  productType: ManagerProduct["productType"];
  unit: ManagerProduct["unit"];
  isSellable: boolean;
  isStockTracked: boolean;
  requiresProduction: boolean;
}): Promise<ManagerProduct> {
  if (useMocks) {
    return Promise.resolve({
      id: `product-${Date.now()}`,
      name: payload.name,
      sku: payload.sku,
      barcode: payload.barcode,
      productType: payload.productType,
      unit: payload.unit,
      isSellable: payload.isSellable,
      isStockTracked: payload.isStockTracked,
      requiresProduction: payload.requiresProduction,
      status: "active"
    });
  }

  return httpClient<ApiProduct>("/products", {
    method: "POST",
    body: payload
  }).then(mapManagerProduct);
}

export function updateManagerProductRequest(payload: {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  productType: ManagerProduct["productType"];
  unit: ManagerProduct["unit"];
  isSellable: boolean;
  isStockTracked: boolean;
  requiresProduction: boolean;
  status: ManagerProduct["status"];
}): Promise<ManagerProduct> {
  const { id, ...body } = payload;

  if (useMocks) {
    return Promise.resolve(payload);
  }

  return httpClient<ApiProduct>(`/products/${id}`, {
    method: "PATCH",
    body
  }).then(mapManagerProduct);
}

export async function managerPricesRequest(branchId: string): Promise<ManagerPrice[]> {
  if (useMocks) {
    return Promise.resolve(buildDemoPrices());
  }

  const prices = await httpClient<ApiBranchPrice[]>(`/prices/branch/${branchId}`);
  return prices.map(mapManagerPrice);
}

export function setManagerPriceRequest(payload: {
  branchId: string;
  productId: string;
  saleMode: ManagerPrice["saleMode"];
  price: string;
}): Promise<ManagerPrice> {
  if (useMocks) {
    return Promise.resolve({
      productId: payload.productId,
      productName: "Producto",
      saleMode: payload.saleMode,
      price: Number(payload.price),
      effectiveFrom: new Date().toISOString(),
      status: "active"
    });
  }

  return httpClient<ApiBranchPrice>("/prices/branch", {
    method: "POST",
    body: payload
  }).then(mapManagerPrice);
}

export async function managerCustomersRequest(): Promise<ManagerCustomer[]> {
  if (useMocks) {
    return Promise.resolve(buildDemoCustomers());
  }

  const customers = await httpClient<ApiCustomer[]>("/customers");
  return customers.map(mapCustomer);
}

export function createCustomerRequest(payload: {
  name: string;
  customerType: ManagerCustomer["customerType"];
  phone?: string;
  email?: string;
  taxId?: string;
  creditEnabled: boolean;
  creditLimit: string;
}): Promise<ManagerCustomer> {
  if (useMocks) {
    return Promise.resolve({
      id: `customer-${Date.now()}`,
      name: payload.name,
      customerType: payload.customerType,
      phone: payload.phone,
      email: payload.email,
      taxId: payload.taxId,
      creditEnabled: payload.creditEnabled,
      creditLimit: Number(payload.creditLimit || 0),
      currentBalance: 0,
      status: "active"
    });
  }

  return httpClient<ApiCustomer>("/customers", {
    method: "POST",
    body: payload
  }).then(mapCustomer);
}

export function updateCustomerRequest(payload: {
  id: string;
  name: string;
  customerType: ManagerCustomer["customerType"];
  phone?: string;
  email?: string;
  taxId?: string;
  notes?: string;
  status: ManagerCustomer["status"];
}): Promise<ManagerCustomer> {
  const { id, ...body } = payload;

  if (useMocks) {
    return Promise.resolve({
      id,
      name: body.name,
      customerType: body.customerType,
      phone: body.phone,
      email: body.email,
      taxId: body.taxId,
      notes: body.notes,
      creditEnabled: true,
      creditLimit: 0,
      currentBalance: 0,
      status: body.status
    });
  }

  return httpClient<ApiCustomer>(`/customers/${id}`, {
    method: "PATCH",
    body
  }).then(mapCustomer);
}

export function customerBalanceRequest(customerId: string): Promise<CustomerBalance> {
  if (useMocks) {
    return Promise.resolve(buildDemoCustomerBalance(customerId));
  }

  return httpClient<ApiCustomerBalance>(`/customers/${customerId}/balance`).then(mapCustomerBalance);
}

export function configureCustomerCreditRequest(payload: {
  customerId: string;
  creditEnabled: boolean;
  creditLimit: string;
}): Promise<ManagerCustomer> {
  if (useMocks) {
    return Promise.resolve({
      id: payload.customerId,
      name: "Cliente",
      customerType: "cliente_frecuente",
      creditEnabled: payload.creditEnabled,
      creditLimit: Number(payload.creditLimit || 0),
      currentBalance: 0,
      status: "active"
    });
  }

  return httpClient<ApiCustomer>(`/customers/${payload.customerId}/credit`, {
    method: "POST",
    body: {
      creditEnabled: payload.creditEnabled,
      creditLimit: payload.creditLimit
    }
  }).then(mapCustomer);
}

export function setCustomerPriceRequest(payload: {
  customerId: string;
  branchId?: string;
  productId: string;
  saleMode: ManagerPrice["saleMode"];
  price: string;
}): Promise<void> {
  if (useMocks) {
    return Promise.resolve();
  }

  const { customerId, ...body } = payload;
  return httpClient<void>(`/customers/${customerId}/prices`, {
    method: "POST",
    body
  });
}

export function customerPricesRequest(customerId: string): Promise<Array<{
  id: string;
  productName: string;
  branchName: string;
  saleMode: ManagerPrice["saleMode"];
  price: number;
}>> {
  if (useMocks) {
    return Promise.resolve([]);
  }

  return httpClient<ApiCustomerPrice[]>(`/customers/${customerId}/prices`).then((prices) =>
    prices.map((price) => ({
      id: price.id,
      productName: price.product?.name ?? "Producto",
      branchName: price.branch?.name ?? "Todas",
      saleMode: saleMode(price.saleMode),
      price: Number(price.price)
    }))
  );
}

export function recordCustomerPaymentRequest(payload: {
  customerId: string;
  branchId: string;
  amount: string;
  paymentMethod: "cash" | "card" | "transfer";
  reference?: string;
}): Promise<void> {
  if (useMocks) {
    return Promise.resolve();
  }

  return httpClient<void>(`/customers/${payload.customerId}/payments`, {
    method: "POST",
    body: {
      branchId: payload.branchId,
      amount: payload.amount,
      paymentMethod: payload.paymentMethod,
      reference: payload.reference
    }
  });
}

export async function deliveryDriversRequest(): Promise<DeliveryDriver[]> {
  if (useMocks) {
    return Promise.resolve(buildDemoDrivers());
  }

  const drivers = await httpClient<ApiDeliveryDriver[]>("/delivery-drivers");
  return drivers.map(mapDriver);
}

export function createDeliveryDriverRequest(payload: { name: string; phone?: string; notes?: string }): Promise<DeliveryDriver> {
  if (useMocks) {
    return Promise.resolve({ id: `driver-${Date.now()}`, name: payload.name, phone: payload.phone, notes: payload.notes, status: "active" });
  }

  return httpClient<ApiDeliveryDriver>("/delivery-drivers", {
    method: "POST",
    body: payload
  }).then(mapDriver);
}

export async function deliveryRoutesRequest(branchId: string): Promise<DeliveryRoute[]> {
  if (useMocks) {
    return Promise.resolve(buildDemoRoutes(branchId));
  }

  const routes = await httpClient<ApiDeliveryRoute[]>(`/delivery-routes?branchId=${encodeURIComponent(branchId)}`);
  return routes.map(mapRoute);
}

export function createDeliveryRouteRequest(payload: { branchId: string; name: string; driverId?: string }): Promise<DeliveryRoute> {
  if (useMocks) {
    return Promise.resolve({
      id: `route-${Date.now()}`,
      branchId: payload.branchId,
      name: payload.name,
      driverId: payload.driverId,
      driverName: null,
      customerCount: 0,
      customers: [],
      status: "active"
    });
  }

  return httpClient<ApiDeliveryRoute>("/delivery-routes", {
    method: "POST",
    body: payload
  }).then(mapRoute);
}

export function assignCustomerToRouteRequest(payload: {
  routeId: string;
  customerId: string;
  sortOrder?: number;
}): Promise<void> {
  if (useMocks) {
    return Promise.resolve();
  }

  return httpClient<void>(`/delivery-routes/${payload.routeId}/customers`, {
    method: "POST",
    body: {
      customerId: payload.customerId,
      sortOrder: payload.sortOrder ?? 0
    }
  });
}

export function removeCustomerFromRouteRequest(payload: {
  routeId: string;
  customerId: string;
}): Promise<void> {
  if (useMocks) {
    return Promise.resolve();
  }

  return httpClient<void>(`/delivery-routes/${payload.routeId}/customers/${payload.customerId}`, {
    method: "DELETE"
  });
}

export function reorderRouteCustomersRequest(payload: {
  routeId: string;
  customers: Array<{ customerId: string; sortOrder: number }>;
}): Promise<void> {
  if (useMocks) {
    return Promise.resolve();
  }

  return httpClient<void>(`/delivery-routes/${payload.routeId}/customers/reorder`, {
    method: "PATCH",
    body: { customers: payload.customers }
  });
}

export async function deliveryOrdersRequest(routeId: string, branchId: string): Promise<DeliveryOrder[]> {
  return deliveryOrdersListRequest({ branchId, routeId });
}

export async function deliveryOrdersListRequest(filters: {
  branchId: string;
  routeId?: string;
  driverId?: string;
  customerId?: string;
  status?: string;
  date?: string;
}): Promise<DeliveryOrder[]> {
  if (useMocks) {
    return Promise.resolve(buildDemoDeliveryOrders(filters.routeId, filters.branchId));
  }

  const params = new URLSearchParams();
  params.set("branchId", filters.branchId);
  if (filters.routeId) params.set("routeId", filters.routeId);
  if (filters.driverId) params.set("driverId", filters.driverId);
  if (filters.customerId) params.set("customerId", filters.customerId);
  if (filters.status) params.set("status", filters.status);
  if (filters.date) params.set("date", filters.date);
  const orders = await httpClient<ApiDeliveryOrder[]>(`/delivery-orders?${params.toString()}`);
  return orders.map(mapDeliveryOrder);
}

export function createDeliveryOrderRequest(payload: {
  branchId: string;
  customerId: string;
  routeId?: string;
  driverId?: string;
  items: Array<{ productId: string; quantity: string }>;
}): Promise<DeliveryOrder> {
  if (useMocks) {
    return Promise.resolve(buildDemoDeliveryOrders(payload.routeId, payload.branchId)[0]);
  }

  return httpClient<ApiDeliveryOrder>("/delivery-orders", {
    method: "POST",
    headers: {
      "Idempotency-Key": crypto.randomUUID()
    },
    body: payload
  }).then(mapDeliveryOrder);
}

export function deliveryOrderActionRequest(payload: {
  orderId: string;
  action: "prepare" | "load" | "in-route";
}): Promise<DeliveryOrder> {
  if (useMocks) {
    return Promise.resolve(buildDemoDeliveryOrders()[0]);
  }

  return httpClient<ApiDeliveryOrder>(`/delivery-orders/${payload.orderId}/${payload.action}`, {
    method: "POST",
    body: {}
  }).then(mapDeliveryOrder);
}

export function deliverDeliveryOrderRequest(payload: {
  order: DeliveryOrder;
  items?: Array<{ deliveryOrderItemId: string; quantity: string }>;
}): Promise<DeliveryOrder> {
  if (useMocks) {
    return Promise.resolve({ ...payload.order, status: "delivered" });
  }

  return httpClient<ApiDeliveryOrder>(`/delivery-orders/${payload.order.id}/deliver`, {
    method: "POST",
    body: {
      items: payload.items ?? payload.order.items.map((item) => ({
        deliveryOrderItemId: item.id,
        quantity: item.quantityLoaded.toFixed(3)
      }))
    }
  }).then(mapDeliveryOrder);
}

export function recordDeliveryPaymentRequest(payload: {
  orderId: string;
  amount: string;
  paymentMethod: "cash" | "card" | "transfer" | "credit";
  reference?: string;
  authorizationPin?: string;
}): Promise<void> {
  if (useMocks) {
    return Promise.resolve();
  }

  return httpClient<void>(`/delivery-orders/${payload.orderId}/payments`, {
    method: "POST",
    headers: {
      "Idempotency-Key": crypto.randomUUID()
    },
    body: {
      amount: payload.amount,
      paymentMethod: payload.paymentMethod,
      reference: payload.reference,
      authorizationPin: payload.authorizationPin
    }
  });
}

export function createDeliverySettlementRequest(payload: {
  branchId: string;
  routeId?: string;
  driverId?: string;
}): Promise<DeliverySettlement> {
  if (useMocks) {
    return Promise.resolve(buildDemoDeliverySettlement(payload.routeId, payload.branchId));
  }

  return httpClient<ApiDeliverySettlement>("/delivery-settlements", {
    method: "POST",
    body: payload
  }).then(mapDeliverySettlement);
}

export async function deliverySettlementsRequest(filters: {
  branchId: string;
  routeId?: string;
  driverId?: string;
  status?: string;
}): Promise<DeliverySettlement[]> {
  if (useMocks) {
    return Promise.resolve([buildDemoDeliverySettlement(filters.routeId, filters.branchId)]);
  }

  const params = new URLSearchParams();
  params.set("branchId", filters.branchId);
  if (filters.routeId) params.set("routeId", filters.routeId);
  if (filters.driverId) params.set("driverId", filters.driverId);
  if (filters.status) params.set("status", filters.status);
  const settlements = await httpClient<ApiDeliverySettlement[]>(`/delivery-settlements?${params.toString()}`);
  return settlements.map(mapDeliverySettlement);
}

export function closeDeliverySettlementRequest(payload: {
  settlementId: string;
  deliveredCashAmount: string;
}): Promise<DeliverySettlement> {
  if (useMocks) {
    return Promise.resolve({ ...buildDemoDeliverySettlement(), status: "closed", deliveredCashAmount: Number(payload.deliveredCashAmount) });
  }

  return httpClient<ApiDeliverySettlement>(`/delivery-settlements/${payload.settlementId}/close`, {
    method: "POST",
    body: { deliveredCashAmount: payload.deliveredCashAmount }
  }).then(mapDeliverySettlement);
}

export function depositDeliverySettlementRequest(settlementId: string): Promise<void> {
  if (useMocks) {
    return Promise.resolve();
  }

  return httpClient<void>(`/delivery-settlements/${settlementId}/deposit-to-cash`, {
    method: "POST",
    headers: {
      "Idempotency-Key": crypto.randomUUID()
    },
    body: {}
  });
}

export function billingSummaryRequest(filters: { branchId?: string | null; date: string }): Promise<BillingSummary> {
  if (!useMocks) {
    const params = new URLSearchParams();
    params.set("date", filters.date);
    if (filters.branchId) params.set("branchId", filters.branchId);
    return httpClient<BillingSummary>(`/billing/summary?${params.toString()}`);
  }

  return Promise.resolve(buildDemoBillingSummary());
}

export function createIndividualInvoiceRequest(payload: { saleId: string }): Promise<void> {
  if (useMocks) {
    return Promise.resolve();
  }

  return httpClient<void>("/billing/invoices/individual", {
    method: "POST",
    body: payload
  });
}

export function createGlobalDailyInvoiceRequest(payload: { branchId: string; date: string }): Promise<void> {
  if (useMocks) {
    return Promise.resolve();
  }

  return httpClient<void>("/billing/invoices/global-daily", {
    method: "POST",
    body: payload
  });
}

export function stampInvoiceRequest(invoiceId: string): Promise<void> {
  if (useMocks) {
    return Promise.resolve();
  }

  return httpClient<void>(`/billing/invoices/${invoiceId}/stamp`, {
    method: "POST",
    body: {}
  });
}

export function cancelInvoiceRequest(payload: { invoiceId: string; reason?: string }): Promise<void> {
  if (useMocks) {
    return Promise.resolve();
  }

  return httpClient<void>(`/billing/invoices/${payload.invoiceId}/cancel`, {
    method: "POST",
    body: { reason: payload.reason }
  });
}

export function invoiceDocumentsRequest(invoiceId: string): Promise<BillingDocuments> {
  if (useMocks) {
    return Promise.resolve({
      invoiceId,
      cfdiUuid: "demo-cfdi",
      documents: [
        { id: "demo-xml", type: "xml", url: "/demo/factura.xml", createdAt: new Date().toISOString() },
        { id: "demo-pdf", type: "pdf", url: "/demo/factura.pdf", createdAt: new Date().toISOString() }
      ]
    });
  }

  return httpClient<BillingDocuments>(`/billing/invoices/${invoiceId}/documents`);
}

export function billingReceiptsRequest(filters: { branchId?: string | null; date: string; status?: string }): Promise<BillingReceipt[]> {
  if (useMocks) {
    return Promise.resolve([]);
  }

  const params = new URLSearchParams();
  params.set("date", filters.date);
  if (filters.branchId) params.set("branchId", filters.branchId);
  if (filters.status) params.set("status", filters.status);
  return httpClient<BillingReceipt[]>(`/billing/receipts?${params.toString()}`);
}

export function reprintBillingReceiptRequest(receiptId: string): Promise<BillingReceipt> {
  if (useMocks) {
    return Promise.reject(demoModuleUnavailable("billing-receipt-reprint"));
  }

  return httpClient<BillingReceipt>(`/billing/receipts/${receiptId}/reprint`, {
    method: "POST",
    body: {}
  });
}

export function reconciliationBatchesRequest(filters: { branchId?: string | null }): Promise<ReconciliationBatch[]> {
  if (useMocks) {
    return Promise.resolve([]);
  }

  const params = new URLSearchParams();
  if (filters.branchId) params.set("branchId", filters.branchId);
  const query = params.toString();
  return httpClient<ReconciliationBatch[]>(`/reconciliation/batches${query ? `?${query}` : ""}`);
}

export function createReconciliationBatchRequest(payload: { branchId: string; cashSessionId?: string; providerId?: string }): Promise<ReconciliationBatch> {
  if (useMocks) {
    return Promise.reject(demoModuleUnavailable("reconciliation-create"));
  }

  return httpClient<ReconciliationBatch>("/reconciliation/batches", {
    method: "POST",
    body: payload
  });
}

export function addReconciliationItemRequest(payload: {
  batchId: string;
  salePaymentId?: string;
  providerReference?: string;
  posAmount?: string;
  providerAmount?: string;
  notes?: string;
}): Promise<ReconciliationBatch> {
  if (useMocks) {
    return Promise.reject(demoModuleUnavailable("reconciliation-item"));
  }

  const { batchId, ...body } = payload;
  return httpClient<ReconciliationBatch>(`/reconciliation/batches/${batchId}/items`, {
    method: "POST",
    body
  });
}

export function reviewReconciliationBatchRequest(payload: { batchId: string; notes?: string }): Promise<ReconciliationBatch> {
  if (useMocks) {
    return Promise.reject(demoModuleUnavailable("reconciliation-review"));
  }

  return httpClient<ReconciliationBatch>(`/reconciliation/batches/${payload.batchId}/review`, {
    method: "POST",
    body: { notes: payload.notes }
  });
}

export function reportsSummaryRequest(filters: { branchId?: string | null; from: string; to: string }): Promise<ReportsSummary> {
  if (!useMocks) {
    const params = new URLSearchParams();
    params.set("from", filters.from);
    params.set("to", filters.to);
    if (filters.branchId) params.set("branchId", filters.branchId);
    return httpClient<ReportsSummary>(`/reports/summary?${params.toString()}`);
  }

  return Promise.resolve(buildDemoReportsSummary());
}

export function settingsSummaryRequest(): Promise<SettingsSummary> {
  if (!useMocks) {
    return httpClient<SettingsSummary>("/settings/summary");
  }

  return Promise.resolve(buildDemoSettingsSummary());
}

function demoModuleUnavailable(moduleName: string): ApiErrorException {
  return new ApiErrorException({
    statusCode: 501,
    error: "DEMO_MODULE_DISABLED",
    message: `El modulo ${moduleName} usa datos demo y esta bloqueado con VITE_USE_MOCKS=false.`
  });
}
