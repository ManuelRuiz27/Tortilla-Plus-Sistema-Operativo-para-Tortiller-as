import { Activity, Building2, CreditCard, Headphones, LayoutDashboard, LogOut, Monitor, ReceiptText, ScrollText } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Button } from "../components/button";
import { useAuthStore } from "../stores/auth.store";
import { useBranchStore } from "../stores/branch.store";
import { useCashStore } from "../stores/cash.store";
import { cn } from "../utils/cn";

const navItems = [
  { to: "/platform", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/platform/organizations", label: "Organizaciones", icon: Building2 },
  { to: "/platform/subscriptions", label: "Suscripciones", icon: ReceiptText },
  { to: "/platform/pos-devices", label: "POS / Licencias", icon: Monitor },
  { to: "/platform/payments", label: "Pagos SaaS", icon: CreditCard },
  { to: "/platform/audit", label: "Auditoria", icon: ScrollText },
  { to: "/platform/support", label: "Soporte", icon: Headphones }
];

export function PlatformLayout() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const clearBranch = useBranchStore((state) => state.clearActiveBranch);
  const clearCash = useCashStore((state) => state.clearCashSession);

  function handleLogout() {
    clearCash();
    clearBranch();
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <main className="grid min-h-screen bg-tp-bg text-tp-text lg:grid-cols-[248px_1fr]">
      <aside className="border-b border-tp-border bg-white px-3 py-4 lg:border-b-0 lg:border-r">
        <div className="mb-4 px-3 lg:mb-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-tp-primary">Tortilla Plus</p>
          <p className="mt-1 flex items-center gap-2 text-xs text-tp-muted">
            <Activity className="h-3.5 w-3.5" aria-hidden="true" />
            Plataforma SaaS
          </p>
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
          <div>
            <p className="text-sm font-semibold">{user?.fullName ?? "Dueno de Plataforma"}</p>
            <p className="text-xs text-tp-muted">Control global sin contexto de sucursal</p>
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
