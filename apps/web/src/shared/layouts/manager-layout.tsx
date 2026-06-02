import {
  BarChart3,
  BadgeDollarSign,
  Boxes,
  CreditCard,
  Landmark,
  LogOut,
  PackagePlus,
  Route,
  Settings,
  ShoppingCart,
  Store,
  Users
} from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { BrandMark } from "../components/brand-mark";
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
  { to: "/app/pos/sale", label: "Ventas", icon: ShoppingCart, permission: "sales.create" },
  { to: "/app/manager/customers", label: "Clientes", icon: Users, permission: "customers.view" },
  { to: "/app/manager/routes", label: "Reparto", icon: Route, permission: "routes.view", feature: "delivery_routes" },
  { to: "/app/manager/inventory", label: "Inventario", icon: Boxes, permission: "inventory.view" },
  { to: "/app/manager/products", label: "Productos", icon: PackagePlus, permission: "products.view" },
  { to: "/app/manager/prices", label: "Precios", icon: BadgeDollarSign, permission: "prices.manage" },
  { to: "/app/manager/cash", label: "Caja", icon: CreditCard, permission: "cash.movements.view" },
  { to: "/app/manager/reports", label: "Reportes", icon: BarChart3, permission: "reports.basic.view" },
  { to: "/app/manager/reconciliation", label: "Conciliacion", icon: Landmark, permission: "reports.advanced.view", feature: "advanced_reports" },
  { to: "/app/manager/settings", label: "Configuracion", icon: Settings, permission: "integrations.view" }
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
  const features = useSubscriptionStore((state) => state.features);
  const visibleNavItems = navItems.filter((item) => {
    const hasPermission = !item.permission || user?.permissions.includes(item.permission);
    const hasFeature = !item.feature || features.includes(item.feature);
    return hasPermission && hasFeature;
  });

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
          <BrandMark showByline />
        </div>
        <nav className="flex gap-1 overflow-x-auto pb-1 lg:block lg:space-y-1 lg:overflow-visible lg:pb-0">
          {visibleNavItems.map((item) => (
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
            <Store className="h-5 w-5 text-tp-brand" aria-hidden="true" />
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
