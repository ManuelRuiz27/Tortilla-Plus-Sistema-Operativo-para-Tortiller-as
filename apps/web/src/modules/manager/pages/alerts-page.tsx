import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { managerCustomersRequest, managerDashboardRequest, productionBatchesRequest } from "../../../api/manager.api";
import { LoadingState } from "../../../shared/components/loading-state";
import { OperationalAlert } from "../../../shared/components/operational-alert";
import { OperationalCard } from "../../../shared/components/operational-card";
import { StatusBadge } from "../../../shared/components/status-badge";
import { WorkspacePageHeader } from "../../../shared/components/workspace-page-header";
import { useBranchStore } from "../../../shared/stores/branch.store";
import { buildOperationalAlerts } from "../utils/operational-alerts";

const severityTone = {
  danger: "danger",
  info: "info",
  warning: "warning"
} as const;

export function AlertsPage() {
  const branchId = useBranchStore((state) => state.activeBranchId);
  const dashboardQuery = useQuery({
    queryFn: () => managerDashboardRequest({ branchId }),
    queryKey: ["manager-dashboard", branchId]
  });
  const productionQuery = useQuery({ queryFn: productionBatchesRequest, queryKey: ["production"] });
  const customersQuery = useQuery({ queryFn: managerCustomersRequest, queryKey: ["manager-customers"] });

  if (dashboardQuery.isLoading) {
    return <LoadingState message="Cargando alertas..." />;
  }

  if (dashboardQuery.isError || !dashboardQuery.data) {
    return <p className="rounded-md border border-tp-border bg-white p-5 text-sm text-tp-danger">No se pudieron cargar alertas.</p>;
  }

  const alerts = buildOperationalAlerts({
    customers: customersQuery.data ?? [],
    dashboard: dashboardQuery.data,
    productionBatches: productionQuery.data ?? []
  });
  const criticalCount = alerts.filter((alert) => alert.severity === "danger").length;

  return (
    <section>
      <WorkspacePageHeader
        description="Excepciones de operacion derivadas de caja, inventario, produccion, reparto, clientes y fiscal."
        eyebrow="Inicio"
        title="Centro de alertas"
      />

      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <OperationalCard>
          <p className="text-sm text-tp-muted">Alertas activas</p>
          <p className="mt-2 text-2xl font-semibold">{alerts.length}</p>
        </OperationalCard>
        <OperationalCard>
          <p className="text-sm text-tp-muted">Criticas</p>
          <p className="mt-2 text-2xl font-semibold">{criticalCount}</p>
        </OperationalCard>
        <OperationalCard>
          <p className="text-sm text-tp-muted">Fuentes</p>
          <p className="mt-2 text-2xl font-semibold">6</p>
        </OperationalCard>
      </div>

      <div className="grid gap-3">
        {alerts.map((alert) => (
          <OperationalAlert
            action={<Link className="text-sm font-semibold hover:underline" to={alert.href}>{alert.actionLabel}</Link>}
            key={alert.id}
            title={alert.title}
            tone={severityTone[alert.severity]}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span>{alert.message}</span>
              <StatusBadge tone={severityTone[alert.severity]}>{alert.module}</StatusBadge>
            </div>
          </OperationalAlert>
        ))}
        {alerts.length === 0 ? (
          <OperationalCard>
            <h2 className="text-sm font-semibold">Sin alertas criticas por ahora.</h2>
            <p className="mt-1 text-sm text-tp-muted">La operacion no tiene excepciones visibles con los datos actuales.</p>
          </OperationalCard>
        ) : null}
      </div>
    </section>
  );
}

