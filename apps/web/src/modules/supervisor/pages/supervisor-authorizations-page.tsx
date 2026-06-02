import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";
import {
  authorizeWithdrawalRequest,
  pendingWithdrawalsRequest,
  rejectWithdrawalRequest,
  withdrawalsRequest
} from "../../../api/manager.api";
import { Button } from "../../../shared/components/button";
import { LoadingState } from "../../../shared/components/loading-state";
import { StatusBadge } from "../../../shared/components/status-badge";
import { formatManagerMoney } from "../../manager/utils/money";

export function SupervisorAuthorizationsPage() {
  const queryClient = useQueryClient();
  const [pinById, setPinById] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const { data = [], isError, isLoading } = useQuery({
    queryFn: pendingWithdrawalsRequest,
    queryKey: ["pending-withdrawals"]
  });
  const historyQuery = useQuery({
    queryFn: () => withdrawalsRequest(),
    queryKey: ["withdrawals-history"]
  });
  const authorizeMutation = useMutation({
    mutationFn: authorizeWithdrawalRequest,
    onError: () => setError("No se pudo autorizar. Revisa el PIN."),
    onSuccess: () => {
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ["pending-withdrawals"] });
      void queryClient.invalidateQueries({ queryKey: ["withdrawals-history"] });
    }
  });
  const rejectMutation = useMutation({
    mutationFn: rejectWithdrawalRequest,
    onError: () => setError("No se pudo rechazar el retiro."),
    onSuccess: () => {
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ["pending-withdrawals"] });
      void queryClient.invalidateQueries({ queryKey: ["withdrawals-history"] });
    }
  });

  if (isLoading) return <LoadingState message="Cargando autorizaciones..." />;
  if (isError) return <p className="rounded-md border border-tp-border bg-white p-5 text-sm text-tp-danger">No se pudieron cargar las autorizaciones.</p>;

  return (
    <section>
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-tp-primary">Autorizaciones</p>
        <h1 className="mt-3 text-2xl font-semibold">Retiros pendientes</h1>
        <p className="mt-2 text-sm text-tp-muted">Autoriza o rechaza retiros solicitados en caja.</p>
      </div>
      {error ? <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-tp-danger">{error}</p> : null}
      <div className="overflow-x-auto rounded-md border border-tp-border bg-white">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-tp-soft text-xs uppercase text-tp-muted">
            <tr>
              <th className="px-4 py-3">Hora</th>
              <th className="px-4 py-3">Sucursal</th>
              <th className="px-4 py-3">Solicita</th>
              <th className="px-4 py-3">Motivo</th>
              <th className="px-4 py-3">Monto</th>
              <th className="px-4 py-3">PIN</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {data.map((withdrawal) => (
              <tr className="border-t border-tp-border" key={withdrawal.id}>
                <td className="px-4 py-3">{withdrawal.requestedAt}</td>
                <td className="px-4 py-3">{withdrawal.branchName}</td>
                <td className="px-4 py-3">{withdrawal.cashierName}</td>
                <td className="px-4 py-3">
                  <p className="font-semibold">{withdrawal.reason}</p>
                  <p className="text-xs text-tp-muted">{withdrawal.description}</p>
                </td>
                <td className="px-4 py-3 font-semibold">{formatManagerMoney(withdrawal.amount)}</td>
                <td className="px-4 py-3">
                  <input
                    className="h-10 w-24 rounded-md border border-tp-border px-3 outline-none focus:border-tp-primary"
                    inputMode="numeric"
                    onChange={(event) => setPinById((state) => ({ ...state, [withdrawal.id]: event.target.value }))}
                    placeholder="1234"
                    value={pinById[withdrawal.id] ?? ""}
                  />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge tone="warning">Pendiente</StatusBadge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={authorizeMutation.isPending}
                      onClick={() => authorizeMutation.mutate({ id: withdrawal.id, pin: pinById[withdrawal.id] ?? "" })}
                    >
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                      Autorizar
                    </Button>
                    <Button
                      disabled={rejectMutation.isPending}
                      onClick={() => rejectMutation.mutate({ id: withdrawal.id, reason: "Rechazado por supervisor" })}
                      variant="danger"
                    >
                      <XCircle className="h-4 w-4" aria-hidden="true" />
                      Rechazar
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.length === 0 ? <div className="p-6 text-sm text-tp-muted">No hay retiros pendientes.</div> : null}
      </div>
      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold">Historial reciente</h2>
        <div className="overflow-x-auto rounded-md border border-tp-border bg-white">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-tp-soft text-xs uppercase text-tp-muted">
              <tr>
                <th className="px-4 py-3">Hora</th>
                <th className="px-4 py-3">Sucursal</th>
                <th className="px-4 py-3">Solicita</th>
                <th className="px-4 py-3">Monto</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Resuelve</th>
              </tr>
            </thead>
            <tbody>
              {(historyQuery.data ?? []).filter((withdrawal) => withdrawal.status !== "pending_authorization").map((withdrawal) => (
                <tr className="border-t border-tp-border" key={withdrawal.id}>
                  <td className="px-4 py-3">{withdrawal.requestedAt}</td>
                  <td className="px-4 py-3">{withdrawal.branchName}</td>
                  <td className="px-4 py-3">{withdrawal.cashierName}</td>
                  <td className="px-4 py-3 font-semibold">{formatManagerMoney(withdrawal.amount)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={withdrawal.status === "authorized" ? "success" : "danger"}>
                      {withdrawal.status === "authorized" ? "Autorizado" : "Rechazado"}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3">{withdrawal.resolvedByName ?? "-"}{withdrawal.resolvedAt ? ` | ${withdrawal.resolvedAt}` : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {historyQuery.isLoading ? <div className="p-6 text-sm text-tp-muted">Cargando historial...</div> : null}
          {!historyQuery.isLoading && !(historyQuery.data ?? []).some((withdrawal) => withdrawal.status !== "pending_authorization") ? (
            <div className="p-6 text-sm text-tp-muted">Sin historial reciente.</div>
          ) : null}
        </div>
      </section>
    </section>
  );
}
