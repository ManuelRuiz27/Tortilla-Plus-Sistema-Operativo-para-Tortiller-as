import { useMutation, useQuery } from "@tanstack/react-query";
import { ApiErrorException } from "../../../api/api-error";
import { platformPosDevicesRequest, updatePlatformPosDeviceLicenseRequest, updatePlatformPosDeviceStatusRequest } from "../../../api/platform.api";
import { queryClient } from "../../../app/query-client";
import { Button } from "../../../shared/components/button";
import { LoadingState } from "../../../shared/components/loading-state";
import { StatusBadge } from "../../../shared/components/status-badge";
import { labelStatus } from "../../../shared/utils/labels";

export function PlatformPosDevicesPage() {
  const { data, isLoading } = useQuery({ queryKey: ["platform-pos-devices"], queryFn: platformPosDevicesRequest });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updatePlatformPosDeviceStatusRequest(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["platform-pos-devices"] });
      void queryClient.invalidateQueries({ queryKey: ["platform-dashboard"] });
    }
  });
  const licenseMutation = useMutation({
    mutationFn: ({ id, licensed }: { id: string; licensed: boolean }) => updatePlatformPosDeviceLicenseRequest(id, licensed),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["platform-pos-devices"] });
      void queryClient.invalidateQueries({ queryKey: ["platform-dashboard"] });
    }
  });
  if (isLoading) return <LoadingState message="Cargando POS..." />;

  function changeStatus(device: { id: string; status: string; name: string }) {
    const nextStatus = device.status === "active" ? "inactive" : "active";
    if (nextStatus !== "active") {
      const confirmed = window.confirm(`El POS ${device.name} no podra operar ventas reales mientras este inactivo. ¿Continuar?`);
      if (!confirmed) return;
    }
    statusMutation.mutate({ id: device.id, status: nextStatus });
  }

  function changeLicense(device: { id: string; licensed: boolean; name: string }) {
    if (device.licensed) {
      const confirmed = window.confirm(`Quitar la licencia a ${device.name} bloqueara ventas reales en ese POS. ¿Continuar?`);
      if (!confirmed) return;
    }
    licenseMutation.mutate({ id: device.id, licensed: !device.licensed });
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">POS / Licencias</h1>
      <div className="overflow-x-auto rounded-md border border-tp-border bg-white">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="border-b border-tp-border bg-tp-soft text-xs uppercase text-tp-muted">
            <tr>
              <th className="px-4 py-3">Organizacion</th>
              <th className="px-4 py-3">Sucursal</th>
              <th className="px-4 py-3">POS</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Licencia</th>
              <th className="px-4 py-3">Ultima conexion</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((device) => (
              <tr className="border-b border-tp-border last:border-0" key={device.id}>
                <td className="px-4 py-3">{device.organizationName ?? device.organizationId}</td>
                <td className="px-4 py-3">{device.branchName ?? device.branchId}</td>
                <td className="px-4 py-3 font-medium">{device.name}</td>
                <td className="px-4 py-3"><StatusBadge tone={device.status === "active" ? "success" : "warning"}>{labelStatus(device.status)}</StatusBadge></td>
                <td className="px-4 py-3"><StatusBadge tone={device.licensed ? "success" : "warning"}>{device.licensed ? "Licenciado" : "Sin licencia"}</StatusBadge></td>
                <td className="px-4 py-3">{device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString() : "Sin registro"}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Button disabled={statusMutation.isPending} onClick={() => changeStatus(device)} variant="secondary">
                      {device.status === "active" ? "Desactivar" : "Activar"}
                    </Button>
                    <Button disabled={licenseMutation.isPending} onClick={() => changeLicense(device)} variant="secondary">
                      {device.licensed ? "Quitar licencia" : "Licenciar"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(statusMutation.error instanceof ApiErrorException || licenseMutation.error instanceof ApiErrorException) ? (
        <p className="text-sm text-tp-danger">
          {(statusMutation.error instanceof ApiErrorException ? statusMutation.error.apiError.message : licenseMutation.error instanceof ApiErrorException ? licenseMutation.error.apiError.message : "")}
        </p>
      ) : null}
    </div>
  );
}
