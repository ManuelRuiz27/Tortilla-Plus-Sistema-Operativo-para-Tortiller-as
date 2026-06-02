import { ClipboardCheck, LogOut, ShoppingCart, Store } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Button } from "../components/button";
import { useAuthStore } from "../stores/auth.store";
import { useBranchStore } from "../stores/branch.store";
import { useCashStore } from "../stores/cash.store";
import { cn } from "../utils/cn";

const navItems = [
  { to: "/app/supervisor", label: "Autorizaciones", icon: ClipboardCheck, end: true },
  { to: "/app/pos/sale", label: "POS", icon: ShoppingCart }
];

export function SupervisorLayout() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const branchName = useBranchStore((state) => state.activeBranchName);
  const clearBranch = useBranchStore((state) => state.clearActiveBranch);
  const clearCash = useCashStore((state) => state.clearCashSession);

  function handleLogout() {
    clearCash();
    clearBranch();
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <main className="grid min-h-screen bg-tp-bg text-tp-text lg:grid-cols-[240px_1fr]">
      <aside className="border-b border-tp-border bg-white px-3 py-4 lg:border-b-0 lg:border-r">
        <div className="mb-4 px-3 lg:mb-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-tp-primary">Tortilla Plus</p>
          <p className="mt-1 text-xs text-tp-muted">Supervisor</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto pb-1 lg:block lg:space-y-1 lg:overflow-visible lg:pb-0">
          {navItems.map((item) => (
            <NavLink
              className={({ isActive }) =>
                cn(
                  "flex min-h-10 shrink-0 items-center gap-3 rounded-md px-3 text-sm font-medium text-tp-muted transition hover:bg-tp-soft hover:text-tp-text",
                  isActive && "bg-tp-soft text-tp-text"
                )
              }
              end={item.end}
              key={item.to}
              to={item.to}
            >
              <item.icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <section className="min-w-0">
        <header className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-tp-border bg-white px-4 py-3 lg:px-6">
          <div className="flex min-w-0 items-center gap-4">
            <Store className="h-5 w-5 text-tp-secondary" aria-hidden="true" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{branchName ?? "Sucursal sin seleccionar"}</p>
              <p className="text-xs text-tp-muted">{user?.fullName ?? "Supervisor"}</p>
            </div>
          </div>
          <Button variant="ghost" onClick={handleLogout}>
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Salir
          </Button>
        </header>
        <div className="p-4 lg:p-6">
          <Outlet />
        </div>
      </section>
    </main>
  );
}
