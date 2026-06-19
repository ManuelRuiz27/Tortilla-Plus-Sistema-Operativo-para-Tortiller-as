import type { CashSession, LoginResponse, UserBranch, UserRole } from "../shared/types/session.types";
import type { PosProduct } from "../modules/pos/types/pos.types";
import type {
  BillingSummary,
  CashSummary,
  CustomerBalance,
  DeliveryDriver,
  DeliveryOrder,
  DeliveryRoute,
  DeliverySettlement,
  InventoryItem,
  InventoryMovement,
  ManagerDashboardSummary,
  ManagerCustomer,
  ManagerPrice,
  ManagerProduct,
  PendingWithdrawal,
  ProductionBatch,
  ReportsSummary,
  SettingsSummary
} from "../modules/manager/types/manager.types";

export const useMocks = import.meta.env.VITE_USE_MOCKS !== "false";

export const demoBranches: UserBranch[] = [
  {
    branchId: "branch-principal",
    branchName: "Sucursal Principal",
    role: "admin",
    status: "active"
  },
  {
    branchId: "branch-mercado",
    branchName: "Sucursal Mercado",
    role: "cashier",
    status: "active"
  }
];

export function buildDemoLogin(role: "cashier" | "manager", email: string): LoginResponse {
  const roles: UserRole[] = role === "manager" ? ["manager"] : ["cashier"];
  const permissions =
    role === "manager"
      ? ["cash.open", "cash.movements.view", "inventory.manage", "products.view", "products.manage", "production.manage", "recipes.view", "recipes.manage"]
      : ["cash.open", "sales.create", "payments.create"];

  return {
    accessToken: "demo-access-token",
    refreshToken: "demo-refresh-token",
    tokenType: "Bearer",
    expiresIn: 900,
    user: {
      id: `demo-${role}`,
      organizationId: "demo-org",
      email,
      fullName: role === "manager" ? "Gerente Demo" : "Cajero Demo",
      roles,
      permissions,
      branches: demoBranches
    }
  };
}

export function buildDemoCashSession(branchId: string): CashSession {
  return {
    id: `cash-${branchId}`,
    branchId,
    status: "open"
  };
}

export function buildDemoCashSummary(branchId = "branch-principal"): CashSummary {
  return {
    id: `cash-${branchId}`,
    branchId,
    status: "open",
    openingAmount: 500,
    cashInTotal: 320,
    cashOutTotal: 850,
    expectedCashAmount: 3910,
    sales: {
      cash: 3940,
      card: 2840,
      transfer: 0,
      credit: 1640
    },
    movements: [
      { id: "movement-income", movementType: "cash_in", amount: 320, description: "Ingreso por cambio", status: "recorded", createdAt: "2026-05-23 09:40" },
      { id: "movement-withdrawal", movementType: "cash_out", amount: 850, description: "Pago proveedor", status: "authorized", createdAt: "2026-05-23 10:20" }
    ]
  };
}

export function buildDemoPosProducts(branchId: string): PosProduct[] {
  return [
    {
      id: "prod-tortilla",
      name: "Tortilla",
      productType: "tortilla",
      unit: "kg",
      isSellable: true,
      isStockTracked: true,
      requiresProduction: true,
      status: "active",
      prices: [
        { branchId, saleMode: "by_kg", price: 28, currency: "MXN" },
        { branchId, saleMode: "by_amount", price: 28, currency: "MXN" }
      ]
    },
    {
      id: "prod-masa",
      name: "Masa",
      productType: "masa",
      unit: "kg",
      isSellable: true,
      isStockTracked: true,
      requiresProduction: true,
      status: "active",
      prices: [
        { branchId, saleMode: "by_kg", price: 18, currency: "MXN" },
        { branchId, saleMode: "by_amount", price: 18, currency: "MXN" }
      ]
    },
    {
      id: "prod-pack-800",
      name: "Paquete tortilla 800g",
      sku: "PAQ-800",
      productType: "package",
      unit: "package",
      isSellable: true,
      isStockTracked: true,
      requiresProduction: false,
      status: "active",
      prices: [{ branchId, saleMode: "by_package", price: 22, currency: "MXN" }]
    },
    {
      id: "prod-salsa-roja",
      name: "Salsa roja chica",
      sku: "SAL-ROJA-CH",
      productType: "retail",
      unit: "piece",
      isSellable: true,
      isStockTracked: true,
      requiresProduction: false,
      status: "active",
      prices: [{ branchId, saleMode: "by_unit", price: 15, currency: "MXN" }]
    },
    {
      id: "prod-bolsa",
      name: "Bolsa",
      sku: "BOLSA",
      productType: "retail",
      unit: "piece",
      isSellable: true,
      isStockTracked: true,
      requiresProduction: false,
      status: "active",
      prices: [{ branchId, saleMode: "by_unit", price: 2, currency: "MXN" }]
    },
    {
      id: "prod-refresco",
      name: "Refresco 600ml",
      sku: "REF-600",
      productType: "retail",
      unit: "piece",
      isSellable: true,
      isStockTracked: true,
      requiresProduction: false,
      status: "active",
      prices: [{ branchId, saleMode: "by_unit", price: 20, currency: "MXN" }]
    }
  ];
}

export function buildDemoManagerSummary(): ManagerDashboardSummary {
  return {
    salesToday: 8420,
    cashExpected: 3910,
    pendingWithdrawals: 2,
    negativeStockItems: 1,
    activeRoutes: 3,
    pendingBilling: 1,
    cashSession: {
      id: "cash-branch-principal",
      status: "open",
      openedBy: "Cajero Demo",
      openedAt: "08:04"
    }
  };
}

export function buildDemoWithdrawals(): PendingWithdrawal[] {
  return [
    {
      id: "withdrawal-1",
      requestedAt: "10:15",
      cashierName: "Cajero Demo",
      branchName: "Sucursal Principal",
      amount: 350,
      reason: "Compra menor",
      description: "Compra de bolsas y servilletas",
      status: "pending_authorization"
    },
    {
      id: "withdrawal-2",
      requestedAt: "11:30",
      cashierName: "Cajero Demo",
      branchName: "Sucursal Principal",
      amount: 500,
      reason: "Pago proveedor",
      description: "Anticipo proveedor de masa",
      status: "pending_authorization"
    }
  ];
}

export function buildDemoInventory(): InventoryItem[] {
  return [
    {
      productId: "prod-tortilla",
      productName: "Tortilla",
      productType: "tortilla",
      currentStock: -4.5,
      minimumStock: 10,
      unit: "kg",
      status: "negative",
      updatedAt: "12:05"
    },
    {
      productId: "prod-masa",
      productName: "Masa",
      productType: "masa",
      currentStock: 18,
      minimumStock: 12,
      unit: "kg",
      status: "ok",
      updatedAt: "11:50"
    },
    {
      productId: "prod-salsa-roja",
      productName: "Salsa roja chica",
      productType: "retail",
      currentStock: 7,
      minimumStock: 10,
      unit: "piece",
      status: "low",
      updatedAt: "10:40"
    },
    {
      productId: "prod-bolsa",
      productName: "Bolsa",
      productType: "retail",
      currentStock: 0,
      minimumStock: 25,
      unit: "piece",
      status: "out",
      updatedAt: "09:30"
    }
  ];
}

export function buildDemoInventoryMovements(filters: {
  branchId?: string | null;
  productId?: string | null;
  movementType?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  limit?: number;
} = {}): InventoryMovement[] {
  const products = buildDemoManagerProducts();
  const movementProduct = (productId: string) => products.find((product) => product.id === productId) ?? null;
  const movements: InventoryMovement[] = [
    {
      id: "inventory-movement-production-in",
      branchId: "branch-principal",
      productId: "prod-masa",
      movementType: "production_in",
      quantity: 33,
      unit: "kg",
      reason: "Cierre de lote por receta",
      referenceType: "production_batch",
      referenceId: "production-today",
      createdByUserId: "demo-manager",
      authorizedByUserId: null,
      createdAt: "2026-05-23T11:45:00.000Z",
      product: movementProduct("prod-masa")
    },
    {
      id: "inventory-movement-input-out",
      branchId: "branch-principal",
      productId: "prod-maiz",
      movementType: "production_input_out",
      quantity: 25,
      unit: "kg",
      reason: "Consumo esperado de receta",
      referenceType: "production_batch",
      referenceId: "production-today",
      createdByUserId: "demo-manager",
      authorizedByUserId: null,
      createdAt: "2026-05-23T11:45:00.000Z",
      product: movementProduct("prod-maiz")
    },
    {
      id: "inventory-movement-adjustment-out",
      branchId: "branch-principal",
      productId: "prod-tortilla",
      movementType: "manual_adjustment_out",
      quantity: 4.5,
      unit: "kg",
      reason: "Ajuste de conteo",
      referenceType: "manual_adjustment",
      referenceId: "manual-adjustment-demo",
      createdByUserId: "demo-manager",
      authorizedByUserId: null,
      createdAt: "2026-05-23T12:05:00.000Z",
      product: movementProduct("prod-tortilla")
    },
    {
      id: "inventory-movement-waste",
      branchId: "branch-principal",
      productId: "prod-tortilla",
      movementType: "waste_out",
      quantity: 1.25,
      unit: "kg",
      reason: "Tortilla rota",
      referenceType: "waste_record",
      referenceId: "waste-demo",
      createdByUserId: "demo-manager",
      authorizedByUserId: null,
      createdAt: "2026-05-23T12:20:00.000Z",
      product: movementProduct("prod-tortilla")
    }
  ];

  return movements
    .filter((movement) => !filters.branchId || movement.branchId === filters.branchId)
    .filter((movement) => !filters.productId || movement.productId === filters.productId)
    .filter((movement) => !filters.movementType || movement.movementType === filters.movementType)
    .filter((movement) => !filters.referenceType || movement.referenceType === filters.referenceType)
    .filter((movement) => !filters.referenceId || movement.referenceId === filters.referenceId)
    .slice(0, filters.limit ?? 100);
}

export function buildDemoProduction(): ProductionBatch[] {
  return [
    {
      id: "production-today",
      productionDate: "2026-05-23",
      tortillaKg: 120,
      masaKg: 35,
      status: "open"
    }
  ];
}

export function buildDemoManagerProducts(): ManagerProduct[] {
  return [
    ...buildDemoPosProducts("branch-principal").map((product) => ({
    id: product.id,
    name: product.name,
    sku: product.sku ?? undefined,
    barcode: product.barcode,
    productType: product.productType,
    unit: product.unit,
    isSellable: product.isSellable,
    isStockTracked: product.isStockTracked,
    requiresProduction: product.requiresProduction,
    isRecipeIngredient: product.productType === "masa",
    allowNegativeStock: false,
    status: product.status === "active" ? "active" as const : "inactive" as const
  })),
    {
      id: "prod-maiz",
      name: "Maiz",
      sku: "MAIZ-KG",
      productType: "raw_material",
      unit: "kg",
      isSellable: false,
      isStockTracked: true,
      requiresProduction: false,
      isRecipeIngredient: true,
      allowNegativeStock: false,
      status: "active"
    },
    {
      id: "prod-cal",
      name: "Cal",
      sku: "CAL-KG",
      productType: "raw_material",
      unit: "kg",
      isSellable: false,
      isStockTracked: true,
      requiresProduction: false,
      isRecipeIngredient: true,
      allowNegativeStock: false,
      status: "active"
    }
  ];
}

export function buildDemoPrices(): ManagerPrice[] {
  return buildDemoPosProducts("branch-principal").flatMap((product) =>
    product.prices.map((price) => ({
      productId: product.id,
      productName: product.name,
      saleMode: price.saleMode,
      price: price.price,
      effectiveFrom: "2026-05-23",
      status: "active" as const
    }))
  );
}

export function buildDemoCustomers(): ManagerCustomer[] {
  return [
    {
      id: "customer-fonda",
      name: "Fonda La Esquina",
      customerType: "comedor",
      phone: "555-102-3300",
      email: "compras@fonda.local",
      taxId: "FES901201AB1",
      notes: "Entrega lunes a sabado antes de las 10:00.",
      creditEnabled: true,
      creditLimit: 2500,
      currentBalance: 640,
      status: "active"
    },
    {
      id: "customer-puesto",
      name: "Puesto Mercado 12",
      customerType: "puesto",
      phone: "555-201-8821",
      notes: "Compra de mostrador y ruta mercado.",
      creditEnabled: false,
      creditLimit: 0,
      currentBalance: 0,
      status: "active"
    },
    {
      id: "customer-abarrotes",
      name: "Abarrotes Santa Cruz",
      customerType: "tienda",
      phone: "555-320-1099",
      taxId: "ASC800505XZ2",
      notes: "Cliente con credito semanal.",
      creditEnabled: true,
      creditLimit: 5000,
      currentBalance: 1220,
      status: "active"
    }
  ];
}

export function buildDemoCustomerBalance(customerId: string): CustomerBalance {
  const customer = buildDemoCustomers().find((item) => item.id === customerId);

  return {
    currentBalance: customer?.currentBalance ?? 0,
    movements: [
      {
        id: "balance-1",
        movementType: "credit_sale",
        amount: 420,
        referenceType: "sale",
        referenceId: "sale-1040",
        createdAt: "2026-05-23 10:20"
      },
      {
        id: "balance-2",
        movementType: "payment",
        amount: -280,
        referenceType: "payment",
        referenceId: "pay-982",
        createdAt: "2026-05-22 17:05"
      }
    ]
  };
}

export function buildDemoDrivers(): DeliveryDriver[] {
  return [
    { id: "driver-juan", name: "Juan Martinez", phone: "555-100-1212", status: "active" },
    { id: "driver-luis", name: "Luis Herrera", phone: "555-110-3434", status: "active" }
  ];
}

export function buildDemoRoutes(branchId = "branch-principal"): DeliveryRoute[] {
  return [
    {
      id: "route-centro",
      branchId,
      name: "Centro",
      driverId: "driver-juan",
      driverName: "Juan Martinez",
      customerCount: 12,
      customers: [],
      status: "active"
    },
    {
      id: "route-mercado",
      branchId,
      name: "Mercado",
      driverId: "driver-luis",
      driverName: "Luis Herrera",
      customerCount: 8,
      customers: [],
      status: "active"
    }
  ];
}

export function buildDemoDeliveryOrders(routeId = "route-centro", branchId = "branch-principal"): DeliveryOrder[] {
  return [
    {
      id: "delivery-order-1",
      branchId,
      routeId,
      driverId: "driver-juan",
      customerId: "customer-fonda",
      customerName: "Fonda La Esquina",
      status: "pending",
      total: 840,
      amountCollected: 0,
      amountPending: 840,
      items: [
        {
          id: "delivery-order-item-1",
          productId: "prod-tortilla",
          productName: "Tortilla",
          quantityLoaded: 30,
          quantityDelivered: 0,
          quantityReturned: 0,
          unitPrice: 28,
          total: 840
        }
      ]
    }
  ];
}

export function buildDemoDeliverySettlement(routeId = "route-centro", branchId = "branch-principal"): DeliverySettlement {
  return {
    id: "delivery-settlement-1",
    branchId,
    routeId,
    driverId: "driver-juan",
    status: "open",
    expectedCashAmount: 840,
    deliveredCashAmount: 0,
    differenceAmount: 0,
    cashSessionId: null
  };
}

export function buildDemoBillingSummary(): BillingSummary {
  return {
    billableSales: [
      { id: "sale-1041", folio: "V-1041", customerName: "Fonda La Esquina", saleDate: "2026-05-23 09:18", total: 812, status: "billable" },
      { id: "sale-1042", folio: "V-1042", customerName: "Publico general", saleDate: "2026-05-23 10:42", total: 438, status: "global_candidate" },
      { id: "sale-1043", folio: "V-1043", customerName: "Abarrotes Santa Cruz", saleDate: "2026-05-23 11:05", total: 1260, status: "billable" }
    ],
    invoices: [
      { id: "invoice-211", folio: "F-211", customerName: "Comedor San Luis", issuedAt: "2026-05-23 08:55", total: 980, status: "stamped" },
      { id: "invoice-210", folio: "F-210", customerName: "Publico general", issuedAt: "2026-05-22 19:05", total: 3420, status: "stamped" }
    ],
    globalDaily: {
      date: "2026-05-23",
      total: 438,
      status: "not_created"
    },
    stampErrors: 0
  };
}

export function buildDemoReportsSummary(): ReportsSummary {
  return {
    salesByDay: [
      { label: "Lun", value: 7200 },
      { label: "Mar", value: 8040 },
      { label: "Mie", value: 7660 },
      { label: "Jue", value: 8420 },
      { label: "Vie", value: 9180 },
      { label: "Sab", value: 6940 }
    ],
    salesByProduct: [
      { label: "Tortilla", value: 18420 },
      { label: "Masa", value: 6210 },
      { label: "Paquetes", value: 3180 },
      { label: "Retail", value: 1560 }
    ],
    salesByBranch: [
      { label: "Principal", value: 28420 },
      { label: "Mercado", value: 10950 }
    ],
    salesByCustomer: [
      { label: "Mostrador", value: 21420 },
      { label: "Comedor San Luis", value: 8950 },
      { label: "Tienda Lupita", value: 5400 }
    ],
    withdrawalsByReason: [
      { label: "Proveedor", value: 1650 },
      { label: "Compra menor", value: 920 },
      { label: "Cambio", value: 500 }
    ],
    cashDifferences: [
      { label: "Faltante", value: 85 },
      { label: "Sobrante", value: 32 }
    ],
    production: {
      summary: {
        closedBatches: 4,
        expectedOutputQuantity: 132,
        actualOutputQuantity: 128.6,
        outputVarianceQuantity: -3.4,
        averageYieldPercentage: 97.42,
        batchesWithVarianceReason: 1,
        batchesWithHighVarianceAuthorization: 0
      },
      byRecipe: [
        { label: "Masa estandar", value: 96.4 },
        { label: "Tortilla diaria", value: 32.2 }
      ],
      byOutputProduct: [
        { label: "Masa", value: 96.4 },
        { label: "Tortilla", value: 32.2 }
      ],
      ingredientConsumption: [
        { label: "Maiz", value: 100, expectedQuantity: 98, actualQuantity: 100, varianceQuantity: 2, unit: "kg" },
        { label: "Harina", value: 18.5, expectedQuantity: 18, actualQuantity: 18.5, varianceQuantity: 0.5, unit: "kg" },
        { label: "Cal", value: 0.42, expectedQuantity: 0.4, actualQuantity: 0.42, varianceQuantity: 0.02, unit: "kg" }
      ],
      recentBatches: [
        {
          id: "demo-production-batch-1",
          productionDate: "2026-06-17",
          branchName: "Principal",
          recipeName: "Masa estandar",
          recipeVersion: 2,
          outputProductName: "Masa",
          expectedOutputQuantity: 33,
          actualOutputQuantity: 32.2,
          outputUnit: "kg",
          yieldPercentage: 97.58,
          outputVariancePercentage: 2.42,
          varianceReason: null,
          ingredients: [
            { productId: "maiz", productName: "Maiz", expectedQuantity: 25, actualQuantity: 25.2, varianceQuantity: 0.2, unit: "kg" },
            { productId: "cal", productName: "Cal", expectedQuantity: 0.1, actualQuantity: 0.1, varianceQuantity: 0, unit: "kg" }
          ]
        }
      ]
    }
  };
}

export function buildDemoSettingsSummary(): SettingsSummary {
  return {
    posDevices: [
      { id: "pos-1", branchId: "branch-1", name: "Caja principal", status: "active", lastSeen: "Hace 2 min" },
      { id: "pos-2", branchId: "branch-1", name: "Caja mercado", status: "inactive", lastSeen: "Ayer 18:12" }
    ],
    withdrawalReasons: [
      { id: "reason-1", name: "Compra menor", direction: "out", requiresAuthorization: true },
      { id: "reason-2", name: "Pago proveedor", direction: "out", requiresAuthorization: true },
      { id: "reason-3", name: "Ingreso por cambio", direction: "in", requiresAuthorization: false }
    ],
    packageConfig: [
      { productName: "Paquete tortilla 1kg", baseProductName: "Tortilla", packageWeightGrams: 1000 },
      { productName: "Paquete tortilla 500g", baseProductName: "Tortilla", packageWeightGrams: 500 }
    ],
    auditLogs: [
      {
        id: "audit-1",
        action: "sale_completed",
        entityType: "sale",
        entityId: "sale-demo",
        branchName: "Sucursal Principal",
        userName: "Demo",
        createdAt: new Date().toISOString()
      }
    ]
  };
}
