import { useMutation, useQuery } from "@tanstack/react-query";
import { ClipboardList, MonitorSmartphone, PackageCheck, RefreshCw, ShieldCheck, UserRoundCog } from "lucide-react";
import { useState } from "react";
import {
  mercadoPagoBindTerminalRequest,
  mercadoPagoConnectionRequest,
  mercadoPagoHealthCheckRequest,
  mercadoPagoOAuthStartRequest,
  mercadoPagoSyncTerminalsRequest,
  mercadoPagoTerminalsRequest,
  settingsSummaryRequest
} from "../../../api/manager.api";
import { subscriptionFeaturesRequest } from "../../../api/subscriptions.api";
import { Button } from "../../../shared/components/button";
import { LoadingState } from "../../../shared/components/loading-state";
import { StatusBadge } from "../../../shared/components/status-badge";
import { useAuthStore } from "../../../shared/stores/auth.store";
import { useBranchStore } from "../../../shared/stores/branch.store";
import { useSubscriptionStore } from "../../../shared/stores/subscription.store";
import { labelFeature, labelPermission, labelRole, labelStatus } from "../../../shared/utils/labels";

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"general" | "pos" | "terminales" | "integraciones">("general");
  const [selectedPosDeviceId, setSelectedPosDeviceId] = useState("");
  const user = useAuthStore((state) => state.user);
  const branchName = useBranchStore((state) => state.activeBranchName);
  const branchId = useBranchStore((state) => state.activeBranchId);
  const branches = useBranchStore((state) => state.branches);
  const planCode = useSubscriptionStore((state) => state.planCode);
  const subscriptionStatus = useSubscriptionStore((state) => state.status);
  const features = useSubscriptionStore((state) => state.features);
  const setSubscription = useSubscriptionStore((state) => state.setSubscription);
  const { data, isError, isLoading } = useQuery({
    queryFn: settingsSummaryRequest,
    queryKey: ["settings-summary"]
  });
  const connectionQuery = useQuery({
    enabled: activeTab === "terminales" || activeTab === "integraciones",
    queryFn: mercadoPagoConnectionRequest,
    queryKey: ["mercadopago-connection"]
  });
  const terminalsQuery = useQuery({
    enabled: activeTab === "terminales",
    queryFn: () => mercadoPagoTerminalsRequest(branchId),
    queryKey: ["mercadopago-terminals", branchId]
  });
  const subscriptionMutation = useMutation({
    mutationFn: subscriptionFeaturesRequest,
    onSuccess: setSubscription
  });
  const connectMutation = useMutation({
    mutationFn: mercadoPagoOAuthStartRequest,
    onSuccess: (connection) => {
      void connectionQuery.refetch();
      if (connection.authUrl) {
        window.location.href = connection.authUrl;
      }
    }
  });
  const healthMutation = useMutation({
    mutationFn: mercadoPagoHealthCheckRequest,
    onSuccess: () => void connectionQuery.refetch()
  });
  const syncTerminalsMutation = useMutation({
    mutationFn: () => mercadoPagoSyncTerminalsRequest(branchId),
    onSuccess: () => void terminalsQuery.refetch()
  });
  const bindTerminalMutation = useMutation({
    mutationFn: (paymentTerminalId: string) => mercadoPagoBindTerminalRequest({ posDeviceId: selectedPosDeviceId, paymentTerminalId }),
    onSuccess: () => void terminalsQuery.refetch()
  });

  if (isLoading) return <LoadingState message="Cargando ajustes..." />;
  if (isError || !data) return <p className="rounded-md border border-tp-border bg-white p-5 text-sm text-tp-danger">No se pudieron cargar los ajustes.</p>;

  const branchPosDevices = data.posDevices.filter((device) => !branchId || device.branchId === branchId);
  const mpConnection = connectionQuery.data;
  const terminals = terminalsQuery.data ?? [];
  const connectionIsActive = mpConnection?.status === "active";
  const wizardSteps = [
    { label: "Conectar cuenta", done: connectionIsActive },
    { label: "Sincronizar terminales", done: terminals.length > 0 },
    { label: "Seleccionar sucursal", done: Boolean(branchId) },
    { label: "Asignar terminal a POS", done: terminals.some((terminal) => terminal.binding) },
    { label: "Probar conexion", done: Boolean(mpConnection?.lastHealthCheckAt) },
    { label: "Cobrar desde POS", done: terminals.some((terminal) => terminal.binding?.status === "active") }
  ];

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

      <div className="mb-5 flex flex-wrap gap-2">
        {[
          ["general", "General"],
          ["pos", "POS"],
          ["terminales", "Terminales"],
          ["integraciones", "Integraciones"]
        ].map(([value, label]) => (
          <Button key={value} onClick={() => setActiveTab(value as typeof activeTab)} variant={activeTab === value ? "primary" : "secondary"}>
            {label}
          </Button>
        ))}
      </div>

      {activeTab === "terminales" ? (
        <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
          <article className="rounded-md border border-tp-border bg-white p-5">
            <h2 className="text-sm font-semibold">Wizard de terminal</h2>
            <div className="mt-4 space-y-3">
              {wizardSteps.map((step, index) => (
                <div className="flex items-center justify-between border-t border-tp-border pt-3 first:border-t-0 first:pt-0" key={step.label}>
                  <span className="text-sm">{index + 1}. {step.label}</span>
                  <StatusBadge tone={step.done ? "success" : "warning"}>{step.done ? "Listo" : "Pendiente"}</StatusBadge>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-md border border-tp-border bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">Mercado Pago Point</h2>
                <p className="mt-1 text-sm text-tp-muted">
                  Estado: {mpConnection ? labelStatus(mpConnection.status) : "No conectado"}
                </p>
                {mpConnection?.lastErrorMessage ? <p className="mt-1 text-sm text-tp-danger">{mpConnection.lastErrorMessage}</p> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button disabled={connectMutation.isPending} onClick={() => connectMutation.mutate()}>
                  Conectar Mercado Pago
                </Button>
                <Button disabled={!connectionIsActive || healthMutation.isPending} onClick={() => healthMutation.mutate()} variant="secondary">
                  Probar conexion
                </Button>
                <Button disabled={!connectionIsActive || syncTerminalsMutation.isPending} onClick={() => syncTerminalsMutation.mutate()} variant="secondary">
                  Sincronizar terminales
                </Button>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-[240px_1fr]">
              <label className="text-sm font-semibold">
                POS
                <select className="mt-2 h-11 w-full rounded-md border border-tp-border px-3" onChange={(event) => setSelectedPosDeviceId(event.target.value)} value={selectedPosDeviceId}>
                  <option value="">Selecciona caja</option>
                  {branchPosDevices.map((device) => (
                    <option key={device.id} value={device.id}>{device.name}</option>
                  ))}
                </select>
              </label>
              <div className="space-y-3">
                {terminals.length === 0 ? <p className="rounded-md bg-tp-soft p-3 text-sm text-tp-muted">Sin terminales sincronizadas.</p> : null}
                {terminals.map((terminal) => (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-tp-border p-3" key={terminal.id}>
                    <div>
                      <p className="font-semibold">{terminal.terminalName ?? terminal.terminalId}</p>
                      <p className="text-xs text-tp-muted">{terminal.terminalId}</p>
                      <p className="text-xs text-tp-muted">{terminal.binding ? `Asignada a ${terminal.binding.posDeviceName}` : "Sin asignar"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge tone={terminal.status === "active" ? "success" : terminal.status === "error" ? "danger" : "warning"}>{labelStatus(terminal.status)}</StatusBadge>
                      <Button disabled={!selectedPosDeviceId || bindTerminalMutation.isPending} onClick={() => bindTerminalMutation.mutate(terminal.id)} variant="secondary">
                        Asignar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </article>
        </div>
      ) : null}

      {activeTab === "general" ? <div className="mb-5 grid gap-4 lg:grid-cols-3">
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
      </div> : null}

      {activeTab === "general" ? <div className="grid gap-5 xl:grid-cols-2">
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

        <article className="rounded-md border border-tp-border bg-white p-5 xl:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-tp-secondary" aria-hidden="true" />
            <h2 className="text-sm font-semibold">Auditoria critica reciente</h2>
          </div>
          <div className="space-y-3">
            {data.auditLogs.length === 0 ? <p className="text-sm text-tp-muted">Sin eventos criticos recientes.</p> : null}
            {data.auditLogs.map((log) => (
              <div className="grid gap-2 border-t border-tp-border pt-3 text-sm first:border-t-0 first:pt-0 md:grid-cols-[1fr_150px_180px]" key={log.id}>
                <div>
                  <p className="font-semibold">{log.action}</p>
                  <p className="text-xs text-tp-muted">{log.entityType} · {log.entityId}</p>
                </div>
                <p className="text-tp-muted">{log.branchName ?? "Sin sucursal"}</p>
                <p className="text-right text-tp-muted">{new Date(log.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </article>
      </div> : null}

      {activeTab === "pos" ? (
        <article className="rounded-md border border-tp-border bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold">Cajas POS</h2>
          <div className="space-y-3">
            {branchPosDevices.map((device) => (
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
      ) : null}

      {activeTab === "integraciones" ? (
        <article className="rounded-md border border-tp-border bg-white p-5">
          <h2 className="text-sm font-semibold">Integraciones</h2>
          <div className="mt-4 flex items-center justify-between rounded-md border border-tp-border p-4">
            <div>
              <p className="font-semibold">Mercado Pago</p>
              <p className="text-sm text-tp-muted">{mpConnection ? labelStatus(mpConnection.status) : "No conectado"}</p>
            </div>
            <Button disabled={connectMutation.isPending} onClick={() => connectMutation.mutate()}>
              Conectar
            </Button>
          </div>
        </article>
      ) : null}
    </section>
  );
}
