import { useDeferredValue, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { platformAuditLogRequest, platformOrganizationsRequest } from "../../../api/platform.api";
import { LoadingState } from "../../../shared/components/loading-state";

export function PlatformAuditPage() {
  const [organizationId, setOrganizationId] = useState("");
  const [userId, setUserId] = useState("");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const deferredFilters = useDeferredValue({ organizationId, userId, action, from, to });
  const { data, isLoading } = useQuery({
    queryKey: ["platform-audit", deferredFilters],
    queryFn: () => platformAuditLogRequest(deferredFilters)
  });
  const organizationsQuery = useQuery({
    queryKey: ["platform-organizations"],
    queryFn: platformOrganizationsRequest
  });

  if (isLoading) return <LoadingState message="Cargando auditoria..." />;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Auditoria global</h1>
      <div className="grid gap-3 rounded-md border border-tp-border bg-white p-4 md:grid-cols-5">
        <select className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setOrganizationId(event.target.value)} value={organizationId}>
          <option value="">Todas las organizaciones</option>
          {(organizationsQuery.data ?? []).map((organization) => (
            <option key={organization.id} value={organization.id}>{organization.name}</option>
          ))}
        </select>
        <input className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setUserId(event.target.value)} placeholder="Usuario ID" value={userId} />
        <input className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setAction(event.target.value)} placeholder="Accion" value={action} />
        <input className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setFrom(event.target.value)} type="date" value={from} />
        <input className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setTo(event.target.value)} type="date" value={to} />
      </div>
      <div className="divide-y divide-tp-border rounded-md border border-tp-border bg-white">
        {(data ?? []).map((log) => (
          <div className="grid gap-2 px-4 py-3 text-sm md:grid-cols-[180px_1fr_180px]" key={log.id}>
            <span className="font-medium">{log.action}</span>
            <span className="text-tp-muted">{log.organizationName ?? log.organizationId ?? "Plataforma"} | {log.userName ?? "Sistema"}</span>
            <span className="text-tp-muted">{new Date(log.createdAt).toLocaleString()}</span>
          </div>
        ))}
        {!data?.length ? <p className="p-4 text-sm text-tp-muted">Sin eventos.</p> : null}
      </div>
    </div>
  );
}
