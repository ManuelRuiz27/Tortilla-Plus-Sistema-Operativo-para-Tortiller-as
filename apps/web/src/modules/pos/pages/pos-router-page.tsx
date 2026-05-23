import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { currentCashSessionRequest } from "../../../api/cash.api";
import { LoadingState } from "../../../shared/components/loading-state";
import { useBranchStore } from "../../../shared/stores/branch.store";
import { useCashStore } from "../../../shared/stores/cash.store";

export function PosRouterPage() {
  const branchId = useBranchStore((state) => state.activeBranchId);
  const setCashSession = useCashStore((state) => state.setCashSession);
  const { data, isError, isLoading } = useQuery({
    enabled: Boolean(branchId),
    queryFn: () => currentCashSessionRequest(branchId ?? ""),
    queryKey: ["current-cash-session", branchId]
  });

  useEffect(() => {
    if (!isLoading) {
      setCashSession(data ?? null);
    }
  }, [data, isLoading, setCashSession]);

  if (isLoading) {
    return <LoadingState message="Validando caja..." />;
  }

  if (isError) {
    return (
      <div className="rounded-md border border-tp-border bg-white p-5 text-sm text-tp-danger">
        No se pudo validar la caja abierta.
      </div>
    );
  }

  if (data?.status === "open") {
    return <Navigate replace to="/app/pos/sale" />;
  }

  return <Navigate replace to="/app/pos/cash/open" />;
}
