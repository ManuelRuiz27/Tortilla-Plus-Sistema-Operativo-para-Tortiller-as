import { Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../../shared/components/button";
import { StatusBadge } from "../../../shared/components/status-badge";
import { useAuthStore } from "../../../shared/stores/auth.store";
import { useBranchStore } from "../../../shared/stores/branch.store";
import { useCashStore } from "../../../shared/stores/cash.store";
import { getPrimaryDestination } from "../../../shared/utils/role";

export function SelectBranchPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const branches = useBranchStore((state) => state.branches);
  const setActiveBranch = useBranchStore((state) => state.setActiveBranch);
  const clearCashSession = useCashStore((state) => state.clearCashSession);

  function handleSelect(branchId: string) {
    const branch = branches.find((item) => item.branchId === branchId);
    if (!branch || !user) {
      return;
    }

    setActiveBranch(branch);
    clearCashSession();
    navigate(getPrimaryDestination(user), { replace: true });
  }

  return (
    <main className="min-h-screen bg-tp-bg px-6 py-8 text-tp-text">
      <section className="mx-auto max-w-4xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-tp-primary">
          Tortilla Plus
        </p>
        <h1 className="mt-3 text-3xl font-semibold">Selecciona sucursal</h1>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {branches.map((branch) => (
            <article className="rounded-md border border-tp-border bg-white p-5" key={branch.branchId}>
              <div className="flex items-start justify-between gap-4">
                <Building2 className="h-6 w-6 text-tp-secondary" aria-hidden="true" />
                <StatusBadge tone={branch.status === "active" ? "success" : "warning"}>
                  {branch.status === "active" ? "Activa" : "Inactiva"}
                </StatusBadge>
              </div>
              <h2 className="mt-5 text-xl font-semibold">{branch.branchName}</h2>
              <p className="mt-1 text-sm text-tp-muted">Rol operativo: {branch.role}</p>
              <Button
                className="mt-5 w-full"
                disabled={branch.status !== "active"}
                onClick={() => handleSelect(branch.branchId)}
              >
                Entrar
              </Button>
            </article>
          ))}
        </div>
        {branches.length === 0 ? (
          <p className="mt-8 rounded-md border border-tp-border bg-white p-5 text-sm text-tp-muted">
            No tienes sucursales asignadas.
          </p>
        ) : null}
      </section>
    </main>
  );
}
