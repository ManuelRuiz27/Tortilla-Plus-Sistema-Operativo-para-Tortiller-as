import {
  BarChart3,
  Boxes,
  FileText,
  Factory,
  PackagePlus,
  Route,
  Settings,
  ShoppingCart,
  Users
} from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { BrandMark } from "../components/brand-mark";
import { OperationalHeader } from "../components/operational-header";
import { useAuthStore } from "../stores/auth.store";
import { useBranchStore } from "../stores/branch.store";
import { useCashStore } from "../stores/cash.store";
import { useSubscriptionStore } from "../stores/subscription.store";
import { cn } from "../utils/cn";

type NavItem = {
  feature?: string;
  label: string;
  permission?: string;
  to: string;
};

type WorkspaceNavItem = NavItem & {
  children?: NavItem[];
  icon: typeof BarChart3;
};

const workspaceNavItems: WorkspaceNavItem[] = [
  {
    to: "/app",
    label: "Inicio",
    icon: BarChart3,
    children: [
      { to: "/app", label: "Panel del dia" },
      { to: "/app/alerts", label: "Alertas" }
    ]
  },
  {
    to: "/app/pos/sale",
    label: "Mostrador",
    icon: ShoppingCart,
    permission: "sales.create",
    children: [
      { to: "/app/pos/sale", label: "Nueva venta", permission: "sales.create" },
      { to: "/app/cash", label: "Caja", permission: "cash.movements.view" }
    ]
  },
  {
    to: "/app/production",
    label: "Produccion",
    icon: Factory,
    permission: "production.manage",
    children: [
      { to: "/app/production", label: "Lotes", permission: "production.manage" },
      { to: "/app/production/recipes", label: "Recetas", permission: "recipes.view" },
      { to: "/app/production/inputs", label: "Insumos", permission: "products.view" }
    ]
  },
  {
    to: "/app/inventory",
    label: "Inventario",
    icon: Boxes,
    permission: "inventory.view",
    children: [
      { to: "/app/inventory", label: "Existencias", permission: "inventory.view" },
      { to: "/app/inventory/inputs", label: "Insumos", permission: "products.view" }
    ]
  },
  {
    to: "/app/routes",
    label: "Reparto",
    icon: Route,
    permission: "routes.view",
    feature: "delivery_routes"
  },
  {
    to: "/app/customers",
    label: "Clientes",
    icon: Users,
    permission: "customers.view"
  },
  {
    to: "/app/admin/products",
    label: "Administracion",
    icon: PackagePlus,
    permission: "products.view",
    children: [
      { to: "/app/admin/products", label: "Productos", permission: "products.view" },
      { to: "/app/admin/prices", label: "Precios", permission: "prices.manage" }
    ]
  },
  {
    to: "/app/reports",
    label: "Fiscal / Reportes",
    icon: FileText,
    permission: "reports.basic.view",
    children: [
      { to: "/app/reports", label: "Reportes", permission: "reports.basic.view" },
      { to: "/app/fiscal/invoices", label: "Facturacion", permission: "billing.manage", feature: "billing_cfdi" },
      { to: "/app/reconciliation", label: "Conciliacion", permission: "reports.advanced.view", feature: "advanced_reports" }
    ]
  },
  { to: "/app/settings", label: "Configuracion", icon: Settings, permission: "integrations.view" }
];

export function ManagerLayout() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const branchName = useBranchStore((state) => state.activeBranchName);
  const clearBranch = useBranchStore((state) => state.clearActiveBranch);
  const clearCash = useCashStore((state) => state.clearCashSession);
  const cashStatus = useCashStore((state) => state.status);
  const features = useSubscriptionStore((state) => state.features);
  const isVisible = (item: NavItem) => {
    const hasPermission = !item.permission || user?.permissions.includes(item.permission);
    const hasFeature = !item.feature || features.includes(item.feature);
    return hasPermission && hasFeature;
  };
  const visibleNavItems = workspaceNavItems
    .map((item) => ({
      ...item,
      children: item.children?.filter(isVisible)
    }))
    .filter((item) => isVisible(item) || Boolean(item.children?.length));

  function handleLogout() {
    clearCash();
    clearBranch();
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <main className="grid min-h-screen bg-tp-bg text-tp-text lg:grid-cols-[264px_1fr]">
      <aside className="border-b border-tp-border bg-white px-3 py-4 lg:border-b-0 lg:border-r">
        <div className="mb-4 px-3 lg:mb-6">
          <BrandMark showByline />
        </div>
        <nav className="flex gap-1 overflow-x-auto pb-1 lg:block lg:space-y-2 lg:overflow-visible lg:pb-0">
          {visibleNavItems.map((item) => (
            <div className="shrink-0 lg:shrink" key={item.to}>
              <NavLink
                className={({ isActive }) =>
                  cn(
                    "flex min-h-10 items-center gap-3 rounded-md px-3 text-sm font-semibold text-tp-muted transition hover:bg-tp-soft hover:text-tp-text",
                    isActive && "bg-tp-soft text-tp-text"
                  )
                }
                end={item.to === "/app"}
                to={item.to}
              >
                <item.icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </NavLink>
              {item.children?.length ? (
                <div className="ml-7 mt-1 hidden space-y-1 lg:block">
                  {item.children.map((child) => (
                    <NavLink
                      className={({ isActive }) =>
                        cn(
                          "block rounded-md px-3 py-1.5 text-xs font-medium text-tp-muted transition hover:bg-tp-soft hover:text-tp-text",
                          isActive && "bg-tp-surface text-tp-text"
                        )
                      }
                      end
                      key={child.to}
                      to={child.to}
                    >
                      {child.label}
                    </NavLink>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </nav>
      </aside>
      <section className="min-w-0">
        <OperationalHeader
          branchName={branchName}
          cashStatus={cashStatus}
          contextLabel="Operacion diaria"
          onLogout={handleLogout}
          user={user}
        />
        <div className="p-4 lg:p-6">
          <Outlet />
        </div>
      </section>
    </main>
  );
}
