import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileCheck2, FilePlus2, RefreshCw, Stamp } from "lucide-react";
import { useState } from "react";
import { billingSummaryRequest, createGlobalDailyInvoiceRequest, createIndividualInvoiceRequest } from "../../../api/manager.api";
import { Button } from "../../../shared/components/button";
import { LoadingState } from "../../../shared/components/loading-state";
import { PermissionButton } from "../../../shared/components/permission-button";
import { StatusBadge } from "../../../shared/components/status-badge";
import { useBranchStore } from "../../../shared/stores/branch.store";
import { formatManagerMoney } from "../utils/money";

const saleStatusTone = {
  billable: "info",
  invoiced: "success",
  global_candidate: "warning"
} as const;

const invoiceStatusTone = {
  draft: "warning",
  stamped: "success",
  cancelled: "neutral",
  error: "danger"
} as const;

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function BillingPage() {
  const queryClient = useQueryClient();
  const branchId = useBranchStore((state) => state.activeBranchId);
  const [date, setDate] = useState(today());
  const { data, isError, isFetching, isLoading } = useQuery({
    queryFn: () => billingSummaryRequest({ branchId, date }),
    queryKey: ["billing-summary", branchId, date]
  });
  const individualMutation = useMutation({
    mutationFn: createIndividualInvoiceRequest,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["billing-summary", branchId, date] })
  });
  const globalMutation = useMutation({
    mutationFn: createGlobalDailyInvoiceRequest,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["billing-summary", branchId, date] })
  });

  if (isLoading) return <LoadingState message="Cargando facturacion..." />;
  if (isError || !data) return <p className="rounded-md border border-tp-border bg-white p-5 text-sm text-tp-danger">No se pudo cargar facturacion.</p>;

  function createGlobal() {
    if (!branchId || !data) return;
    globalMutation.mutate({ branchId, date });
  }

  const billableTotal = data.billableSales.reduce((sum, sale) => sum + sale.total, 0);

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-tp-primary">Facturacion</p>
          <h1 className="mt-3 text-2xl font-semibold">CFDI individual y global diaria</h1>
          <p className="mt-2 text-sm text-tp-muted">Ventas completadas, folios emitidos y estado de timbrado.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setDate(event.target.value)} type="date" value={date} />
          <Button onClick={() => void queryClient.invalidateQueries({ queryKey: ["billing-summary", branchId, date] })} variant="secondary">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Actualizar
          </Button>
          <PermissionButton disabled={!branchId || data.globalDaily.status !== "not_created" || globalMutation.isPending} onClick={createGlobal} permission="billing.manage">
            <FilePlus2 className="h-4 w-4" aria-hidden="true" />
            Global diaria
          </PermissionButton>
        </div>
      </div>

      {isFetching ? <p className="mb-4 text-sm text-tp-muted">Actualizando datos...</p> : null}

      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <article className="rounded-md border border-tp-border bg-white p-5">
          <p className="text-sm text-tp-muted">Facturable</p>
          <p className="mt-2 text-2xl font-semibold">{formatManagerMoney(billableTotal)}</p>
        </article>
        <article className="rounded-md border border-tp-border bg-white p-5">
          <p className="text-sm text-tp-muted">Global del dia</p>
          <p className="mt-2 text-2xl font-semibold">{formatManagerMoney(data.globalDaily.total)}</p>
        </article>
        <article className="rounded-md border border-tp-border bg-white p-5">
          <p className="text-sm text-tp-muted">Errores de timbrado</p>
          <p className="mt-2 text-2xl font-semibold">{data.stampErrors}</p>
        </article>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
        <div className="overflow-x-auto rounded-md border border-tp-border bg-white">
          <div className="flex items-center gap-2 border-b border-tp-border px-4 py-3">
            <FileCheck2 className="h-4 w-4 text-tp-secondary" aria-hidden="true" />
            <h2 className="text-sm font-semibold">Ventas facturables</h2>
          </div>
          {data.billableSales.length === 0 ? (
            <p className="p-5 text-sm text-tp-muted">Sin ventas facturables para la fecha seleccionada.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-tp-soft text-xs uppercase text-tp-muted">
                <tr>
                  <th className="px-4 py-3">Folio</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {data.billableSales.map((sale) => (
                  <tr className="border-t border-tp-border" key={sale.id}>
                    <td className="px-4 py-3 font-semibold">{sale.folio}</td>
                    <td className="px-4 py-3">{sale.customerName}</td>
                    <td className="px-4 py-3">{formatManagerMoney(sale.total)}</td>
                    <td className="px-4 py-3"><StatusBadge tone={saleStatusTone[sale.status]}>{sale.status}</StatusBadge></td>
                    <td className="px-4 py-3 text-right">
                      <PermissionButton disabled={sale.status !== "billable" || individualMutation.isPending} onClick={() => individualMutation.mutate({ saleId: sale.id })} permission="billing.manage" variant="secondary">
                        <Stamp className="h-4 w-4" aria-hidden="true" />
                        Timbrar
                      </PermissionButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="overflow-x-auto rounded-md border border-tp-border bg-white">
          <div className="border-b border-tp-border px-4 py-3">
            <h2 className="text-sm font-semibold">Facturas emitidas</h2>
          </div>
          {data.invoices.length === 0 ? (
            <p className="p-5 text-sm text-tp-muted">Sin facturas emitidas para la fecha seleccionada.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-tp-soft text-xs uppercase text-tp-muted">
                <tr>
                  <th className="px-4 py-3">Folio</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {data.invoices.map((invoice) => (
                  <tr className="border-t border-tp-border" key={invoice.id}>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{invoice.folio}</p>
                      <p className="text-xs text-tp-muted">{invoice.issuedAt}</p>
                    </td>
                    <td className="px-4 py-3">{invoice.customerName}</td>
                    <td className="px-4 py-3"><StatusBadge tone={invoiceStatusTone[invoice.status]}>{invoice.status}</StatusBadge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
}
