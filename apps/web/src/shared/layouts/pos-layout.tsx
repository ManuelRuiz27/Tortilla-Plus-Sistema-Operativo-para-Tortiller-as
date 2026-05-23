import { LogOut, Store } from "lucide-react";
import { Outlet, useNavigate } from "react-router-dom";
import { Button } from "../components/button";
import { StatusBadge } from "../components/status-badge";
import { useAuthStore } from "../stores/auth.store";
import { useBranchStore } from "../stores/branch.store";
import { useCashStore } from "../stores/cash.store";

export function PosLayout() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const branchName = useBranchStore((state) => state.activeBranchName);
  const clearBranch = useBranchStore((state) => state.clearActiveBranch);
  const cashStatus = useCashStore((state) => state.status);
  const clearCash = useCashStore((state) => state.clearCashSession);

  function handleLogout() {
    clearCash();
    clearBranch();
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <main className="min-h-screen bg-tp-bg text-tp-text">
      <header className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-tp-border bg-white px-4 py-3 lg:px-5">
        <div className="flex min-w-0 items-center gap-4">
          <Store className="h-5 w-5 text-tp-primary" aria-hidden="true" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{branchName ?? "Sucursal sin seleccionar"}</p>
            <p className="text-xs text-tp-muted">Cajero: {user?.fullName ?? "Usuario"}</p>
          </div>
          <StatusBadge tone={cashStatus === "open" ? "success" : "warning"}>
            {cashStatus === "open" ? "Caja abierta" : "Caja no abierta"}
          </StatusBadge>
        </div>
        <Button variant="ghost" onClick={handleLogout}>
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Salir
        </Button>
      </header>
      <section className="p-4 lg:p-5">
        <Outlet />
      </section>
    </main>
  );
}
