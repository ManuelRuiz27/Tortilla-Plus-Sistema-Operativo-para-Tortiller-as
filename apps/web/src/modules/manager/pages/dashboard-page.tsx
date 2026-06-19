import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, BadgeDollarSign, Boxes, CreditCard, Factory, FileText, PackagePlus, ReceiptText, Route, ShoppingCart, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { managerCustomersRequest, managerDashboardRequest, productionBatchesRequest } from "../../../api/manager.api";
import { LoadingState } from "../../../shared/components/loading-state";
import { OperationalAlert } from "../../../shared/components/operational-alert";
import { OperationalCard } from "../../../shared/components/operational-card";
import { StatusBadge } from "../../../shared/components/status-badge";
import { WorkspacePageHeader } from "../../../shared/components/workspace-page-header";
import { useBranchStore } from "../../../shared/stores/branch.store";
import { buildOperationalAlerts, creditPendingTotal, openProductionCount } from "../utils/operational-alerts";
import { formatManagerMoney } from "../utils/money";

export function DashboardPage() {
  const branchId = useBranchStore((state) => state.activeBranchId);
  const { data, isError, isLoading } = useQuery({
    queryFn: () => managerDashboardRequest({ branchId }),
    queryKey: ["manager-dashboard", branchId]
  });
  const productionQuery = useQuery({ queryFn: productionBatchesRequest, queryKey: ["production"] });
  const customersQuery = useQuery({ queryFn: managerCustomersRequest, queryKey: ["manager-customers"] });

  if (isLoading) {
    return <LoadingState message="Cargando el dia..." />;
  }

  if (isError || !data) {
    return <p className="rounded-md border border-tp-border bg-white p-5 text-sm text-tp-danger">No se pudo cargar el inicio.</p>;
  }

  const productionOpen = openProductionCount(productionQuery.data ?? []);
  const creditPending = creditPendingTotal(customersQuery.data ?? []);
  const alerts = buildOperationalAlerts({
    customers: customersQuery.data ?? [],
    dashboard: data,
    productionBatches: productionQuery.data ?? []
  });
  const criticalAlerts = alerts.filter((alert) => alert.severity === "danger").length;
  const metrics = [
    { label: "Ventas hoy", value: formatManagerMoney(data.salesToday), icon: ReceiptText, to: "/app/reports" },
    { label: "Caja actual", value: data.cashSession?.status === "open" ? formatManagerMoney(data.cashExpected) : "Sin caja", icon: CreditCard, to: "/app/cash" },
    { label: "Produccion abierta", value: String(productionOpen), icon: Factory, to: "/app/production" },
    { label: "Rutas pendientes", value: String(data.activeRoutes), icon: Route, to: "/app/routes" },
    { label: "Stock bajo", value: String(data.negativeStockItems), icon: Boxes, to: "/app/inventory" },
    { label: "Credito pendiente", value: formatManagerMoney(creditPending), icon: Users, to: "/app/customers" },
    { label: "Facturas pendientes", value: String(data.pendingBilling), icon: FileText, to: "/app/fiscal/invoices" },
    { label: "Alertas criticas", value: String(criticalAlerts), icon: AlertTriangle, to: "/app/alerts" }
  ];
  const visibleAlerts = alerts.slice(0, 4);

  return (
    <section>
      <WorkspacePageHeader
        description="Ventas, caja y pendientes principales de la sucursal activa."
        eyebrow="Inicio"
        title="Resumen de hoy"
      />

      <div className="mb-5 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {[
          { label: "Vender en POS", to: "/app/pos/sale", icon: ShoppingCart },
          { label: "Preparar ruta", to: "/app/routes", icon: Route },
          { label: "Agregar producto", to: "/app/admin/products", icon: PackagePlus },
          { label: "Actualizar precios", to: "/app/admin/prices", icon: BadgeDollarSign },
          { label: "Cobrar saldos", to: "/app/customers", icon: Users },
          { label: "Revisar stock", to: "/app/inventory", icon: Boxes },
          { label: "Autorizar retiros", to: "/app/withdrawals", icon: AlertTriangle },
          { label: "Cerrar caja", to: "/app/cash", icon: CreditCard }
        ].map((item) => (
          <Link className="flex min-h-16 items-center gap-3 rounded-md border border-tp-border bg-white p-3 text-sm font-semibold hover:bg-tp-soft" key={item.label} to={item.to}>
            <item.icon className="h-4 w-4 text-tp-primary" aria-hidden="true" />
            {item.label}
          </Link>
        ))}
      </div>

      <div className="mb-5 grid gap-3">
        {visibleAlerts.map((alert) => (
          <OperationalAlert
            action={<Link className="text-sm font-semibold hover:underline" to={alert.href}>{alert.actionLabel}</Link>}
            key={alert.id}
            title={alert.title}
            tone={alert.severity}
          >
            {alert.message}
          </OperationalAlert>
        ))}
        {alerts.length > visibleAlerts.length ? (
          <Link className="rounded-md border border-tp-border bg-white p-4 text-sm font-semibold text-tp-primary hover:bg-tp-soft" to="/app/alerts">
            Ver {alerts.length - visibleAlerts.length} alertas mas
          </Link>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((item) => (
          <Link key={item.label} to={item.to}>
            <OperationalCard className="h-full transition hover:border-tp-primary hover:bg-tp-surface">
              <item.icon className="h-5 w-5 text-tp-primary" aria-hidden="true" />
              <p className="mt-5 text-sm text-tp-muted">{item.label}</p>
              <p className="mt-1 text-2xl font-semibold">{item.value}</p>
            </OperationalCard>
          </Link>
        ))}
      </div>

      <OperationalCard className="mt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Caja actual</h2>
            <p className="mt-1 text-sm text-tp-muted">
              {data.cashSession ? `Abierta por ${data.cashSession.openedBy} a las ${data.cashSession.openedAt}` : "No hay caja abierta."}
            </p>
          </div>
          <StatusBadge tone={data.cashSession?.status === "open" ? "success" : "warning"}>
            {data.cashSession?.status === "open" ? "Caja abierta" : "Sin caja"}
          </StatusBadge>
        </div>
      </OperationalCard>
    </section>
  );
}
