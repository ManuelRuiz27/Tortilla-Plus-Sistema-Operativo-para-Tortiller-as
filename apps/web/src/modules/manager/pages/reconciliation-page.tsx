import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, FilePlus2, PlusCircle } from "lucide-react";
import { useMemo, useState } from "react";
import {
  addReconciliationItemRequest,
  createReconciliationBatchRequest,
  reconciliationBatchesRequest,
  reviewReconciliationBatchRequest
} from "../../../api/manager.api";
import { Button } from "../../../shared/components/button";
import { LoadingState } from "../../../shared/components/loading-state";
import { StatusBadge } from "../../../shared/components/status-badge";
import { useBranchStore } from "../../../shared/stores/branch.store";
import { formatManagerMoney } from "../utils/money";
import type { ReconciliationBatch, ReconciliationItem } from "../types/manager.types";

function statusLabel(status: ReconciliationBatch["status"] | ReconciliationItem["status"]) {
  const labels: Record<string, string> = {
    draft: "Borrador",
    matched: "Cuadrado",
    difference: "Diferencia",
    reviewed: "Revisado",
    cancelled: "Cancelado",
    missing_in_provider: "No reportado",
    missing_in_pos: "Fuera de POS",
    amount_mismatch: "Monto distinto"
  };
  return labels[status] ?? status;
}

function statusTone(status: ReconciliationBatch["status"] | ReconciliationItem["status"]) {
  if (status === "matched" || status === "reviewed") return "success" as const;
  if (status === "draft") return "neutral" as const;
  return "warning" as const;
}

export function ReconciliationPage() {
  const queryClient = useQueryClient();
  const branchId = useBranchStore((state) => state.activeBranchId);
  const [providerId, setProviderId] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [salePaymentId, setSalePaymentId] = useState("");
  const [providerReference, setProviderReference] = useState("");
  const [posAmount, setPosAmount] = useState("");
  const [providerAmount, setProviderAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");

  const batchesQuery = useQuery({
    enabled: Boolean(branchId),
    queryFn: () => reconciliationBatchesRequest({ branchId }),
    queryKey: ["reconciliation-batches", branchId]
  });
  const selectedBatch = useMemo(
    () => batchesQuery.data?.find((batch) => batch.id === selectedBatchId) ?? batchesQuery.data?.[0] ?? null,
    [batchesQuery.data, selectedBatchId]
  );

  const createMutation = useMutation({
    mutationFn: createReconciliationBatchRequest,
    onSuccess: (batch) => {
      setProviderId("");
      setSelectedBatchId(batch.id);
      void queryClient.invalidateQueries({ queryKey: ["reconciliation-batches", branchId] });
    }
  });
  const itemMutation = useMutation({
    mutationFn: addReconciliationItemRequest,
    onSuccess: (batch) => {
      setSelectedBatchId(batch.id);
      setSalePaymentId("");
      setProviderReference("");
      setPosAmount("");
      setProviderAmount("");
      setNotes("");
      void queryClient.invalidateQueries({ queryKey: ["reconciliation-batches", branchId] });
    }
  });
  const reviewMutation = useMutation({
    mutationFn: reviewReconciliationBatchRequest,
    onSuccess: (batch) => {
      setSelectedBatchId(batch.id);
      setReviewNotes("");
      void queryClient.invalidateQueries({ queryKey: ["reconciliation-batches", branchId] });
    }
  });

  function createBatch() {
    if (!branchId) return;
    createMutation.mutate({ branchId, providerId: providerId || undefined });
  }

  function addItem() {
    if (!selectedBatch) return;
    itemMutation.mutate({
      batchId: selectedBatch.id,
      salePaymentId: salePaymentId || undefined,
      providerReference: providerReference || undefined,
      posAmount: posAmount || undefined,
      providerAmount: providerAmount || "0.00",
      notes: notes || undefined
    });
  }

  function reviewBatch() {
    if (!selectedBatch) return;
    reviewMutation.mutate({ batchId: selectedBatch.id, notes: reviewNotes || undefined });
  }

  if (batchesQuery.isLoading) return <LoadingState message="Cargando conciliacion..." />;
  if (batchesQuery.isError) return <p className="rounded-md border border-tp-border bg-white p-5 text-sm text-tp-danger">No se pudo cargar conciliacion.</p>;

  const isClosed = selectedBatch?.status === "reviewed" || selectedBatch?.status === "cancelled";
  const isMutating = createMutation.isPending || itemMutation.isPending || reviewMutation.isPending;

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-tp-primary">Conciliacion</p>
          <h1 className="mt-3 text-2xl font-semibold">Pagos contra proveedor</h1>
          <p className="mt-2 text-sm text-tp-muted">Compara pagos POS con cortes de terminal o transferencia.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setProviderId(event.target.value)} placeholder="Proveedor opcional" value={providerId} />
          <Button disabled={!branchId || isMutating} onClick={createBatch}>
            <FilePlus2 className="h-4 w-4" aria-hidden="true" />
            Nuevo corte
          </Button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[320px_1fr]">
        <article className="rounded-md border border-tp-border bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold">Cortes recientes</h2>
          <div className="space-y-3">
            {(batchesQuery.data ?? []).length === 0 ? <p className="text-sm text-tp-muted">Sin cortes de conciliacion.</p> : null}
            {(batchesQuery.data ?? []).map((batch) => (
              <button
                className={`w-full rounded-md border px-3 py-3 text-left text-sm ${selectedBatch?.id === batch.id ? "border-tp-secondary bg-tp-soft" : "border-tp-border bg-white"}`}
                key={batch.id}
                onClick={() => setSelectedBatchId(batch.id)}
                type="button"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{new Date(batch.createdAt).toLocaleString()}</span>
                  <StatusBadge tone={statusTone(batch.status)}>{statusLabel(batch.status)}</StatusBadge>
                </div>
                <p className="mt-2 text-xs text-tp-muted">{batch.branchName}</p>
                <p className="mt-1 text-sm font-semibold">{formatManagerMoney(batch.differenceTotal)}</p>
              </button>
            ))}
          </div>
        </article>

        <div className="space-y-5">
          {selectedBatch ? (
            <>
              <article className="rounded-md border border-tp-border bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">Corte seleccionado</h2>
                    <p className="mt-1 text-sm text-tp-muted">{selectedBatch.id}</p>
                  </div>
                  <StatusBadge tone={statusTone(selectedBatch.status)}>{statusLabel(selectedBatch.status)}</StatusBadge>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  <div><p className="text-xs uppercase text-tp-muted">POS</p><p className="mt-1 text-2xl font-semibold">{formatManagerMoney(selectedBatch.posTotal)}</p></div>
                  <div><p className="text-xs uppercase text-tp-muted">Proveedor</p><p className="mt-1 text-2xl font-semibold">{formatManagerMoney(selectedBatch.providerReportedTotal)}</p></div>
                  <div><p className="text-xs uppercase text-tp-muted">Diferencia</p><p className="mt-1 text-2xl font-semibold">{formatManagerMoney(selectedBatch.differenceTotal)}</p></div>
                </div>
              </article>

              <article className="rounded-md border border-tp-border bg-white p-5">
                <h2 className="mb-4 text-sm font-semibold">Agregar partida</h2>
                <div className="grid gap-3 lg:grid-cols-5">
                  <input className="h-11 rounded-md border border-tp-border px-3 text-sm" disabled={isClosed} onChange={(event) => setSalePaymentId(event.target.value)} placeholder="Pago POS opcional" value={salePaymentId} />
                  <input className="h-11 rounded-md border border-tp-border px-3 text-sm" disabled={isClosed} onChange={(event) => setProviderReference(event.target.value)} placeholder="Referencia proveedor" value={providerReference} />
                  <input className="h-11 rounded-md border border-tp-border px-3 text-sm" disabled={isClosed} inputMode="decimal" onChange={(event) => setPosAmount(event.target.value)} placeholder="Monto POS manual" value={posAmount} />
                  <input className="h-11 rounded-md border border-tp-border px-3 text-sm" disabled={isClosed} inputMode="decimal" onChange={(event) => setProviderAmount(event.target.value)} placeholder="Monto proveedor" value={providerAmount} />
                  <input className="h-11 rounded-md border border-tp-border px-3 text-sm" disabled={isClosed} onChange={(event) => setNotes(event.target.value)} placeholder="Notas" value={notes} />
                </div>
                <Button className="mt-4" disabled={isClosed || isMutating || (!salePaymentId.trim() && !providerReference.trim())} onClick={addItem} variant="secondary">
                  <PlusCircle className="h-4 w-4" aria-hidden="true" />
                  Agregar
                </Button>
              </article>

              <article className="rounded-md border border-tp-border bg-white p-5">
                <h2 className="mb-4 text-sm font-semibold">Partidas</h2>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="border-b border-tp-border text-xs uppercase text-tp-muted">
                      <tr>
                        <th className="py-2 pr-3">Referencia</th>
                        <th className="py-2 pr-3">Pago POS</th>
                        <th className="py-2 pr-3 text-right">POS</th>
                        <th className="py-2 pr-3 text-right">Proveedor</th>
                        <th className="py-2 pr-3">Estado</th>
                        <th className="py-2">Notas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedBatch.items.map((item) => (
                        <tr className="border-b border-tp-border last:border-b-0" key={item.id}>
                          <td className="py-3 pr-3">{item.providerReference ?? "-"}</td>
                          <td className="py-3 pr-3">{item.salePaymentId ?? "-"}</td>
                          <td className="py-3 pr-3 text-right font-semibold">{formatManagerMoney(item.posAmount)}</td>
                          <td className="py-3 pr-3 text-right font-semibold">{formatManagerMoney(item.providerAmount)}</td>
                          <td className="py-3 pr-3"><StatusBadge tone={statusTone(item.status)}>{statusLabel(item.status)}</StatusBadge></td>
                          <td className="py-3">{item.notes ?? "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {selectedBatch.items.length === 0 ? <p className="mt-4 text-sm text-tp-muted">Sin partidas registradas.</p> : null}
              </article>

              <article className="rounded-md border border-tp-border bg-white p-5">
                <h2 className="mb-4 text-sm font-semibold">Revision manual</h2>
                <textarea className="min-h-20 w-full rounded-md border border-tp-border px-3 py-2 text-sm" disabled={isClosed} onChange={(event) => setReviewNotes(event.target.value)} placeholder="Notas de revision" value={reviewNotes} />
                <Button className="mt-4" disabled={isClosed || isMutating} onClick={reviewBatch}>
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  Marcar revisado
                </Button>
              </article>
            </>
          ) : (
            <article className="rounded-md border border-tp-border bg-white p-5 text-sm text-tp-muted">Crea un corte para iniciar conciliacion.</article>
          )}
        </div>
      </div>
    </section>
  );
}
