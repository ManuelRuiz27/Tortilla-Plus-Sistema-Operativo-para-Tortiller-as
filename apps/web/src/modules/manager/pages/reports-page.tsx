import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { reportsSummaryRequest } from "../../../api/manager.api";
import { LoadingState } from "../../../shared/components/loading-state";
import { useBranchStore } from "../../../shared/stores/branch.store";
import { formatManagerMoney } from "../utils/money";

function defaultFrom() {
  const date = new Date();
  date.setDate(date.getDate() - 6);
  return date.toISOString().slice(0, 10);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function Bars({ items, money = true }: { items: Array<{ label: string; value: number }>; money?: boolean }) {
  if (items.length === 0) {
    return <p className="text-sm text-tp-muted">Sin datos para el periodo.</p>;
  }

  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div className="grid grid-cols-[110px_1fr_96px] items-center gap-3 text-sm" key={item.label}>
          <span className="truncate text-tp-muted">{item.label}</span>
          <div className="h-2 overflow-hidden rounded-full bg-tp-soft">
            <div className="h-full rounded-full bg-tp-secondary" style={{ width: `${Math.max((item.value / max) * 100, 6)}%` }} />
          </div>
          <span className="text-right font-semibold">{money ? formatManagerMoney(item.value) : item.value}</span>
        </div>
      ))}
    </div>
  );
}

export function ReportsPage() {
  const branchId = useBranchStore((state) => state.activeBranchId);
  const [from, setFrom] = useState(defaultFrom());
  const [to, setTo] = useState(today());
  const { data, isError, isFetching, isLoading } = useQuery({
    enabled: Boolean(from && to),
    queryFn: () => reportsSummaryRequest({ branchId, from, to }),
    queryKey: ["reports-summary", branchId, from, to]
  });

  if (isLoading) return <LoadingState message="Cargando reportes..." />;
  if (isError || !data) return <p className="rounded-md border border-tp-border bg-white p-5 text-sm text-tp-danger">No se pudieron cargar reportes.</p>;

  const totalSales = data.salesByDay.reduce((sum, point) => sum + point.value, 0);
  const totalWithdrawals = data.withdrawalsByReason.reduce((sum, point) => sum + point.value, 0);
  const totalDifferences = data.cashDifferences.reduce((sum, point) => sum + point.value, 0);

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-tp-primary">Reportes</p>
          <h1 className="mt-3 text-2xl font-semibold">Como va el negocio</h1>
          <p className="mt-2 text-sm text-tp-muted">Ventas, productos y diferencias de caja en el periodo elegido.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setFrom(event.target.value)} type="date" value={from} />
          <input className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setTo(event.target.value)} type="date" value={to} />
        </div>
      </div>

      {isFetching ? <p className="mb-4 text-sm text-tp-muted">Actualizando reportes...</p> : null}

      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <article className="rounded-md border border-tp-border bg-white p-5">
          <p className="text-sm text-tp-muted">Ventas del periodo</p>
          <p className="mt-2 text-2xl font-semibold">{formatManagerMoney(totalSales)}</p>
        </article>
        <article className="rounded-md border border-tp-border bg-white p-5">
          <p className="text-sm text-tp-muted">Retiros</p>
          <p className="mt-2 text-2xl font-semibold">{formatManagerMoney(totalWithdrawals)}</p>
        </article>
        <article className="rounded-md border border-tp-border bg-white p-5">
          <p className="text-sm text-tp-muted">Diferencias de caja</p>
          <p className="mt-2 text-2xl font-semibold">{formatManagerMoney(totalDifferences)}</p>
        </article>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <article className="rounded-md border border-tp-border bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold">Ventas por dia</h2>
          <Bars items={data.salesByDay} />
        </article>
        <article className="rounded-md border border-tp-border bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold">Ventas por producto</h2>
          <Bars items={data.salesByProduct} />
        </article>
        <article className="rounded-md border border-tp-border bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold">Ventas por sucursal</h2>
          <Bars items={data.salesByBranch} />
        </article>
        <article className="rounded-md border border-tp-border bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold">Caja</h2>
          <div className="mb-5">
            <p className="mb-3 text-xs uppercase text-tp-muted">Retiros por motivo</p>
            <Bars items={data.withdrawalsByReason} />
          </div>
          <p className="mb-3 text-xs uppercase text-tp-muted">Faltantes y sobrantes</p>
          <Bars items={data.cashDifferences} />
        </article>
      </div>
    </section>
  );
}
