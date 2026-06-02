import { useMutation, useQuery } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { createPlatformOrganizationRequest, platformOrganizationsRequest } from "../../../api/platform.api";
import { queryClient } from "../../../app/query-client";
import { ApiErrorException } from "../../../api/api-error";
import { Button } from "../../../shared/components/button";
import { LoadingState } from "../../../shared/components/loading-state";
import { StatusBadge } from "../../../shared/components/status-badge";
import { labelStatus } from "../../../shared/utils/labels";

export function PlatformOrganizationsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["platform-organizations"], queryFn: platformOrganizationsRequest });
  const [form, setForm] = useState({
    name: "",
    legalName: "",
    taxId: "",
    contactEmail: "",
    contactPhone: "",
    planCode: "free" as "free" | "paid",
    ownerName: "",
    ownerEmail: "",
    ownerPassword: "",
    ownerPhone: "",
    ownerPin: ""
  });
  const [error, setError] = useState<string | null>(null);
  const createMutation = useMutation({
    mutationFn: createPlatformOrganizationRequest,
    onSuccess: () => {
      setForm({
        name: "",
        legalName: "",
        taxId: "",
        contactEmail: "",
        contactPhone: "",
        planCode: "free",
        ownerName: "",
        ownerEmail: "",
        ownerPassword: "",
        ownerPhone: "",
        ownerPin: ""
      });
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ["platform-organizations"] });
      void queryClient.invalidateQueries({ queryKey: ["platform-dashboard"] });
    },
    onError: (mutationError) => {
      setError(mutationError instanceof ApiErrorException ? mutationError.apiError.message : "No se pudo crear la organizacion.");
    }
  });

  if (isLoading) return <LoadingState message="Cargando organizaciones..." />;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ownerEnabled = Boolean(form.ownerName || form.ownerEmail || form.ownerPassword || form.ownerPhone || form.ownerPin);
    createMutation.mutate({
      name: form.name,
      legalName: form.legalName,
      taxId: form.taxId,
      contactEmail: form.contactEmail,
      contactPhone: form.contactPhone,
      planCode: form.planCode,
      ...(ownerEnabled
        ? {
            owner: {
              name: form.ownerName,
              email: form.ownerEmail,
              password: form.ownerPassword,
              phone: form.ownerPhone,
              pin: form.ownerPin
            }
          }
        : {})
    });
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Organizaciones</h1>
      <form className="grid gap-3 rounded-md border border-tp-border bg-white p-4 md:grid-cols-3" onSubmit={submit}>
        <input className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Nombre comercial" required value={form.name} />
        <input className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setForm((current) => ({ ...current, legalName: event.target.value }))} placeholder="Razon social" value={form.legalName} />
        <input className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setForm((current) => ({ ...current, taxId: event.target.value }))} placeholder="RFC" value={form.taxId} />
        <input className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setForm((current) => ({ ...current, contactEmail: event.target.value }))} placeholder="Correo de contacto" required type="email" value={form.contactEmail} />
        <input className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setForm((current) => ({ ...current, contactPhone: event.target.value }))} placeholder="Telefono" value={form.contactPhone} />
        <select className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setForm((current) => ({ ...current, planCode: event.target.value as "free" | "paid" }))} value={form.planCode}>
          <option value="free">Plan free</option>
          <option value="paid">Plan paid</option>
        </select>
        <input className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setForm((current) => ({ ...current, ownerName: event.target.value }))} placeholder="Dueno inicial" value={form.ownerName} />
        <input className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setForm((current) => ({ ...current, ownerEmail: event.target.value }))} placeholder="Correo dueno" type="email" value={form.ownerEmail} />
        <input className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setForm((current) => ({ ...current, ownerPassword: event.target.value }))} placeholder="Contrasena temporal" type="password" value={form.ownerPassword} />
        <input className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setForm((current) => ({ ...current, ownerPhone: event.target.value }))} placeholder="Telefono dueno" value={form.ownerPhone} />
        <input className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setForm((current) => ({ ...current, ownerPin: event.target.value }))} placeholder="PIN dueno" value={form.ownerPin} />
        {error ? <p className="text-sm text-tp-danger md:col-span-2">{error}</p> : <span />}
        <Button className="md:justify-self-end" disabled={createMutation.isPending} type="submit" variant="secondary">
          {createMutation.isPending ? "Creando..." : "Crear organizacion"}
        </Button>
      </form>
      <div className="overflow-x-auto rounded-md border border-tp-border bg-white">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-tp-border bg-tp-soft text-xs uppercase text-tp-muted">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Sucursales</th>
              <th className="px-4 py-3">POS</th>
              <th className="px-4 py-3">Ultimo pago</th>
              <th className="px-4 py-3">Accion</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((org) => (
              <tr className="border-b border-tp-border last:border-0" key={org.id}>
                <td className="px-4 py-3 font-medium">{org.name}</td>
                <td className="px-4 py-3"><StatusBadge tone={org.status === "active" ? "success" : "warning"}>{labelStatus(org.status)}</StatusBadge></td>
                <td className="px-4 py-3">{labelStatus(org.plan ?? "free")}</td>
                <td className="px-4 py-3">{org.branches}</td>
                <td className="px-4 py-3">{org.posDevicesLicensed}/{org.posDevicesActive}</td>
                <td className="px-4 py-3">{org.lastPaymentAt ? new Date(org.lastPaymentAt).toLocaleDateString() : "Sin pago"}</td>
                <td className="px-4 py-3"><Link className="font-semibold text-tp-primary" to={`/platform/organizations/${org.id}`}>Abrir</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
