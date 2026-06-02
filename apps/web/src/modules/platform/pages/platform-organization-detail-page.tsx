import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ApiErrorException } from "../../../api/api-error";
import {
  platformOrganizationRequest,
  updatePlatformOrganizationRequest,
  updatePlatformOrganizationStatusRequest,
  updatePlatformSubscriptionRequest
} from "../../../api/platform.api";
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
  const [status, setStatus] = useState("active");
  const [planCode, setPlanCode] = useState<"free" | "paid">("free");
  const [subscriptionStatus, setSubscriptionStatus] = useState("trial");
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");
  const [name, setName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
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

  useEffect(() => {
    if (!data) return;
    setStatus(data.status);
    setPlanCode((data.subscription?.planCode ?? "free") as "free" | "paid");
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
            <Button disabled={statusMutation.isPending || status === data.status} onClick={() => statusMutation.mutate(status)} variant="secondary">
              Aplicar estado
            </Button>
          </div>
        </Panel>
        <Panel title="Suscripcion">
          <p>Plan: {labelStatus(data.subscription?.planCode ?? "free")}</p>
          <p>Estado: {labelStatus(data.subscription?.status ?? "sin_estado")}</p>
          <p>Periodo: {data.subscription?.billingPeriod ?? "monthly"}</p>
          <div className="mt-3 grid gap-2">
            <select className="h-10 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setPlanCode(event.target.value as "free" | "paid")} value={planCode}>
              <option value="free">Plan free</option>
              <option value="paid">Plan paid</option>
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
            <Button disabled={subscriptionMutation.isPending} onClick={() => subscriptionMutation.mutate()} variant="secondary">
              Guardar suscripcion
            </Button>
          </div>
        </Panel>
        <Panel title="POS">
          <p>Activos: {data.posDevices.filter((device) => device.status === "active").length}</p>
          <p>Licenciados: {data.posDevices.filter((device) => device.licensed).length}</p>
        </Panel>
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
