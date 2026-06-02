import { useQuery } from "@tanstack/react-query";
import { platformOrganizationsRequest } from "../../../api/platform.api";
import { LoadingState } from "../../../shared/components/loading-state";
import { StatusBadge } from "../../../shared/components/status-badge";
import { labelStatus } from "../../../shared/utils/labels";

export function PlatformSubscriptionsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["platform-organizations"], queryFn: platformOrganizationsRequest });

  if (isLoading) return <LoadingState message="Cargando suscripciones..." />;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Suscripciones</h1>
      <div className="overflow-x-auto rounded-md border border-tp-border bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-tp-border bg-tp-soft text-xs uppercase text-tp-muted">
            <tr>
              <th className="px-4 py-3">Organizacion</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">POS activos</th>
              <th className="px-4 py-3">POS licenciados</th>
              <th className="px-4 py-3">Ultimo pago</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((organization) => (
              <tr className="border-b border-tp-border last:border-0" key={organization.id}>
                <td className="px-4 py-3 font-medium">{organization.name}</td>
                <td className="px-4 py-3">{labelStatus(organization.plan ?? "free")}</td>
                <td className="px-4 py-3">
                  <StatusBadge tone={organization.subscriptionStatus === "active" ? "success" : "warning"}>
                    {labelStatus(organization.subscriptionStatus ?? "trial")}
                  </StatusBadge>
                </td>
                <td className="px-4 py-3">{organization.posDevicesActive}</td>
                <td className="px-4 py-3">{organization.posDevicesLicensed}</td>
                <td className="px-4 py-3">{organization.lastPaymentAt ? new Date(organization.lastPaymentAt).toLocaleDateString() : "Sin pago"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
