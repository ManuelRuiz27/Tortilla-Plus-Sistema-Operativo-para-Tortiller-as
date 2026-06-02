import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  downloadPlatformAccountsReceivableReportRequest,
  downloadPlatformSaasIncomeReportRequest,
  platformDashboardRequest
} from "../../../api/platform.api";
import { Button } from "../../../shared/components/button";
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
  ["subscriptionsGrace", "En gracia"],
  ["organizationsGrace", "Clientes en gracia"],
  ["monthlyRecurringRevenue", "MRR"],
  ["paymentsCurrentMonth", "Pagos del mes"],
  ["paymentsTaxCurrentMonth", "IVA cobrado"],
  ["accountsReceivable", "Cuentas por cobrar"],
  ["taxReceivable", "IVA por cobrar"],
  ["setupRevenueCurrentMonth", "Setup del mes"],
  ["cfdiOverageRevenueCurrentMonth", "CFDI excedente"]
];

export function PlatformDashboardPage() {
  const { data, isLoading } = useQuery({ queryKey: ["platform-dashboard"], queryFn: platformDashboardRequest });
  const [downloadingReport, setDownloadingReport] = useState<"income" | "receivable" | null>(null);

  async function downloadReport(type: "income" | "receivable") {
    setDownloadingReport(type);
    try {
      const report = type === "income"
        ? await downloadPlatformSaasIncomeReportRequest()
        : await downloadPlatformAccountsReceivableReportRequest();
      const url = URL.createObjectURL(report.blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = report.filename;
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloadingReport(null);
    }
  }

  if (isLoading) return <LoadingState message="Cargando plataforma..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-tp-primary">Plataforma</p>
          <h1 className="mt-2 text-2xl font-semibold">Dashboard SaaS</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button disabled={downloadingReport !== null} onClick={() => void downloadReport("income")} variant="secondary">
            <Download aria-hidden size={16} />
            Ingresos SaaS
          </Button>
          <Button disabled={downloadingReport !== null} onClick={() => void downloadReport("receivable")} variant="secondary">
            <Download aria-hidden size={16} />
            Cuentas por cobrar
          </Button>
        </div>
      </div>
      <section className="grid gap-px overflow-hidden rounded-md border border-tp-border bg-tp-border sm:grid-cols-2 xl:grid-cols-5">
        {metricLabels.map(([key, label]) => (
          <div className="bg-white p-4" key={key}>
            <p className="text-xs font-medium text-tp-muted">{label}</p>
            <p className="mt-2 text-2xl font-semibold">
              {isMoneyMetric(key) ? formatMoney(Number(data?.[key] ?? 0)) : data?.[key] ?? 0}
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
              <div className="flex items-center gap-3">
                <StatusBadge tone="warning">{alert.count}</StatusBadge>
                <Link className="text-sm font-semibold text-tp-primary" to={alert.type === "past_due" ? "/platform/subscriptions" : "/platform/organizations"}>
                  Abrir
                </Link>
              </div>
            </div>
          )) : <p className="text-sm text-tp-muted">Sin alertas criticas.</p>}
        </div>
      </section>
    </div>
  );
}

function isMoneyMetric(key: string) {
  return key.includes("Revenue") || key.includes("payments") || key.includes("Receivable") || key.includes("Tax") || key.includes("setup") || key.includes("cfdi");
}

function formatMoney(value: number) {
  return value.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}
