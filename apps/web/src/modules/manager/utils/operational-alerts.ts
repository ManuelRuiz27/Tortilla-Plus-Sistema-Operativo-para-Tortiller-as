import type { ManagerCustomer, ManagerDashboardSummary, ProductionBatch } from "../types/manager.types";

export type OperationalAlertSeverity = "info" | "warning" | "danger";

export type DerivedOperationalAlert = {
  actionLabel: string;
  href: string;
  id: string;
  message: string;
  module: string;
  severity: OperationalAlertSeverity;
  title: string;
};

type BuildOperationalAlertsInput = {
  customers?: ManagerCustomer[];
  dashboard: ManagerDashboardSummary;
  productionBatches?: ProductionBatch[];
};

export function creditPendingTotal(customers: ManagerCustomer[] = []) {
  return customers.reduce((sum, customer) => sum + Math.max(customer.currentBalance, 0), 0);
}

export function openProductionCount(productionBatches: ProductionBatch[] = []) {
  return productionBatches.filter((batch) => batch.status === "open").length;
}

export function buildOperationalAlerts({
  customers = [],
  dashboard,
  productionBatches = []
}: BuildOperationalAlertsInput): DerivedOperationalAlert[] {
  const alerts: DerivedOperationalAlert[] = [];
  const productionOpen = openProductionCount(productionBatches);
  const creditPending = creditPendingTotal(customers);

  if (!dashboard.cashSession || dashboard.cashSession.status !== "open") {
    alerts.push({
      actionLabel: "Abrir caja",
      href: "/app/pos/cash/open",
      id: "cash-closed",
      message: "Abre una caja para poder vender en mostrador.",
      module: "Caja",
      severity: "warning",
      title: "La caja esta cerrada"
    });
  }

  if (dashboard.pendingWithdrawals > 0) {
    alerts.push({
      actionLabel: "Ver retiros",
      href: "/app/withdrawals",
      id: "pending-withdrawals",
      message: `Hay ${dashboard.pendingWithdrawals} retiros pendientes por autorizar.`,
      module: "Caja",
      severity: "warning",
      title: "Retiros pendientes"
    });
  }

  if (dashboard.negativeStockItems > 0) {
    alerts.push({
      actionLabel: "Revisar inventario",
      href: "/app/inventory",
      id: "negative-stock",
      message: `Hay ${dashboard.negativeStockItems} productos con inventario por revisar.`,
      module: "Inventario",
      severity: "danger",
      title: "Inventario critico"
    });
  }

  if (productionOpen > 0) {
    alerts.push({
      actionLabel: "Ver produccion",
      href: "/app/production",
      id: "open-production",
      message: `Hay ${productionOpen} lotes abiertos que deben cerrarse para ingresar producto al inventario.`,
      module: "Produccion",
      severity: "warning",
      title: "Produccion abierta"
    });
  }

  if (dashboard.activeRoutes > 0) {
    alerts.push({
      actionLabel: "Ver reparto",
      href: "/app/routes",
      id: "active-routes",
      message: `Hay ${dashboard.activeRoutes} rutas activas o pendientes de seguimiento.`,
      module: "Reparto",
      severity: "info",
      title: "Rutas en operacion"
    });
  }

  if (creditPending > 0) {
    alerts.push({
      actionLabel: "Ver clientes",
      href: "/app/customers",
      id: "customer-credit",
      message: `Hay ${creditPending.toLocaleString("es-MX", { style: "currency", currency: "MXN" })} pendientes de cobrar a clientes.`,
      module: "Clientes",
      severity: "warning",
      title: "Credito pendiente"
    });
  }

  if (dashboard.pendingBilling > 0) {
    alerts.push({
      actionLabel: "Ver facturacion",
      href: "/app/fiscal/invoices",
      id: "pending-billing",
      message: `Hay ${dashboard.pendingBilling} ventas o documentos pendientes de facturar.`,
      module: "Fiscal",
      severity: "warning",
      title: "Facturacion pendiente"
    });
  }

  return alerts;
}

