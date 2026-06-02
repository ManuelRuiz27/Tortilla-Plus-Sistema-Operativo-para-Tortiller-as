import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ApiErrorException } from "../../../api/api-error";
import {
  createPlatformOneTimeChargeRequest,
  createPlatformOrganizationOwnerRequest,
  generatePlatformBillingCycleRequest,
  platformCommercialPlansRequest,
  markPlatformBillingCyclePaidRequest,
  platformBillingSummaryRequest,
  platformOrganizationRequest,
  recalculatePlatformBillingCycleRequest,
  updatePlatformOrganizationRequest,
  updatePlatformOrganizationStatusRequest,
  updatePlatformSubscriptionRequest
} from "../../../api/platform.api";
import type { PlatformPlanCode } from "../../../api/platform.api";
import { queryClient } from "../../../app/query-client";
import { Button } from "../../../shared/components/button";
import { LoadingState } from "../../../shared/components/loading-state";
import { StatusBadge } from "../../../shared/components/status-badge";
import { labelRole, labelStatus } from "../../../shared/utils/labels";

export function PlatformOrganizationDetailPage() {
  const { organizationId = "" } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["platform-organization", organizationId],
    queryFn: () => platformOrganizationRequest(organizationId),
    enabled: Boolean(organizationId)
  });
  const billingQuery = useQuery({
    queryKey: ["platform-billing-summary", organizationId],
    queryFn: () => platformBillingSummaryRequest(organizationId),
    enabled: Boolean(organizationId)
  });
  const commercialPlansQuery = useQuery({ queryKey: ["platform-commercial-plans"], queryFn: platformCommercialPlansRequest });
  const [status, setStatus] = useState("active");
  const [planCode, setPlanCode] = useState<PlatformPlanCode>("free");
  const [subscriptionStatus, setSubscriptionStatus] = useState("trial");
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");
  const [name, setName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [ownerForm, setOwnerForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    pin: ""
  });
  const [oneTimeCharge, setOneTimeCharge] = useState({
    chargeType: "setup",
    description: "Setup inicial Tortilla Plus",
    amount: "1000.00"
  });
  const [error, setError] = useState<string | null>(null);

  const detailsMutation = useMutation({
    mutationFn: () => updatePlatformOrganizationRequest(organizationId, { name, legalName, taxId, contactEmail, contactPhone }),
    onSuccess: () => {
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ["platform-organization", organizationId] });
      void queryClient.invalidateQueries({ queryKey: ["platform-organizations"] });
    },
    onError: (mutationError) => setError(mutationError instanceof ApiErrorException ? mutationError.apiError.message : "No se pudo actualizar la organizacion.")
  });
  const statusMutation = useMutation({
    mutationFn: (nextStatus: string) => updatePlatformOrganizationStatusRequest(organizationId, nextStatus),
    onSuccess: () => {
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ["platform-organization", organizationId] });
      void queryClient.invalidateQueries({ queryKey: ["platform-organizations"] });
      void queryClient.invalidateQueries({ queryKey: ["platform-dashboard"] });
    },
    onError: (mutationError) => setError(mutationError instanceof ApiErrorException ? mutationError.apiError.message : "No se pudo actualizar el estado.")
  });
  const subscriptionMutation = useMutation({
    mutationFn: () => updatePlatformSubscriptionRequest(organizationId, { planCode, status: subscriptionStatus, billingPeriod }),
    onSuccess: () => {
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ["platform-organization", organizationId] });
      void queryClient.invalidateQueries({ queryKey: ["platform-organizations"] });
      void queryClient.invalidateQueries({ queryKey: ["platform-dashboard"] });
    },
    onError: (mutationError) => setError(mutationError instanceof ApiErrorException ? mutationError.apiError.message : "No se pudo actualizar la suscripcion.")
  });
  const ownerMutation = useMutation({
    mutationFn: () => createPlatformOrganizationOwnerRequest(organizationId, ownerForm),
    onSuccess: () => {
      setOwnerForm({ name: "", email: "", password: "", phone: "", pin: "" });
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ["platform-organization", organizationId] });
    },
    onError: (mutationError) => setError(mutationError instanceof ApiErrorException ? mutationError.apiError.message : "No se pudo crear el dueno inicial.")
  });
  const generateCycleMutation = useMutation({
    mutationFn: () => generatePlatformBillingCycleRequest(organizationId),
    onSuccess: () => {
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ["platform-billing-summary", organizationId] });
      void queryClient.invalidateQueries({ queryKey: ["platform-dashboard"] });
    },
    onError: (mutationError) => setError(mutationError instanceof ApiErrorException ? mutationError.apiError.message : "No se pudo generar el corte.")
  });
  const recalculateCycleMutation = useMutation({
    mutationFn: (billingCycleId: string) => recalculatePlatformBillingCycleRequest(billingCycleId),
    onSuccess: () => {
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ["platform-billing-summary", organizationId] });
    },
    onError: (mutationError) => setError(mutationError instanceof ApiErrorException ? mutationError.apiError.message : "No se pudo recalcular el corte.")
  });
  const markPaidMutation = useMutation({
    mutationFn: (billingCycleId: string) => markPlatformBillingCyclePaidRequest(billingCycleId),
    onSuccess: () => {
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ["platform-billing-summary", organizationId] });
      void queryClient.invalidateQueries({ queryKey: ["platform-organization", organizationId] });
      void queryClient.invalidateQueries({ queryKey: ["platform-dashboard"] });
    },
    onError: (mutationError) => setError(mutationError instanceof ApiErrorException ? mutationError.apiError.message : "No se pudo marcar como pagado.")
  });
  const oneTimeChargeMutation = useMutation({
    mutationFn: () => createPlatformOneTimeChargeRequest(organizationId, { ...oneTimeCharge, currency: "MXN" }),
    onSuccess: () => {
      setError(null);
      setOneTimeCharge({ chargeType: "setup", description: "Setup inicial Tortilla Plus", amount: "1000.00" });
      void queryClient.invalidateQueries({ queryKey: ["platform-billing-summary", organizationId] });
    },
    onError: (mutationError) => setError(mutationError instanceof ApiErrorException ? mutationError.apiError.message : "No se pudo crear el cargo unico.")
  });

  useEffect(() => {
    if (!data) return;
    setStatus(data.status);
    setPlanCode((data.subscription?.planCode ?? "free") as PlatformPlanCode);
    setSubscriptionStatus(data.subscription?.status ?? "trial");
    setBillingPeriod((data.subscription?.billingPeriod ?? "monthly") as "monthly" | "annual");
    setName(data.name);
    setLegalName(data.legalName ?? "");
    setTaxId(data.taxId ?? "");
    setContactEmail(data.contactEmail);
    setContactPhone(data.contactPhone ?? "");
  }, [data]);

  if (isLoading) return <LoadingState message="Cargando organizacion..." />;
  if (!data) return null;
  const hasOrganizationOwner = data.users.some((user) => user.roles.includes("organization_owner"));
  const billing = billingQuery.data;

  function applyStatus() {
    if (status === "suspended_limited" || status === "cancelled") {
      const confirmed = window.confirm("La organizacion no podra operar ventas reales mientras este suspendida o cancelada. ¿Aplicar este estado?");
      if (!confirmed) return;
    }
    statusMutation.mutate(status);
  }

  function applySubscription() {
    if (subscriptionStatus === "suspended_limited" || subscriptionStatus === "cancelled" || subscriptionStatus === "expired") {
      const confirmed = window.confirm("Este cambio puede afectar cobranza y continuidad operativa de la organizacion. Guardar suscripcion?");
      if (!confirmed) return;
    }
    subscriptionMutation.mutate();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{data.name}</h1>
          <p className="mt-1 text-sm text-tp-muted">{data.contactEmail}</p>
        </div>
        <StatusBadge tone={data.status === "active" ? "success" : "warning"}>{labelStatus(data.status)}</StatusBadge>
      </div>
      <section className="grid gap-4 lg:grid-cols-3">
        <Panel title="Datos generales">
          <div className="grid gap-2">
            <input className="h-10 rounded-md border border-tp-border px-3 text-sm text-tp-text" onChange={(event) => setName(event.target.value)} placeholder="Nombre" value={name} />
            <input className="h-10 rounded-md border border-tp-border px-3 text-sm text-tp-text" onChange={(event) => setLegalName(event.target.value)} placeholder="Razon social" value={legalName} />
            <input className="h-10 rounded-md border border-tp-border px-3 text-sm text-tp-text" onChange={(event) => setTaxId(event.target.value)} placeholder="RFC" value={taxId} />
            <input className="h-10 rounded-md border border-tp-border px-3 text-sm text-tp-text" onChange={(event) => setContactEmail(event.target.value)} placeholder="Correo" value={contactEmail} />
            <input className="h-10 rounded-md border border-tp-border px-3 text-sm text-tp-text" onChange={(event) => setContactPhone(event.target.value)} placeholder="Telefono" value={contactPhone} />
            <Button disabled={detailsMutation.isPending} onClick={() => detailsMutation.mutate()} variant="secondary">
              Guardar datos
            </Button>
          </div>
          <div className="mt-3 flex items-end gap-2">
            <select className="h-10 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setStatus(event.target.value)} value={status}>
              <option value="active">Activo</option>
              <option value="past_due">Past due</option>
              <option value="grace_period">Grace period</option>
              <option value="suspended_limited">Suspendido</option>
              <option value="cancelled">Cancelado</option>
            </select>
            <Button disabled={statusMutation.isPending || status === data.status} onClick={applyStatus} variant="secondary">
              Aplicar estado
            </Button>
          </div>
        </Panel>
        <Panel title="Suscripcion">
          <p>Plan: {labelStatus(data.subscription?.planCode ?? "free")}</p>
          <p>Estado: {labelStatus(data.subscription?.status ?? "sin_estado")}</p>
          <p>Periodo: {data.subscription?.billingPeriod ?? "monthly"}</p>
          <div className="mt-3 grid gap-2">
            <select className="h-10 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setPlanCode(event.target.value as PlatformPlanCode)} value={planCode}>
              <option value="free">Plan free</option>
              <option value="paid">Plan paid</option>
              {(commercialPlansQuery.data ?? []).map((plan) => (
                <option key={plan.code} value={plan.code}>{plan.name} - {formatMoney(plan.monthlyPrice)}</option>
              ))}
            </select>
            <select className="h-10 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setSubscriptionStatus(event.target.value)} value={subscriptionStatus}>
              <option value="trial">Trial</option>
              <option value="active">Active</option>
              <option value="past_due">Past due</option>
              <option value="grace_period">Grace period</option>
              <option value="suspended_limited">Suspended limited</option>
              <option value="cancelled">Cancelled</option>
              <option value="expired">Expired</option>
            </select>
            <select className="h-10 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setBillingPeriod(event.target.value as "monthly" | "annual")} value={billingPeriod}>
              <option value="monthly">Mensual</option>
              <option value="annual">Anual</option>
            </select>
            <Button disabled={subscriptionMutation.isPending} onClick={applySubscription} variant="secondary">
              Guardar suscripcion
            </Button>
          </div>
        </Panel>
        <Panel title="POS">
          <p>Activos: {data.posDevices.filter((device) => device.status === "active").length}</p>
          <p>Licenciados: {data.posDevices.filter((device) => device.licensed).length}</p>
        </Panel>
        {!hasOrganizationOwner ? (
          <Panel title="Dueno inicial">
            <div className="grid gap-2">
              <input className="h-10 rounded-md border border-tp-border px-3 text-sm text-tp-text" onChange={(event) => setOwnerForm((current) => ({ ...current, name: event.target.value }))} placeholder="Nombre" value={ownerForm.name} />
              <input className="h-10 rounded-md border border-tp-border px-3 text-sm text-tp-text" onChange={(event) => setOwnerForm((current) => ({ ...current, email: event.target.value }))} placeholder="Correo" type="email" value={ownerForm.email} />
              <input className="h-10 rounded-md border border-tp-border px-3 text-sm text-tp-text" onChange={(event) => setOwnerForm((current) => ({ ...current, password: event.target.value }))} placeholder="Contrasena temporal" type="password" value={ownerForm.password} />
              <input className="h-10 rounded-md border border-tp-border px-3 text-sm text-tp-text" onChange={(event) => setOwnerForm((current) => ({ ...current, phone: event.target.value }))} placeholder="Telefono" value={ownerForm.phone} />
              <input className="h-10 rounded-md border border-tp-border px-3 text-sm text-tp-text" onChange={(event) => setOwnerForm((current) => ({ ...current, pin: event.target.value }))} placeholder="PIN" value={ownerForm.pin} />
              <Button disabled={ownerMutation.isPending} onClick={() => ownerMutation.mutate()} variant="secondary">
                Crear dueno
              </Button>
            </div>
          </Panel>
        ) : null}
      </section>
      <section className="rounded-md border border-tp-border bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Facturacion SaaS</h2>
            <p className="mt-1 text-sm text-tp-muted">Deuda pendiente: {formatMoney(billing?.pendingBalance ?? "0.00")}</p>
          </div>
          <Button disabled={generateCycleMutation.isPending || !data.subscription} onClick={() => generateCycleMutation.mutate()} variant="secondary">
            Generar corte mensual
          </Button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <Metric label="Subtotal" value={formatMoney(billing?.currentCycle?.subtotal ?? "0.00")} />
          <Metric label="IVA" value={formatMoney(billing?.currentCycle?.taxTotal ?? "0.00")} />
          <Metric label="Total" value={formatMoney(billing?.currentCycle?.total ?? "0.00")} />
          <Metric label="Pendiente" value={formatMoney(billing?.currentCycle?.balanceDue ?? billing?.pendingBalance ?? "0.00")} />
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <Metric label="CFDI incluidos" value={String(billing?.cfdiUsage.includedLimit ?? 0)} />
          <Metric label="CFDI usados" value={String(billing?.cfdiUsage.usedCount ?? 0)} />
          <Metric label="CFDI excedentes" value={String(billing?.cfdiUsage.overageCount ?? 0)} />
          <Metric label="Cargo excedente" value={formatMoney(billing?.cfdiUsage.overageTotal ?? "0.00")} />
        </div>
        <div className="mt-4 grid gap-3 rounded-md border border-tp-border p-3 md:grid-cols-[160px_1fr_160px_auto]">
          <select className="h-10 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setOneTimeCharge((current) => ({ ...current, chargeType: event.target.value }))} value={oneTimeCharge.chargeType}>
            <option value="setup">Setup</option>
            <option value="training_extra">Capacitacion</option>
            <option value="support_extra">Soporte extra</option>
            <option value="manual_adjustment">Ajuste manual</option>
          </select>
          <input className="h-10 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setOneTimeCharge((current) => ({ ...current, description: event.target.value }))} placeholder="Descripcion" value={oneTimeCharge.description} />
          <input className="h-10 rounded-md border border-tp-border px-3 text-sm" min="0.01" onChange={(event) => setOneTimeCharge((current) => ({ ...current, amount: event.target.value }))} step="0.01" type="number" value={oneTimeCharge.amount} />
          <Button disabled={oneTimeChargeMutation.isPending || Number(oneTimeCharge.amount) <= 0} onClick={() => oneTimeChargeMutation.mutate()} variant="secondary">
            Agregar cargo
          </Button>
        </div>
        {billing?.pendingOneTimeCharges.length ? (
          <div className="mt-4 rounded-md border border-tp-border">
            {billing.pendingOneTimeCharges.map((charge) => (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-tp-border px-3 py-2 text-sm first:border-t-0" key={charge.id}>
                <span>{charge.description}</span>
                <span className="text-tp-muted">Subtotal {formatMoney(charge.amount)} | IVA {formatMoney(charge.taxAmount)} | Total {formatMoney(charge.total)}</span>
              </div>
            ))}
          </div>
        ) : null}
        <div className="mt-4 divide-y divide-tp-border rounded-md border border-tp-border">
          {(billing?.cycles ?? []).length === 0 ? <p className="p-4 text-sm text-tp-muted">Sin cortes mensuales.</p> : null}
          {(billing?.cycles ?? []).map((cycle) => (
            <div className="p-4" key={cycle.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">
                    {new Date(cycle.periodStart).toLocaleDateString()} - {new Date(cycle.periodEnd).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-tp-muted">
                    Subtotal {formatMoney(cycle.subtotal)} | IVA {formatMoney(cycle.taxTotal)} | Total {formatMoney(cycle.total)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone={cycle.status === "paid" ? "success" : "warning"}>{labelStatus(cycle.status)}</StatusBadge>
                  <Button disabled={cycle.status === "paid" || recalculateCycleMutation.isPending} onClick={() => recalculateCycleMutation.mutate(cycle.id)} variant="secondary">
                    Recalcular
                  </Button>
                  <Button disabled={cycle.status === "paid" || markPaidMutation.isPending} onClick={() => markPaidMutation.mutate(cycle.id)} variant="secondary">
                    Marcar pagado
                  </Button>
                </div>
              </div>
              <div className="mt-3 grid gap-2 text-xs text-tp-muted md:grid-cols-2">
                {cycle.items.map((item) => (
                  <div className="flex justify-between gap-3 rounded-md bg-tp-soft px-3 py-2" key={item.id}>
                    <span>{item.description}</span>
                    <span>{item.quantity} x {formatMoney(item.unitPrice)} = {formatMoney(item.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
      {error ? <p className="text-sm text-tp-danger">{error}</p> : null}
      <DetailList title="Sucursales" rows={data.branches.map((branch) => [branch.name, labelStatus(branch.status)])} />
      <DetailList title="Usuarios" rows={data.users.map((user) => [user.name, user.roles.map(labelRole).join(", ")])} />
      <DetailList
        title="POS"
        rows={data.posDevices.map((device) => [
          device.name,
          `${labelStatus(device.status)} | ${device.licensed ? "Licenciado" : "Sin licencia"}`
        ])}
      />
      <DetailList
        title="Pagos"
        rows={data.payments.map((payment) => [
          `${payment.amount} ${payment.currency}`,
          `${labelStatus(payment.status)} | ${payment.paidAt ? new Date(payment.paidAt).toLocaleDateString() : "Sin fecha"}`
        ])}
      />
      <DetailList title="Auditoria reciente" rows={data.auditLogs.map((log) => [log.action, new Date(log.createdAt).toLocaleString()])} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-tp-soft p-3 text-sm">
      <p className="text-tp-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold text-tp-text">{value}</p>
    </div>
  );
}

function formatMoney(value: string | number) {
  return Number(value).toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-tp-border bg-white p-4 text-sm">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      <div className="space-y-2 text-tp-muted">{children}</div>
    </div>
  );
}

function DetailList({ title, rows }: { title: string; rows: string[][] }) {
  return (
    <section>
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="mt-3 divide-y divide-tp-border rounded-md border border-tp-border bg-white">
        {rows.length ? rows.map((row) => (
          <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm" key={row.join("-")}>
            <span className="font-medium">{row[0]}</span>
            <span className="text-right text-tp-muted">{row[1]}</span>
          </div>
        )) : <p className="p-4 text-sm text-tp-muted">Sin registros.</p>}
      </div>
    </section>
  );
}
