import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  authorizeWithdrawalRequest,
  pendingWithdrawalsRequest,
  rejectWithdrawalRequest
} from "../../../api/manager.api";
import { LoadingState } from "../../../shared/components/loading-state";
import { PermissionButton } from "../../../shared/components/permission-button";
import { formatManagerMoney } from "../utils/money";

export function WithdrawalsPage() {
  const queryClient = useQueryClient();
  const [pinById, setPinById] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const { data = [], isError, isLoading } = useQuery({
    queryFn: pendingWithdrawalsRequest,
    queryKey: ["pending-withdrawals"]
  });
  const authorizeMutation = useMutation({
    mutationFn: authorizeWithdrawalRequest,
    onError: () => setError("PIN incorrecto."),
    onSuccess: () => {
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ["pending-withdrawals"] });
    }
  });
  const rejectMutation = useMutation({
    mutationFn: rejectWithdrawalRequest,
    onSuccess: () => {
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ["pending-withdrawals"] });
    }
  });

  if (isLoading) {
    return <LoadingState message="Cargando retiros pendientes..." />;
  }

  if (isError) {
    return <p className="rounded-md border border-tp-border bg-white p-5 text-sm text-tp-danger">No se pudieron cargar los retiros.</p>;
  }

  return (
    <section>
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-tp-primary">Retiros</p>
        <h1 className="mt-3 text-2xl font-semibold">Retiros pendientes</h1>
        <p className="mt-2 text-sm text-tp-muted">Revisa las salidas de efectivo antes de autorizarlas.</p>
      </div>
      {error ? <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-tp-danger">{error}</p> : null}
      <div className="overflow-x-auto rounded-md border border-tp-border bg-white">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-tp-soft text-xs uppercase text-tp-muted">
            <tr>
              <th className="px-4 py-3">Hora</th>
              <th className="px-4 py-3">Cajero</th>
              <th className="px-4 py-3">Motivo</th>
              <th className="px-4 py-3">Monto</th>
              <th className="px-4 py-3">PIN</th>
              <th className="px-4 py-3">Que hacer</th>
            </tr>
          </thead>
          <tbody>
            {data.map((withdrawal) => (
              <tr className="border-t border-tp-border" key={withdrawal.id}>
                <td className="px-4 py-3">{withdrawal.requestedAt}</td>
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
                  <div className="flex flex-wrap gap-2">
                    <PermissionButton
                      disabled={authorizeMutation.isPending}
                      onClick={() => authorizeMutation.mutate({ id: withdrawal.id, pin: pinById[withdrawal.id] ?? "" })}
                      permission="cash.withdraw.authorize"
                    >
                      Autorizar
                    </PermissionButton>
                    <PermissionButton
                      disabled={rejectMutation.isPending}
                      onClick={() => rejectMutation.mutate({ id: withdrawal.id, reason: "Rechazado por gerente" })}
                      permission="cash.withdraw.authorize"
                      variant="danger"
                    >
                      Rechazar
                    </PermissionButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.length === 0 ? (
          <div className="p-6 text-sm text-tp-muted">No hay retiros pendientes.</div>
        ) : null}
      </div>
    </section>
  );
}
