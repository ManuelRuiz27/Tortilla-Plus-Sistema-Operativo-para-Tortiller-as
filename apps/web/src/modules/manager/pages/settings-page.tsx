import { useMutation, useQuery } from "@tanstack/react-query";
import { MonitorSmartphone, PackageCheck, RefreshCw, ShieldCheck, UserRoundCog } from "lucide-react";
import { settingsSummaryRequest } from "../../../api/manager.api";
import { subscriptionFeaturesRequest } from "../../../api/subscriptions.api";
import { Button } from "../../../shared/components/button";
import { LoadingState } from "../../../shared/components/loading-state";
import { StatusBadge } from "../../../shared/components/status-badge";
import { useAuthStore } from "../../../shared/stores/auth.store";
import { useBranchStore } from "../../../shared/stores/branch.store";
import { useSubscriptionStore } from "../../../shared/stores/subscription.store";
import { labelFeature, labelPermission, labelRole, labelStatus } from "../../../shared/utils/labels";

export function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const branchName = useBranchStore((state) => state.activeBranchName);
  const branches = useBranchStore((state) => state.branches);
  const planCode = useSubscriptionStore((state) => state.planCode);
  const subscriptionStatus = useSubscriptionStore((state) => state.status);
  const features = useSubscriptionStore((state) => state.features);
  const setSubscription = useSubscriptionStore((state) => state.setSubscription);
  const { data, isError, isLoading } = useQuery({
    queryFn: settingsSummaryRequest,
    queryKey: ["settings-summary"]
  });
  const subscriptionMutation = useMutation({
    mutationFn: subscriptionFeaturesRequest,
    onSuccess: setSubscription
  });

  if (isLoading) return <LoadingState message="Cargando ajustes..." />;
  if (isError || !data) return <p className="rounded-md border border-tp-border bg-white p-5 text-sm text-tp-danger">No se pudieron cargar los ajustes.</p>;

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-tp-primary">Ajustes</p>
          <h1 className="mt-3 text-2xl font-semibold">Sucursal, cajas y plan</h1>
          <p className="mt-2 text-sm text-tp-muted">Revisa tu cuenta, sucursales y funciones disponibles.</p>
        </div>
        <Button disabled={subscriptionMutation.isPending} onClick={() => subscriptionMutation.mutate()} variant="secondary">
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Actualizar plan
        </Button>
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-3">
        <article className="rounded-md border border-tp-border bg-white p-5">
          <p className="text-sm text-tp-muted">Sucursal activa</p>
          <p className="mt-2 text-xl font-semibold">{branchName ?? "Sin sucursal"}</p>
          <p className="mt-1 text-xs text-tp-muted">{branches.length} sucursales asignadas</p>
        </article>
        <article className="rounded-md border border-tp-border bg-white p-5">
          <p className="text-sm text-tp-muted">Usuario</p>
          <p className="mt-2 text-xl font-semibold">{user?.fullName ?? "Usuario"}</p>
          <p className="mt-1 text-xs text-tp-muted">{user?.email ?? "-"}</p>
        </article>
        <article className="rounded-md border border-tp-border bg-white p-5">
          <p className="text-sm text-tp-muted">Plan</p>
          <div className="mt-2 flex items-center gap-2">
            <p className="text-xl font-semibold">{labelStatus(planCode)}</p>
            <StatusBadge tone={subscriptionStatus === "active" ? "success" : "warning"}>{labelStatus(subscriptionStatus)}</StatusBadge>
          </div>
        </article>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <article className="rounded-md border border-tp-border bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <MonitorSmartphone className="h-4 w-4 text-tp-secondary" aria-hidden="true" />
            <h2 className="text-sm font-semibold">Cajas conectadas</h2>
          </div>
          <div className="space-y-3">
            {data.posDevices.map((device) => (
              <div className="flex items-center justify-between border-t border-tp-border pt-3 first:border-t-0 first:pt-0" key={device.id}>
                <div>
                  <p className="font-semibold">{device.name}</p>
                  <p className="text-xs text-tp-muted">{device.lastSeen}</p>
                </div>
                <StatusBadge tone={device.status === "active" ? "success" : "warning"}>{labelStatus(device.status)}</StatusBadge>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-md border border-tp-border bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-tp-secondary" aria-hidden="true" />
            <h2 className="text-sm font-semibold">Motivos de caja</h2>
          </div>
          <div className="space-y-3">
            {data.withdrawalReasons.map((reason) => (
              <div className="flex items-center justify-between border-t border-tp-border pt-3 first:border-t-0 first:pt-0" key={reason.id}>
                <div>
                  <p className="font-semibold">{reason.name}</p>
                  <p className="text-xs text-tp-muted">{reason.direction === "out" ? "Salida" : "Entrada"}</p>
                </div>
                <StatusBadge tone={reason.requiresAuthorization ? "warning" : "success"}>{reason.requiresAuthorization ? "Autoriza" : "Directo"}</StatusBadge>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-md border border-tp-border bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <PackageCheck className="h-4 w-4 text-tp-secondary" aria-hidden="true" />
            <h2 className="text-sm font-semibold">Paquetes</h2>
          </div>
          <div className="space-y-3">
            {data.packageConfig.map((config) => (
              <div className="flex items-center justify-between border-t border-tp-border pt-3 first:border-t-0 first:pt-0" key={config.productName}>
                <div>
                  <p className="font-semibold">{config.productName}</p>
                  <p className="text-xs text-tp-muted">Base: {config.baseProductName}</p>
                </div>
                <p className="text-sm font-semibold">{config.packageWeightGrams} g</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-md border border-tp-border bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold">Funciones incluidas</h2>
          <div className="flex flex-wrap gap-2">
            {features.length === 0 ? <p className="text-sm text-tp-muted">No hay funciones cargadas.</p> : null}
            {features.map((feature) => (
              <StatusBadge key={feature} tone="info">{labelFeature(feature)}</StatusBadge>
            ))}
          </div>
        </article>

        <article className="rounded-md border border-tp-border bg-white p-5 xl:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <UserRoundCog className="h-4 w-4 text-tp-secondary" aria-hidden="true" />
            <h2 className="text-sm font-semibold">Accesos del usuario</h2>
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            {user?.roles.map((role) => <StatusBadge key={role} tone="neutral">{labelRole(role)}</StatusBadge>)}
          </div>
          <div className="flex flex-wrap gap-2">
            {user?.permissions.length === 0 ? <p className="text-sm text-tp-muted">No hay accesos cargados.</p> : null}
            {user?.permissions.map((permission) => <StatusBadge key={permission} tone="info">{labelPermission(permission)}</StatusBadge>)}
          </div>
        </article>
      </div>
    </section>
  );
}
