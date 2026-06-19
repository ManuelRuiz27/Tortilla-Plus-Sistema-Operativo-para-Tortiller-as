import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownCircle, ArrowUpCircle, LockKeyhole } from "lucide-react";
import { Link } from "react-router-dom";
import {
  cashSessionSummaryRequest,
  closeCashSessionRequest,
  currentCashSessionRequest,
  recordCashIncomeRequest,
  requestCashWithdrawalRequest
} from "../../../api/cash.api";
import { Button } from "../../../shared/components/button";
import { LoadingState } from "../../../shared/components/loading-state";
import { OperationalAlert } from "../../../shared/components/operational-alert";
import { OperationalCard } from "../../../shared/components/operational-card";
import { PermissionButton } from "../../../shared/components/permission-button";
import { StatusBadge } from "../../../shared/components/status-badge";
import { WorkspacePageHeader } from "../../../shared/components/workspace-page-header";
import { useBranchStore } from "../../../shared/stores/branch.store";
import { useCashStore } from "../../../shared/stores/cash.store";
import { labelMovement, labelStatus } from "../../../shared/utils/labels";
import { formatManagerMoney } from "../utils/money";
import { useEffect, useState } from "react";

export function CashPage() {
  const queryClient = useQueryClient();
  const branchId = useBranchStore((state) => state.activeBranchId);
  const setCashSession = useCashStore((state) => state.setCashSession);
  const clearCashSession = useCashStore((state) => state.clearCashSession);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [reasonId, setReasonId] = useState("");
  const [countedCashAmount, setCountedCashAmount] = useState("");
  const [closingComment, setClosingComment] = useState("");
  const sessionQuery = useQuery({
    enabled: Boolean(branchId),
    queryFn: () => currentCashSessionRequest(branchId ?? ""),
    queryKey: ["current-cash-session", branchId]
  });
  const session = sessionQuery.data ?? null;
  const summaryQuery = useQuery({
    enabled: Boolean(session?.id && branchId),
    queryFn: () => cashSessionSummaryRequest(session?.id ?? "", branchId ?? ""),
    queryKey: ["cash-summary", session?.id]
  });
  const incomeMutation = useMutation({
    mutationFn: recordCashIncomeRequest,
    onSuccess: () => {
      setAmount("");
      setDescription("");
      setReasonId("");
      void queryClient.invalidateQueries({ queryKey: ["cash-summary", session?.id] });
    }
  });
  const withdrawalMutation = useMutation({
    mutationFn: requestCashWithdrawalRequest,
    onSuccess: () => {
      setAmount("");
      setDescription("");
      setReasonId("");
      void queryClient.invalidateQueries({ queryKey: ["cash-summary", session?.id] });
      void queryClient.invalidateQueries({ queryKey: ["manager-withdrawals"] });
    }
  });
  const closeMutation = useMutation({
    mutationFn: closeCashSessionRequest,
    onSuccess: () => {
      clearCashSession();
      void queryClient.invalidateQueries({ queryKey: ["current-cash-session", branchId] });
      void queryClient.invalidateQueries({ queryKey: ["cash-summary", session?.id] });
    }
  });

  useEffect(() => {
    if (session) {
      setCashSession({ branchId: session.branchId, id: session.id, status: "open" });
    }
  }, [session, setCashSession]);

  function submitIncome() {
    if (!branchId || !session?.id || !amount.trim()) return;
    incomeMutation.mutate({ branchId, cashSessionId: session.id, amount, reasonId: reasonId || undefined, description: description || undefined });
  }

  function submitWithdrawal() {
    if (!branchId || !session?.id || !amount.trim()) return;
    withdrawalMutation.mutate({ branchId, cashSessionId: session.id, amount, reasonId: reasonId || undefined, description: description || undefined });
  }

  function submitClose() {
    if (!session?.id || !countedCashAmount.trim()) return;
    closeMutation.mutate({ cashSessionId: session.id, countedCashAmount, comment: closingComment || undefined });
  }

  if (sessionQuery.isLoading || summaryQuery.isLoading) {
    return <LoadingState message="Cargando caja..." />;
  }

  if (sessionQuery.isError || summaryQuery.isError) {
    return <p className="rounded-md border border-tp-border bg-white p-5 text-sm text-tp-danger">No se pudo cargar caja.</p>;
  }

  const summary = summaryQuery.data;
  const expected = summary?.expectedCashAmount ?? 0;
  const counted = Number(countedCashAmount || 0);
  const difference = countedCashAmount ? counted - expected : 0;
  const absoluteDifference = Math.abs(difference);
  const closingStep = !countedCashAmount.trim() ? 1 : absoluteDifference > 0 && !closingComment.trim() ? 2 : 3;
  const differenceTone = !countedCashAmount.trim() || absoluteDifference === 0 ? "success" : "warning";
  const isMutating = incomeMutation.isPending || withdrawalMutation.isPending || closeMutation.isPending;

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <WorkspacePageHeader
          className="mb-0"
          description="Revisa efectivo esperado, registra movimientos y cierra caja con diferencia visible antes de confirmar."
          eyebrow="Caja"
          title="Caja actual"
        />
        <Button variant="secondary">
          <Link to="/app/withdrawals">Ver retiros pendientes</Link>
        </Button>
      </div>

      {!session ? (
        <OperationalCard>
          <StatusBadge tone="warning">Sin caja</StatusBadge>
          <p className="mt-3 text-sm text-tp-muted">No hay caja abierta en esta sucursal.</p>
          <Button className="mt-5" variant="secondary">
            <Link to="/app/pos/cash/open">Abrir caja</Link>
          </Button>
        </OperationalCard>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <OperationalCard>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Caja abierta</h2>
                <p className="mt-1 text-sm text-tp-muted">Lista para ventas y movimientos de efectivo.</p>
              </div>
              <StatusBadge tone="success">Caja abierta</StatusBadge>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-4">
              <div><p className="text-xs uppercase text-tp-muted">Inicial</p><p className="mt-1 text-2xl font-semibold">{formatManagerMoney(summary?.openingAmount ?? 0)}</p></div>
              <div><p className="text-xs uppercase text-tp-muted">Ventas efectivo</p><p className="mt-1 text-2xl font-semibold">{formatManagerMoney(summary?.sales.cash ?? 0)}</p></div>
              <div><p className="text-xs uppercase text-tp-muted">Entradas</p><p className="mt-1 text-2xl font-semibold">{formatManagerMoney(summary?.cashInTotal ?? 0)}</p></div>
              <div><p className="text-xs uppercase text-tp-muted">Salidas</p><p className="mt-1 text-2xl font-semibold">{formatManagerMoney(summary?.cashOutTotal ?? 0)}</p></div>
            </div>
            <div className="mt-5 rounded-md bg-tp-soft p-4">
              <p className="text-xs uppercase text-tp-muted">Efectivo esperado</p>
              <p className="mt-1 text-3xl font-semibold">{formatManagerMoney(expected)}</p>
              <p className="mt-2 text-sm text-tp-muted">Tarjeta: {formatManagerMoney(summary?.sales.card ?? 0)} - Transferencia: {formatManagerMoney(summary?.sales.transfer ?? 0)} - Credito: {formatManagerMoney(summary?.sales.credit ?? 0)}</p>
            </div>
          </OperationalCard>

          <OperationalCard>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">Cierre guiado</h2>
                <p className="mt-1 text-sm text-tp-muted">Paso {closingStep} de 3: contado, diferencia y confirmacion.</p>
              </div>
              <StatusBadge tone={differenceTone}>{absoluteDifference === 0 ? "Sin diferencia" : "Con diferencia"}</StatusBadge>
            </div>
            <div className="mb-4 grid grid-cols-3 gap-2 text-xs font-semibold">
              {["Contar", "Revisar", "Cerrar"].map((step, index) => (
                <span className={`rounded-md px-2 py-2 text-center ${closingStep >= index + 1 ? "bg-tp-primary text-white" : "bg-tp-soft text-tp-muted"}`} key={step}>
                  {step}
                </span>
              ))}
            </div>
            <label className="grid gap-1 text-sm font-semibold">
              Efectivo contado
              <input className="h-11 w-full rounded-md border border-tp-border px-3 text-sm font-normal" inputMode="decimal" onChange={(event) => setCountedCashAmount(event.target.value)} placeholder="0.00" value={countedCashAmount} />
            </label>
            <div className="mt-3 rounded-md bg-tp-soft p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-tp-muted">Esperado</span>
                <span className="font-semibold">{formatManagerMoney(expected)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-tp-muted">Contado</span>
                <span className="font-semibold">{formatManagerMoney(counted)}</span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-tp-border pt-3">
                <span className="text-sm text-tp-muted">Diferencia</span>
                <span className={`text-lg font-semibold ${absoluteDifference > 0 ? "text-tp-warning" : "text-tp-success"}`}>{formatManagerMoney(difference)}</span>
              </div>
            </div>
            {absoluteDifference > 0 ? (
              <OperationalAlert className="mt-3" title="Diferencia antes de cerrar" tone="warning">
                Registra un comentario operativo antes de confirmar el cierre.
              </OperationalAlert>
            ) : null}
            <textarea className="mt-3 min-h-20 w-full rounded-md border border-tp-border px-3 py-2 text-sm" onChange={(event) => setClosingComment(event.target.value)} placeholder="Comentario de cierre" value={closingComment} />
            <PermissionButton className="mt-4 w-full" disabled={!countedCashAmount.trim() || isMutating} onClick={submitClose} permission="cash.close" variant="danger">
              <LockKeyhole className="h-4 w-4" aria-hidden="true" />
              Confirmar cierre
            </PermissionButton>
          </OperationalCard>

          <OperationalCard>
            <h2 className="mb-4 text-sm font-semibold">Movimiento manual</h2>
            <div className="grid gap-3 md:grid-cols-[140px_1fr_1fr]">
              <input className="h-11 rounded-md border border-tp-border px-3 text-sm" inputMode="decimal" onChange={(event) => setAmount(event.target.value)} placeholder="Monto" value={amount} />
              <input className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setDescription(event.target.value)} placeholder="Descripcion" value={description} />
            <input className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setReasonId(event.target.value)} placeholder="Motivo opcional" value={reasonId} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <PermissionButton disabled={!amount.trim() || isMutating} onClick={submitIncome} permission="cash.withdraw.request">
                <ArrowDownCircle className="h-4 w-4" aria-hidden="true" />
                Registrar ingreso
              </PermissionButton>
              <PermissionButton disabled={!amount.trim() || isMutating} onClick={submitWithdrawal} permission="cash.withdraw.request" variant="secondary">
                <ArrowUpCircle className="h-4 w-4" aria-hidden="true" />
                Solicitar retiro
              </PermissionButton>
            </div>
          </OperationalCard>

          <OperationalCard>
            <h2 className="mb-4 text-sm font-semibold">Movimientos de esta caja</h2>
            <div className="space-y-3">
              {(summary?.movements ?? []).length === 0 ? (
                <p className="text-sm text-tp-muted">Sin movimientos manuales.</p>
              ) : (
                summary?.movements.map((movement) => (
                  <div className="flex items-center justify-between border-t border-tp-border pt-3 first:border-t-0 first:pt-0" key={movement.id}>
                    <div>
                      <p className="font-semibold">{labelMovement(movement.movementType)}</p>
                      <p className="text-xs text-tp-muted">{movement.description ?? movement.createdAt}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatManagerMoney(movement.amount)}</p>
                      <StatusBadge tone={movement.status === "authorized" || movement.status === "recorded" ? "success" : "warning"}>{labelStatus(movement.status)}</StatusBadge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </OperationalCard>
        </div>
      )}
    </section>
  );
}
