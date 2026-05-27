import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, BadgeDollarSign, Boxes, CreditCard, PackagePlus, ReceiptText, Route, ShoppingCart, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { managerDashboardRequest } from "../../../api/manager.api";
import { LoadingState } from "../../../shared/components/loading-state";
import { StatusBadge } from "../../../shared/components/status-badge";
import { useBranchStore } from "../../../shared/stores/branch.store";
import { formatManagerMoney } from "../utils/money";

export function DashboardPage() {
  const branchId = useBranchStore((state) => state.activeBranchId);
  const { data, isError, isLoading } = useQuery({
    queryFn: () => managerDashboardRequest({ branchId }),
    queryKey: ["manager-dashboard", branchId]
  });

  if (isLoading) {
    return <LoadingState message="Cargando el dia..." />;
  }

  if (isError || !data) {
    return <p className="rounded-md border border-tp-border bg-white p-5 text-sm text-tp-danger">No se pudo cargar el inicio.</p>;
  }

  const metrics = [
    { label: "Ventas de hoy", value: formatManagerMoney(data.salesToday), icon: ReceiptText },
    { label: "Efectivo esperado", value: formatManagerMoney(data.cashExpected), icon: CreditCard },
    { label: "Retiros pendientes", value: String(data.pendingWithdrawals), icon: AlertTriangle },
    { label: "Productos por revisar", value: String(data.negativeStockItems), icon: Boxes },
    { label: "Rutas activas", value: String(data.activeRoutes), icon: Route }
  ];

  return (
    <section>
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-tp-primary">Inicio</p>
        <h1 className="mt-3 text-2xl font-semibold">Resumen de hoy</h1>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {[
          { label: "Vender en POS", to: "/app/pos/sale", icon: ShoppingCart },
          { label: "Preparar ruta", to: "/app/manager/routes", icon: Route },
          { label: "Agregar producto", to: "/app/manager/products", icon: PackagePlus },
          { label: "Actualizar precios", to: "/app/manager/prices", icon: BadgeDollarSign },
          { label: "Cobrar saldos", to: "/app/manager/customers", icon: Users },
          { label: "Revisar stock", to: "/app/manager/inventory", icon: Boxes },
          { label: "Autorizar retiros", to: "/app/manager/withdrawals", icon: AlertTriangle },
          { label: "Cerrar caja", to: "/app/manager/cash", icon: CreditCard }
        ].map((item) => (
          <Link className="flex min-h-16 items-center gap-3 rounded-md border border-tp-border bg-white p-3 text-sm font-semibold hover:bg-tp-soft" key={item.label} to={item.to}>
            <item.icon className="h-4 w-4 text-tp-secondary" aria-hidden="true" />
            {item.label}
          </Link>
        ))}
      </div>

      <div className="mb-5 grid gap-3">
        {data.pendingWithdrawals > 0 ? (
          <Link className="rounded-md border border-yellow-200 bg-yellow-50 p-4 text-sm font-semibold text-tp-warning" to="/app/manager/withdrawals">
            Hay {data.pendingWithdrawals} retiros pendientes por autorizar.
          </Link>
        ) : null}
        {data.negativeStockItems > 0 ? (
          <Link className="rounded-md border border-red-100 bg-red-50 p-4 text-sm font-semibold text-tp-danger" to="/app/manager/inventory">
            Hay {data.negativeStockItems} producto por revisar en inventario.
          </Link>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {metrics.map((item) => (
          <article className="rounded-md border border-tp-border bg-white p-5" key={item.label}>
            <item.icon className="h-5 w-5 text-tp-secondary" aria-hidden="true" />
            <p className="mt-5 text-sm text-tp-muted">{item.label}</p>
            <p className="mt-1 text-2xl font-semibold">{item.value}</p>
          </article>
        ))}
      </div>

      <article className="mt-5 rounded-md border border-tp-border bg-white p-5">
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
      </article>
    </section>
  );
}
