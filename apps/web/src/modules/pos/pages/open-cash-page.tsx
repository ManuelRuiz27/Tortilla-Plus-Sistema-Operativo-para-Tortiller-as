import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { currentCashSessionRequest, openCashSessionRequest } from "../../../api/cash.api";
import { Button } from "../../../shared/components/button";
import { useBranchStore } from "../../../shared/stores/branch.store";
import { useCashStore } from "../../../shared/stores/cash.store";
import { parseMoneyInput } from "../../../shared/utils/decimal-input";
import { POS_OPERATION_LIMITS } from "../config/pos.config";

export function OpenCashPage() {
  const navigate = useNavigate();
  const branchId = useBranchStore((state) => state.activeBranchId);
  const branchName = useBranchStore((state) => state.activeBranchName);
  const setCashSession = useCashStore((state) => state.setCashSession);
  const [openingAmountCounted, setOpeningAmountCounted] = useState("");
  const [openingNote, setOpeningNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const currentCashQuery = useQuery({
    enabled: Boolean(branchId),
    queryFn: () => currentCashSessionRequest(branchId ?? ""),
    queryKey: ["current-cash-session", branchId]
  });
  const openCashMutation = useMutation({
    mutationFn: openCashSessionRequest,
    onSuccess: (session) => {
      setCashSession(session);
      navigate("/app/pos/sale", { replace: true });
    }
  });

  useEffect(() => {
    if (currentCashQuery.data?.status === "open") {
      setCashSession(currentCashQuery.data);
      navigate("/app/pos/sale", { replace: true });
    }
  }, [currentCashQuery.data, navigate, setCashSession]);

  function openCash() {
    if (!branchId) {
      return;
    }

    const parsed = parseMoneyInput(openingAmountCounted, {
      ...POS_OPERATION_LIMITS.openingCash,
      allowZero: true,
      fieldLabel: "El efectivo contado"
    });
    if (!parsed.ok) {
      setError(parsed.reason);
      return;
    }

    setError(null);
    openCashMutation.mutate({
      branchId,
      openingAmountCounted: parsed.normalized,
      openingNote: openingNote.trim() || undefined
    });
  }

  return (
    <section className="max-w-xl rounded-md border border-tp-border bg-white p-6">
      <p className="text-sm font-semibold uppercase tracking-wide text-tp-primary">Abrir caja</p>
      <h1 className="mt-3 text-2xl font-semibold">{branchName}</h1>
      <p className="mt-2 text-sm text-tp-muted">Confirma con cuanto efectivo empieza el turno.</p>
      <div className="mt-6 grid gap-4">
        <div>
          <label className="text-sm font-semibold" htmlFor="openingAmount">
            Efectivo contado
          </label>
          <input
            className="mt-2 h-12 w-full rounded-md border border-tp-border px-3 outline-none focus:border-tp-primary"
            disabled={openCashMutation.isPending || currentCashQuery.isLoading}
            id="openingAmount"
            inputMode="decimal"
            onChange={(event) => setOpeningAmountCounted(event.target.value)}
            placeholder="0.00"
            value={openingAmountCounted}
          />
        </div>
        <div>
          <label className="text-sm font-semibold" htmlFor="openingNote">
            Nota opcional
          </label>
          <textarea
            className="mt-2 min-h-24 w-full rounded-md border border-tp-border px-3 py-2 outline-none focus:border-tp-primary"
            disabled={openCashMutation.isPending}
            id="openingNote"
            maxLength={250}
            onChange={(event) => setOpeningNote(event.target.value)}
            placeholder="Fondo inicial confirmado"
            value={openingNote}
          />
        </div>
        {error ? <p className="rounded-md bg-red-50 p-3 text-sm text-tp-danger">{error}</p> : null}
        {openCashMutation.isError ? (
          <p className="rounded-md bg-red-50 p-3 text-sm text-tp-danger">
            No se pudo abrir la caja.
          </p>
        ) : null}
        <Button disabled={openCashMutation.isPending} onClick={openCash}>
          {openCashMutation.isPending ? "Abriendo caja..." : "Abrir caja"}
        </Button>
      </div>
    </section>
  );
}
