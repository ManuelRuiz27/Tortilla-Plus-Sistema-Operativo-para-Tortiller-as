import { Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "../modules/auth/pages/login-page";
import { SelectBranchPage } from "../modules/branch/pages/select-branch-page";
import { BillingPage } from "../modules/manager/pages/billing-page";
import { CashPage } from "../modules/manager/pages/cash-page";
import { CustomerDetailPage } from "../modules/manager/pages/customer-detail-page";
import { CustomersPage } from "../modules/manager/pages/customers-page";
import { DashboardPage } from "../modules/manager/pages/dashboard-page";
import { NotFoundPage } from "../modules/manager/pages/not-found-page";
import { InventoryPage } from "../modules/manager/pages/inventory-page";
import { PricesPage } from "../modules/manager/pages/prices-page";
import { ProductionPage } from "../modules/manager/pages/production-page";
import { ProductsPage } from "../modules/manager/pages/products-page";
import { ReconciliationPage } from "../modules/manager/pages/reconciliation-page";
import { ReportsPage } from "../modules/manager/pages/reports-page";
import { RouteDetailPage } from "../modules/manager/pages/route-detail-page";
import { RoutesPage } from "../modules/manager/pages/routes-page";
import { SettingsPage } from "../modules/manager/pages/settings-page";
import { WithdrawalsPage } from "../modules/manager/pages/withdrawals-page";
import { OpenCashPage } from "../modules/pos/pages/open-cash-page";
import { PosRouterPage } from "../modules/pos/pages/pos-router-page";
import { PlatformAuditPage } from "../modules/platform/pages/platform-audit-page";
import { PlatformDashboardPage } from "../modules/platform/pages/platform-dashboard-page";
import { PlatformOrganizationDetailPage } from "../modules/platform/pages/platform-organization-detail-page";
import { PlatformOrganizationsPage } from "../modules/platform/pages/platform-organizations-page";
import { PlatformPaymentsPage } from "../modules/platform/pages/platform-payments-page";
import { PlatformPosDevicesPage } from "../modules/platform/pages/platform-pos-devices-page";
import { PlatformSubscriptionsPage } from "../modules/platform/pages/platform-subscriptions-page";
import { PlatformSupportPage } from "../modules/platform/pages/platform-support-page";
import { PublicAutofacturaPage } from "../modules/public-billing/pages/public-autofactura-page";
import { SalePage } from "../modules/pos/pages/sale-page";
import { AuthGuard } from "../shared/guards/auth-guard";
import { BranchGuard } from "../shared/guards/branch-guard";
import { CashSessionGuard } from "../shared/guards/cash-session-guard";
import { FeatureGuard } from "../shared/guards/feature-guard";
import { PlatformGuard } from "../shared/guards/platform-guard";
import { RoleGuard } from "../shared/guards/role-guard";
import { AuthLayout } from "../shared/layouts/auth-layout";
import { ManagerLayout } from "../shared/layouts/manager-layout";
import { PlatformLayout } from "../shared/layouts/platform-layout";
import { PosLayout } from "../shared/layouts/pos-layout";
import { POS_ALLOWED_ROLES } from "../modules/pos/config/pos.config";
import { SupervisorLayout } from "../shared/layouts/supervisor-layout";
import { SupervisorAuthorizationsPage } from "../modules/supervisor/pages/supervisor-authorizations-page";

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route element={<LoginPage />} path="/login" />
      </Route>
      <Route element={<Navigate replace to="/app/manager/dashboard" />} path="/" />
      <Route element={<PublicAutofacturaPage />} path="/r/:token" />
      <Route
        element={
          <AuthGuard>
            <PlatformGuard>
              <PlatformLayout />
            </PlatformGuard>
          </AuthGuard>
        }
        path="/platform"
      >
        <Route index element={<PlatformDashboardPage />} />
        <Route element={<PlatformOrganizationsPage />} path="organizations" />
        <Route element={<PlatformOrganizationDetailPage />} path="organizations/:organizationId" />
        <Route element={<PlatformSubscriptionsPage />} path="subscriptions" />
        <Route element={<PlatformPosDevicesPage />} path="pos-devices" />
        <Route element={<PlatformPaymentsPage />} path="payments" />
        <Route element={<PlatformAuditPage />} path="audit" />
        <Route element={<PlatformSupportPage />} path="support" />
      </Route>
      <Route
        element={
          <AuthGuard>
            <SelectBranchPage />
          </AuthGuard>
        }
        path="/app/select-branch"
      />
      <Route
        element={
          <AuthGuard>
            <BranchGuard>
              <RoleGuard allowedRoles={POS_ALLOWED_ROLES}>
                <PosLayout />
              </RoleGuard>
            </BranchGuard>
          </AuthGuard>
        }
        path="/app/pos"
      >
        <Route index element={<PosRouterPage />} />
        <Route element={<OpenCashPage />} path="cash/open" />
        <Route
          element={
            <CashSessionGuard>
              <SalePage />
            </CashSessionGuard>
          }
          path="sale"
        />
      </Route>
      <Route
        element={
          <AuthGuard>
            <BranchGuard>
              <RoleGuard allowedRoles={["supervisor"]}>
                <SupervisorLayout />
              </RoleGuard>
            </BranchGuard>
          </AuthGuard>
        }
        path="/app/supervisor"
      >
        <Route index element={<SupervisorAuthorizationsPage />} />
      </Route>
      <Route
        element={
          <AuthGuard>
            <BranchGuard>
              <RoleGuard allowedRoles={["manager", "organization_owner"]}>
                <ManagerLayout />
              </RoleGuard>
            </BranchGuard>
          </AuthGuard>
        }
        path="/app/manager"
      >
        <Route index element={<Navigate replace to="/app/manager/dashboard" />} />
        <Route element={<DashboardPage />} path="dashboard" />
        <Route element={<Navigate replace to="/app/pos/sale" />} path="sales" />
        <Route element={<Navigate replace to="/app/manager/reports" />} path="sales/history" />
        <Route element={<Navigate replace to="/app/manager/reports" />} path="sales/returns" />
        <Route element={<CashPage />} path="cash" />
        <Route element={<Navigate replace to="/app/manager/withdrawals" />} path="cash/withdrawals" />
        <Route element={<Navigate replace to="/app/manager/cash" />} path="cash/closing" />
        <Route element={<WithdrawalsPage />} path="withdrawals" />
        <Route element={<InventoryPage />} path="inventory" />
        <Route element={<ProductsPage />} path="inventory/products" />
        <Route element={<PricesPage />} path="inventory/prices" />
        <Route element={<ProductionPage />} path="inventory/production" />
        <Route element={<InventoryPage />} path="inventory/waste" />
        <Route element={<ProductionPage />} path="production" />
        <Route element={<ProductsPage />} path="products" />
        <Route element={<PricesPage />} path="prices" />
        <Route element={<CustomersPage />} path="customers" />
        <Route element={<Navigate replace to="/app/manager/customers" />} path="customers/balances" />
        <Route element={<CustomerDetailPage />} path="customers/:customerId" />
        <Route
          element={
            <FeatureGuard feature="delivery_routes" label="Rutas de reparto">
              <RoutesPage />
            </FeatureGuard>
          }
          path="routes"
        />
        <Route
          element={
            <FeatureGuard feature="delivery_routes" label="Rutas de reparto">
              <RoutesPage />
            </FeatureGuard>
          }
          path="delivery/routes"
        />
        <Route
          element={
            <FeatureGuard feature="delivery_routes" label="Rutas de reparto">
              <RouteDetailPage />
            </FeatureGuard>
          }
          path="routes/:routeId"
        />
        <Route
          element={
            <FeatureGuard feature="delivery_routes" label="Rutas de reparto">
              <RouteDetailPage />
            </FeatureGuard>
          }
          path="delivery/routes/:routeId"
        />
        <Route element={<Navigate replace to="/app/manager/routes" />} path="delivery/orders" />
        <Route element={<Navigate replace to="/app/manager/routes" />} path="delivery/settlements" />
        <Route
          element={
            <FeatureGuard feature="billing_cfdi" label="Facturación CFDI">
              <BillingPage />
            </FeatureGuard>
          }
          path="billing"
        />
        <Route element={<ReportsPage />} path="reports" />
        <Route
          element={
            <FeatureGuard feature="advanced_reports" label="Conciliacion bancaria">
              <ReconciliationPage />
            </FeatureGuard>
          }
          path="reconciliation"
        />
        <Route element={<SettingsPage />} path="settings" />
      </Route>
      <Route element={<NotFoundPage />} path="*" />
    </Routes>
  );
}

