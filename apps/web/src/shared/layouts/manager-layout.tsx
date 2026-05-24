import {
  BarChart3,
  Boxes,
  CreditCard,
  LogOut,
  Route,
  Settings,
  ShoppingCart,
  Store,
  Users
} from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Button } from "../components/button";
import { StatusBadge } from "../components/status-badge";
import { useAuthStore } from "../stores/auth.store";
import { useBranchStore } from "../stores/branch.store";
import { useCashStore } from "../stores/cash.store";
import { useSubscriptionStore } from "../stores/subscription.store";
import { cn } from "../utils/cn";
import { labelStatus } from "../utils/labels";

const navItems = [
  { to: "/app/manager/dashboard", label: "Inicio", icon: BarChart3 },
  { to: "/app/pos/sale", label: "Ventas", icon: ShoppingCart },
  { to: "/app/manager/customers", label: "Clientes", icon: Users },
  { to: "/app/manager/routes", label: "Reparto", icon: Route },
  { to: "/app/manager/inventory", label: "Inventario", icon: Boxes },
  { to: "/app/manager/cash", label: "Caja", icon: CreditCard },
  { to: "/app/manager/reports", label: "Reportes", icon: BarChart3 },
  { to: "/app/manager/settings", label: "Configuracion", icon: Settings }
];

export function ManagerLayout() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const branchName = useBranchStore((state) => state.activeBranchName);
  const clearBranch = useBranchStore((state) => state.clearActiveBranch);
  const clearCash = useCashStore((state) => state.clearCashSession);
  const planCode = useSubscriptionStore((state) => state.planCode);
  const subscriptionStatus = useSubscriptionStore((state) => state.status);

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
          <p className="mt-1 text-xs text-tp-muted">Vista del negocio</p>
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
              <p className="text-xs text-tp-muted">{user?.fullName ?? "Usuario"}</p>
            </div>
            <StatusBadge tone={subscriptionStatus === "active" ? "success" : "warning"}>
              Plan {labelStatus(planCode)} - {labelStatus(subscriptionStatus)}
            </StatusBadge>
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
