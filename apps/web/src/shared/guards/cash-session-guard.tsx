import { useQuery } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { currentCashSessionRequest } from "../../api/cash.api";
import { Button } from "../components/button";
import { LoadingState } from "../components/loading-state";
import { useBranchStore } from "../stores/branch.store";
import { useCashStore } from "../stores/cash.store";

type CashSessionGuardProps = {
  children: ReactNode;
};

export function CashSessionGuard({ children }: CashSessionGuardProps) {
  const branchId = useBranchStore((state) => state.activeBranchId);
  const setCashSession = useCashStore((state) => state.setCashSession);
  const { data, isError, isLoading, refetch } = useQuery({
    enabled: Boolean(branchId),
    queryFn: () => currentCashSessionRequest(branchId ?? ""),
    queryKey: ["current-cash-session", branchId]
  });

  useEffect(() => {
    if (!isLoading) {
      setCashSession(data ?? null);
    }
  }, [data, isLoading, setCashSession]);

  if (!branchId) {
    return children;
  }

  if (isLoading) {
    return <LoadingState message="Validando caja..." />;
  }

  if (isError) {
    return (
      <div className="rounded-md border border-tp-border bg-white p-5 text-sm">
        <p className="font-semibold text-tp-danger">No se pudo validar la caja abierta.</p>
        <Button className="mt-4" onClick={() => void refetch()} variant="secondary">
          Reintentar
        </Button>
      </div>
    );
  }

  if (data?.status !== "open") {
    return <Navigate replace to="/app/pos/cash/open" />;
  }

  return children;
}
