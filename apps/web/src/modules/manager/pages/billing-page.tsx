import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileCheck2, FilePlus2, FileText, Printer, QrCode, RefreshCw, Stamp, XCircle } from "lucide-react";
import { useState } from "react";
import {
  billingReceiptsRequest,
  billingSummaryRequest,
  cancelInvoiceRequest,
  createGlobalDailyInvoiceRequest,
  createIndividualInvoiceRequest,
  invoiceDocumentsRequest,
  reprintBillingReceiptRequest,
  stampInvoiceRequest
} from "../../../api/manager.api";
import { Button } from "../../../shared/components/button";
import { LoadingState } from "../../../shared/components/loading-state";
import { PermissionButton } from "../../../shared/components/permission-button";
import { StatusBadge } from "../../../shared/components/status-badge";
import { useBranchStore } from "../../../shared/stores/branch.store";
import { labelStatus } from "../../../shared/utils/labels";
import type { BillingDocuments, BillingReceipt } from "../types/manager.types";
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

const receiptStatusTone = {
  active: "info",
  used: "success",
  expired: "warning",
  cancelled: "neutral"
} as const;

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function BillingPage() {
  const queryClient = useQueryClient();
  const branchId = useBranchStore((state) => state.activeBranchId);
  const [date, setDate] = useState(today());
  const [documents, setDocuments] = useState<BillingDocuments | null>(null);
  const [reprintReceipt, setReprintReceipt] = useState<BillingReceipt | null>(null);
  const { data, isError, isFetching, isLoading } = useQuery({
    queryFn: () => billingSummaryRequest({ branchId, date }),
    queryKey: ["billing-summary", branchId, date]
  });
  const receiptsQuery = useQuery({
    queryFn: () => billingReceiptsRequest({ branchId, date }),
    queryKey: ["billing-receipts", branchId, date]
  });
  const individualMutation = useMutation({
    mutationFn: createIndividualInvoiceRequest,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["billing-summary", branchId, date] })
  });
  const globalMutation = useMutation({
    mutationFn: createGlobalDailyInvoiceRequest,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["billing-summary", branchId, date] })
  });
  const stampMutation = useMutation({
    mutationFn: stampInvoiceRequest,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["billing-summary", branchId, date] })
  });
  const cancelMutation = useMutation({
    mutationFn: cancelInvoiceRequest,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["billing-summary", branchId, date] })
  });
  const documentsMutation = useMutation({
    mutationFn: invoiceDocumentsRequest,
    onSuccess: setDocuments
  });
  const reprintMutation = useMutation({
    mutationFn: reprintBillingReceiptRequest,
    onSuccess: setReprintReceipt
  });

  if (isLoading) return <LoadingState message="Cargando facturas..." />;
  if (isError || !data) return <p className="rounded-md border border-tp-border bg-white p-5 text-sm text-tp-danger">No se pudieron cargar las facturas.</p>;

  function createGlobal() {
    if (!branchId || !data) return;
    globalMutation.mutate({ branchId, date });
  }

  const billableTotal = data.billableSales.reduce((sum, sale) => sum + sale.total, 0);

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-tp-primary">Facturas</p>
          <h1 className="mt-3 text-2xl font-semibold">Facturas del dia</h1>
          <p className="mt-2 text-sm text-tp-muted">Revisa ventas pendientes de facturar y facturas emitidas.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setDate(event.target.value)} type="date" value={date} />
          <Button onClick={() => void queryClient.invalidateQueries({ queryKey: ["billing-summary", branchId, date] })} variant="secondary">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Actualizar
          </Button>
          <PermissionButton disabled={!branchId || data.globalDaily.status !== "not_created" || globalMutation.isPending} onClick={createGlobal} permission="billing.manage">
            <FilePlus2 className="h-4 w-4" aria-hidden="true" />
            Crear factura global
          </PermissionButton>
        </div>
      </div>

      {isFetching ? <p className="mb-4 text-sm text-tp-muted">Actualizando datos...</p> : null}

      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <article className="rounded-md border border-tp-border bg-white p-5">
          <p className="text-sm text-tp-muted">Pendiente de facturar</p>
          <p className="mt-2 text-2xl font-semibold">{formatManagerMoney(billableTotal)}</p>
        </article>
        <article className="rounded-md border border-tp-border bg-white p-5">
          <p className="text-sm text-tp-muted">Factura global</p>
          <p className="mt-2 text-2xl font-semibold">{formatManagerMoney(data.globalDaily.total)}</p>
        </article>
        <article className="rounded-md border border-tp-border bg-white p-5">
          <p className="text-sm text-tp-muted">Facturas con error</p>
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
                    <td className="px-4 py-3"><StatusBadge tone={saleStatusTone[sale.status]}>{labelStatus(sale.status)}</StatusBadge></td>
                    <td className="px-4 py-3 text-right">
                      <PermissionButton disabled={sale.status !== "billable" || individualMutation.isPending} onClick={() => individualMutation.mutate({ saleId: sale.id })} permission="billing.manage" variant="secondary">
                        <Stamp className="h-4 w-4" aria-hidden="true" />
                        Emitir
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
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3"></th>
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
                    <td className="px-4 py-3">{formatManagerMoney(invoice.total)}</td>
                    <td className="px-4 py-3"><StatusBadge tone={invoiceStatusTone[invoice.status]}>{labelStatus(invoice.status)}</StatusBadge></td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        {invoice.status === "draft" ? (
                          <PermissionButton disabled={stampMutation.isPending} onClick={() => stampMutation.mutate(invoice.id)} permission="billing.manage" variant="secondary">
                            <Stamp className="h-4 w-4" aria-hidden="true" />
                            Timbrar
                          </PermissionButton>
                        ) : null}
                        {invoice.status === "stamped" || invoice.status === "cancelled" ? (
                          <PermissionButton disabled={documentsMutation.isPending} onClick={() => documentsMutation.mutate(invoice.id)} permission="billing.manage" variant="secondary">
                            <FileText className="h-4 w-4" aria-hidden="true" />
                            Docs
                          </PermissionButton>
                        ) : null}
                        {invoice.status === "stamped" ? (
                          <PermissionButton
                            disabled={cancelMutation.isPending}
                            onClick={() => cancelMutation.mutate({ invoiceId: invoice.id, reason: "Cancelacion fiscal desde gerente" })}
                            permission="billing.manage"
                            variant="secondary"
                          >
                            <XCircle className="h-4 w-4" aria-hidden="true" />
                            Cancelar
                          </PermissionButton>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {documents ? (
        <div className="mt-5 rounded-md border border-tp-border bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-tp-secondary" aria-hidden="true" />
            <h2 className="text-sm font-semibold">Documentos CFDI</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {documents.documents.map((document) => (
              <a className="rounded-md border border-tp-border px-3 py-2 text-sm font-semibold text-tp-primary" href={document.url} key={document.id}>
                {document.type.toUpperCase()}
              </a>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-5 overflow-x-auto rounded-md border border-tp-border bg-white">
        <div className="flex items-center gap-2 border-b border-tp-border px-4 py-3">
          <QrCode className="h-4 w-4 text-tp-secondary" aria-hidden="true" />
          <h2 className="text-sm font-semibold">Tickets QR</h2>
        </div>
        {receiptsQuery.isLoading ? (
          <p className="p-5 text-sm text-tp-muted">Cargando tickets QR...</p>
        ) : receiptsQuery.data?.length ? (
          <table className="w-full text-left text-sm">
            <thead className="bg-tp-soft text-xs uppercase text-tp-muted">
              <tr>
                <th className="px-4 py-3">Ticket</th>
                <th className="px-4 py-3">Sucursal</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Vence</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {receiptsQuery.data.map((receipt) => (
                <tr className="border-t border-tp-border" key={receipt.id}>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{receipt.saleFolio}</p>
                    <p className="text-xs text-tp-muted">{receipt.receiptUrl}</p>
                  </td>
                  <td className="px-4 py-3">{receipt.branchName}</td>
                  <td className="px-4 py-3">{formatManagerMoney(receipt.total)}</td>
                  <td className="px-4 py-3"><StatusBadge tone={receiptStatusTone[receipt.status]}>{labelStatus(receipt.status)}</StatusBadge></td>
                  <td className="px-4 py-3">{new Date(receipt.expiresAt).toLocaleDateString("es-MX")}</td>
                  <td className="px-4 py-3 text-right">
                    <PermissionButton disabled={reprintMutation.isPending} onClick={() => reprintMutation.mutate(receipt.id)} permission="billing.manage" variant="secondary">
                      <Printer className="h-4 w-4" aria-hidden="true" />
                      Reimprimir
                    </PermissionButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="p-5 text-sm text-tp-muted">Sin tickets QR para la fecha seleccionada.</p>
        )}
      </div>

      {reprintReceipt ? (
        <div className="mt-5 rounded-md border border-tp-border bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <Printer className="h-4 w-4 text-tp-secondary" aria-hidden="true" />
            <h2 className="text-sm font-semibold">Reimpresion QR</h2>
          </div>
          <div className="grid gap-2 text-sm md:grid-cols-[1fr_2fr]">
            <span className="text-tp-muted">Ticket</span>
            <strong>{reprintReceipt.saleFolio}</strong>
            <span className="text-tp-muted">URL</span>
            <a className="font-semibold text-tp-primary" href={reprintReceipt.receiptUrl}>{reprintReceipt.receiptUrl}</a>
            <span className="text-tp-muted">QR</span>
            <code className="rounded-md bg-tp-soft px-2 py-1 text-xs">{reprintReceipt.qrContent ?? reprintReceipt.receiptUrl}</code>
          </div>
        </div>
      ) : null}
    </section>
  );
}
