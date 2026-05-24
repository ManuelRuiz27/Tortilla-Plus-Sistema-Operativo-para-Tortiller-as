import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Truck } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  createDeliveryDriverRequest,
  createDeliveryRouteRequest,
  deliveryDriversRequest,
  deliveryOrdersListRequest,
  deliveryRoutesRequest,
  deliverySettlementsRequest
} from "../../../api/manager.api";
import { LoadingState } from "../../../shared/components/loading-state";
import { PermissionButton } from "../../../shared/components/permission-button";
import { StatusBadge } from "../../../shared/components/status-badge";
import { useBranchStore } from "../../../shared/stores/branch.store";
import { labelStatus } from "../../../shared/utils/labels";
import type { DeliveryOrder, DeliverySettlement } from "../types/manager.types";
import { formatManagerMoney } from "../utils/money";

function today() {
  return new Date().toISOString().slice(0, 10);
}

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
  const todayOrdersQuery = useQuery({
    enabled: Boolean(branchId),
    queryFn: () => deliveryOrdersListRequest({ branchId: branchId ?? "", date: today() }),
    queryKey: ["delivery-orders-today", branchId, today()]
  });
  const settlementsQuery = useQuery({
    enabled: Boolean(branchId),
    queryFn: () => deliverySettlementsRequest({ branchId: branchId ?? "" }),
    queryKey: ["delivery-settlements", branchId]
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

  if (routesQuery.isLoading || driversQuery.isLoading || todayOrdersQuery.isLoading || settlementsQuery.isLoading) return <LoadingState message="Cargando rutas..." />;
  if (routesQuery.isError || driversQuery.isError || todayOrdersQuery.isError || settlementsQuery.isError) return <p className="rounded-md border border-tp-border bg-white p-5 text-sm text-tp-danger">No se pudieron cargar rutas.</p>;

  const routes = routesQuery.data ?? [];
  const drivers = driversQuery.data ?? [];
  const todayOrders = todayOrdersQuery.data ?? [];
  const settlements = settlementsQuery.data ?? [];
  const pendingOrders = todayOrders.filter((order) => !["paid", "cancelled"].includes(order.status));
  const pendingSettlements = settlements.filter((settlement) => settlement.status === "open" || (settlement.status === "closed" && !settlement.cashSessionId));

  function routeOrders(routeId: string): DeliveryOrder[] {
    return todayOrders.filter((order) => order.routeId === routeId);
  }

  function routeSettlements(routeId: string): DeliverySettlement[] {
    return settlements.filter((settlement) => settlement.routeId === routeId);
  }

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-tp-primary">Rutas</p>
          <h1 className="mt-3 text-2xl font-semibold">Reparto</h1>
          <p className="mt-2 text-sm text-tp-muted">Organiza repartidores, rutas y clientes por atender.</p>
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

      <div className="mb-5 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-md border border-tp-border bg-white p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Pedidos de hoy</h2>
              <p className="mt-1 text-sm text-tp-muted">{pendingOrders.length} pedidos requieren seguimiento.</p>
            </div>
            <span className="text-sm font-semibold">{formatManagerMoney(todayOrders.reduce((sum, order) => sum + order.amountPending, 0))} pendiente</span>
          </div>
          <div className="divide-y divide-tp-border">
            {todayOrders.length === 0 ? (
              <p className="py-3 text-sm text-tp-muted">Sin pedidos para hoy.</p>
            ) : (
              todayOrders.slice(0, 6).map((order) => (
                <Link className="grid gap-2 py-3 text-sm hover:bg-tp-soft md:grid-cols-[1fr_140px_120px]" key={order.id} to={order.routeId ? `/app/manager/routes/${order.routeId}` : "/app/manager/routes"}>
                  <span>
                    <span className="block font-semibold">{order.customerName ?? order.customerId}</span>
                    <span className="text-xs text-tp-muted">{order.routeId ? routes.find((route) => route.id === order.routeId)?.name ?? "Ruta" : "Sin ruta"}</span>
                  </span>
                  <span>{formatManagerMoney(order.amountPending)} pendiente</span>
                  <StatusBadge tone={order.status === "paid" ? "success" : "warning"}>{labelStatus(order.status)}</StatusBadge>
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="rounded-md border border-tp-border bg-white p-4">
          <div className="mb-3">
            <h2 className="text-sm font-semibold">Liquidaciones pendientes</h2>
            <p className="mt-1 text-sm text-tp-muted">Cierres abiertos o efectivo cerrado sin deposito.</p>
          </div>
          <div className="divide-y divide-tp-border">
            {pendingSettlements.length === 0 ? (
              <p className="py-3 text-sm text-tp-muted">Sin liquidaciones pendientes.</p>
            ) : (
              pendingSettlements.slice(0, 6).map((settlement) => (
                <Link className="grid gap-2 py-3 text-sm hover:bg-tp-soft md:grid-cols-[1fr_120px_100px]" key={settlement.id} to={settlement.routeId ? `/app/manager/routes/${settlement.routeId}` : "/app/manager/routes"}>
                  <span className="font-semibold">{settlement.routeId ? routes.find((route) => route.id === settlement.routeId)?.name ?? "Ruta" : "Sin ruta"}</span>
                  <span>{formatManagerMoney(settlement.status === "closed" ? settlement.deliveredCashAmount : settlement.expectedCashAmount)}</span>
                  <StatusBadge tone={settlement.status === "closed" ? "success" : "warning"}>{settlement.cashSessionId ? "Depositada" : labelStatus(settlement.status)}</StatusBadge>
                </Link>
              ))
            )}
          </div>
        </section>
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
              <th className="px-4 py-3">Cierre</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {routes.map((route) => (
              (() => {
                const orders = routeOrders(route.id);
                const pendingRouteOrders = orders.filter((order) => !["paid", "cancelled"].includes(order.status));
                const routePendingSettlements = routeSettlements(route.id).filter((settlement) => settlement.status === "open" || (settlement.status === "closed" && !settlement.cashSessionId));

                return (
              <tr className="border-t border-tp-border" key={route.id}>
                <td className="px-4 py-3 font-semibold">{route.name}</td>
                <td className="px-4 py-3">{route.driverName ?? "Sin asignar"}</td>
                <td className="px-4 py-3">{route.customerCount}</td>
                <td className="px-4 py-3">{orders.length} hoy / {pendingRouteOrders.length} pendientes</td>
                <td className="px-4 py-3">{routePendingSettlements.length > 0 ? `${routePendingSettlements.length} pendiente` : "Al corriente"}</td>
                <td className="px-4 py-3">
                  <StatusBadge tone={route.status === "active" ? "success" : "warning"}>{labelStatus(route.status)}</StatusBadge>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link className="text-sm font-semibold text-tp-primary hover:underline" to={`/app/manager/routes/${route.id}`}>
                    Abrir
                  </Link>
                </td>
              </tr>
                );
              })()
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
