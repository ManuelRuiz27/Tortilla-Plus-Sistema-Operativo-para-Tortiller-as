import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Truck } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  createDeliveryDriverRequest,
  createDeliveryRouteRequest,
  deliveryDriversRequest,
  deliveryRoutesRequest
} from "../../../api/manager.api";
import { LoadingState } from "../../../shared/components/loading-state";
import { PermissionButton } from "../../../shared/components/permission-button";
import { StatusBadge } from "../../../shared/components/status-badge";
import { useBranchStore } from "../../../shared/stores/branch.store";

export function RoutesPage() {
  const queryClient = useQueryClient();
  const branchId = useBranchStore((state) => state.activeBranchId);
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [routeName, setRouteName] = useState("");
  const [driverId, setDriverId] = useState("");
  const routesQuery = useQuery({
    enabled: Boolean(branchId),
    queryFn: () => deliveryRoutesRequest(branchId ?? ""),
    queryKey: ["delivery-routes", branchId]
  });
  const driversQuery = useQuery({
    queryFn: deliveryDriversRequest,
    queryKey: ["delivery-drivers"]
  });
  const createDriverMutation = useMutation({
    mutationFn: createDeliveryDriverRequest,
    onSuccess: () => {
      setDriverName("");
      setDriverPhone("");
      void queryClient.invalidateQueries({ queryKey: ["delivery-drivers"] });
    }
  });
  const createRouteMutation = useMutation({
    mutationFn: createDeliveryRouteRequest,
    onSuccess: () => {
      setRouteName("");
      setDriverId("");
      void queryClient.invalidateQueries({ queryKey: ["delivery-routes", branchId] });
    }
  });

  function submitDriver() {
    if (!driverName.trim()) return;
    createDriverMutation.mutate({ name: driverName.trim(), phone: driverPhone.trim() || undefined });
  }

  function submitRoute() {
    if (!branchId || !routeName.trim()) return;
    createRouteMutation.mutate({ branchId, name: routeName.trim(), driverId: driverId || undefined });
  }

  if (routesQuery.isLoading || driversQuery.isLoading) return <LoadingState message="Cargando rutas..." />;
  if (routesQuery.isError || driversQuery.isError) return <p className="rounded-md border border-tp-border bg-white p-5 text-sm text-tp-danger">No se pudieron cargar rutas.</p>;

  const routes = routesQuery.data ?? [];
  const drivers = driversQuery.data ?? [];

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-tp-primary">Rutas</p>
          <h1 className="mt-3 text-2xl font-semibold">Reparto por sucursal</h1>
          <p className="mt-2 text-sm text-tp-muted">Alta de repartidores, rutas activas y carga operativa del dia.</p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-right">
          <div>
            <p className="text-xs uppercase text-tp-muted">Rutas</p>
            <p className="text-xl font-semibold">{routes.length}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-tp-muted">Repartidores</p>
            <p className="text-xl font-semibold">{drivers.length}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-tp-muted">Clientes</p>
            <p className="text-xl font-semibold">{routes.reduce((sum, route) => sum + route.customerCount, 0)}</p>
          </div>
        </div>
      </div>

      <div className="mb-5 grid gap-4 xl:grid-cols-2">
        <div className="rounded-md border border-tp-border bg-white p-4">
          <p className="mb-3 text-sm font-semibold">Nuevo repartidor</p>
          <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
            <input className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setDriverName(event.target.value)} placeholder="Nombre" value={driverName} />
            <input className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setDriverPhone(event.target.value)} placeholder="Telefono" value={driverPhone} />
            <PermissionButton disabled={!driverName.trim() || createDriverMutation.isPending} onClick={submitDriver} permission="routes.manage">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Crear
            </PermissionButton>
          </div>
        </div>
        <div className="rounded-md border border-tp-border bg-white p-4">
          <p className="mb-3 text-sm font-semibold">Nueva ruta</p>
          <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
            <input className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setRouteName(event.target.value)} placeholder="Nombre de ruta" value={routeName} />
            <select className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setDriverId(event.target.value)} value={driverId}>
              <option value="">Sin repartidor</option>
              {drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.name}</option>)}
            </select>
            <PermissionButton disabled={!routeName.trim() || createRouteMutation.isPending} onClick={submitRoute} permission="routes.manage">
              <Truck className="h-4 w-4" aria-hidden="true" />
              Crear
            </PermissionButton>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-tp-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-tp-soft text-xs uppercase text-tp-muted">
            <tr>
              <th className="px-4 py-3">Ruta</th>
              <th className="px-4 py-3">Repartidor</th>
              <th className="px-4 py-3">Clientes</th>
              <th className="px-4 py-3">Pedidos</th>
              <th className="px-4 py-3">Liquidacion</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {routes.map((route) => (
              <tr className="border-t border-tp-border" key={route.id}>
                <td className="px-4 py-3 font-semibold">{route.name}</td>
                <td className="px-4 py-3">{route.driverName ?? "Sin asignar"}</td>
                <td className="px-4 py-3">{route.customerCount}</td>
                <td className="px-4 py-3">Pendiente de listado</td>
                <td className="px-4 py-3">Sin cierre</td>
                <td className="px-4 py-3">
                  <StatusBadge tone={route.status === "active" ? "success" : "warning"}>{route.status}</StatusBadge>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link className="text-sm font-semibold text-tp-primary hover:underline" to={`/app/manager/routes/${route.id}`}>
                    Operar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
