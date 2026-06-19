import { Outlet, useNavigate } from "react-router-dom";
import { OperationalHeader } from "../components/operational-header";
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
      <OperationalHeader
        branchName={branchName}
        cashStatus={cashStatus}
        compact
        contextLabel={`Mostrador - ${user?.fullName ?? "Usuario"}`}
        onLogout={handleLogout}
        showPosShortcut={false}
        showSearch={false}
        user={user}
      />
      <section className="p-4 lg:p-5">
        <Outlet />
      </section>
    </main>
  );
}
