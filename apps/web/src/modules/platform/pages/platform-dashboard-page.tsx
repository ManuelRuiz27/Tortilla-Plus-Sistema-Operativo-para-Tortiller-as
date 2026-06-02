import { useQuery } from "@tanstack/react-query";
import { platformDashboardRequest } from "../../../api/platform.api";
import { LoadingState } from "../../../shared/components/loading-state";
import { StatusBadge } from "../../../shared/components/status-badge";
import type { PlatformDashboard } from "../types/platform.types";

const metricLabels: Array<[Exclude<keyof PlatformDashboard, "alerts">, string]> = [
  ["organizationsTotal", "Organizaciones"],
  ["organizationsActive", "Activas"],
  ["branchesActive", "Sucursales activas"],
  ["posDevicesActive", "POS activos"],
  ["posDevicesLicensed", "POS licenciados"],
  ["subscriptionsActive", "Suscripciones activas"],
  ["subscriptionsTrial", "Trials"],
  ["subscriptionsPastDue", "Vencidas"],
  ["monthlyRecurringRevenue", "MRR"],
  ["paymentsCurrentMonth", "Pagos del mes"]
];

export function PlatformDashboardPage() {
  const { data, isLoading } = useQuery({ queryKey: ["platform-dashboard"], queryFn: platformDashboardRequest });

  if (isLoading) return <LoadingState message="Cargando plataforma..." />;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-tp-primary">Plataforma</p>
        <h1 className="mt-2 text-2xl font-semibold">Dashboard SaaS</h1>
      </div>
      <section className="grid gap-px overflow-hidden rounded-md border border-tp-border bg-tp-border sm:grid-cols-2 xl:grid-cols-5">
        {metricLabels.map(([key, label]) => (
          <div className="bg-white p-4" key={key}>
            <p className="text-xs font-medium text-tp-muted">{label}</p>
            <p className="mt-2 text-2xl font-semibold">
              {key.includes("Revenue") || key.includes("payments") ? `$${Number(data?.[key] ?? 0).toFixed(2)}` : data?.[key] ?? 0}
            </p>
          </div>
        ))}
      </section>
      <section>
        <h2 className="text-sm font-semibold">Alertas</h2>
        <div className="mt-3 space-y-2">
          {data?.alerts.length ? data.alerts.map((alert) => (
            <div className="flex items-center justify-between rounded-md border border-tp-border bg-white p-3" key={alert.type}>
              <span className="text-sm">{alert.message}</span>
              <StatusBadge tone="warning">{alert.count}</StatusBadge>
            </div>
          )) : <p className="text-sm text-tp-muted">Sin alertas criticas.</p>}
        </div>
      </section>
    </div>
  );
}
