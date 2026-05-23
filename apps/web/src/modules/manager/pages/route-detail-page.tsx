import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, CreditCard, PackageCheck, Truck } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  closeDeliverySettlementRequest,
  createDeliveryOrderRequest,
  createDeliverySettlementRequest,
  deliverDeliveryOrderRequest,
  deliveryOrderActionRequest,
  deliveryOrdersRequest,
  deliveryRoutesRequest,
  depositDeliverySettlementRequest,
  managerCustomersRequest,
  managerProductsRequest,
  recordDeliveryPaymentRequest
} from "../../../api/manager.api";
import { LoadingState } from "../../../shared/components/loading-state";
import { PermissionButton } from "../../../shared/components/permission-button";
import { StatusBadge } from "../../../shared/components/status-badge";
import { useBranchStore } from "../../../shared/stores/branch.store";
import type { DeliveryOrder } from "../types/manager.types";
import { formatManagerMoney } from "../utils/money";

export function RouteDetailPage() {
  const { routeId = "" } = useParams();
  const branchId = useBranchStore((state) => state.activeBranchId);
  const queryClient = useQueryClient();
  const [customerId, setCustomerId] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1.000");
  const [paymentOrderId, setPaymentOrderId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "transfer" | "credit">("cash");
  const [settlementId, setSettlementId] = useState("");
  const [deliveredCashAmount, setDeliveredCashAmount] = useState("");

  const routesQuery = useQuery({
    enabled: Boolean(branchId),
    queryFn: () => deliveryRoutesRequest(branchId ?? ""),
    queryKey: ["delivery-routes", branchId]
  });
  const ordersQuery = useQuery({
    enabled: Boolean(branchId && routeId),
    queryFn: () => deliveryOrdersRequest(routeId, branchId ?? ""),
    queryKey: ["delivery-orders", routeId, branchId]
  });
  const customersQuery = useQuery({ queryFn: managerCustomersRequest, queryKey: ["manager-customers"] });
  const productsQuery = useQuery({ queryFn: managerProductsRequest, queryKey: ["manager-products"] });
  const route = useMemo(() => routesQuery.data?.find((item) => item.id === routeId) ?? null, [routeId, routesQuery.data]);

  const createOrderMutation = useMutation({
    mutationFn: createDeliveryOrderRequest,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["delivery-orders", routeId, branchId] })
  });
  const actionMutation = useMutation({
    mutationFn: deliveryOrderActionRequest,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["delivery-orders", routeId, branchId] })
  });
  const deliverMutation = useMutation({
    mutationFn: deliverDeliveryOrderRequest,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["delivery-orders", routeId, branchId] })
  });
  const paymentMutation = useMutation({
    mutationFn: recordDeliveryPaymentRequest,
    onSuccess: () => {
      setPaymentAmount("");
      void queryClient.invalidateQueries({ queryKey: ["delivery-orders", routeId, branchId] });
    }
  });
  const createSettlementMutation = useMutation({
    mutationFn: createDeliverySettlementRequest,
    onSuccess: (settlement) => setSettlementId(settlement.id)
  });
  const closeSettlementMutation = useMutation({ mutationFn: closeDeliverySettlementRequest });
  const depositMutation = useMutation({ mutationFn: depositDeliverySettlementRequest });

  if (routesQuery.isLoading || ordersQuery.isLoading || customersQuery.isLoading || productsQuery.isLoading) {
    return <LoadingState message="Cargando ruta..." />;
  }

  if (routesQuery.isError || ordersQuery.isError || customersQuery.isError || productsQuery.isError || !route) {
    return <p className="rounded-md border border-tp-border bg-white p-5 text-sm text-tp-danger">No se pudo cargar la ruta.</p>;
  }

  const orders = ordersQuery.data ?? [];
  const products = (productsQuery.data ?? []).filter((product) => product.isSellable && product.status === "active");
  const customers = (customersQuery.data ?? []).filter((customer) => customer.status === "active");

  function createOrder() {
    if (!branchId || !route || !customerId || !productId || Number(quantity) <= 0) return;
    createOrderMutation.mutate({
      branchId,
      routeId,
      driverId: route.driverId ?? undefined,
      customerId,
      items: [{ productId, quantity }]
    });
  }

  function act(orderId: string, action: "prepare" | "load" | "in-route") {
    actionMutation.mutate({ orderId, action });
  }

  function deliver(order: DeliveryOrder) {
    deliverMutation.mutate({ order });
  }

  function recordPayment() {
    if (!paymentOrderId || !paymentAmount.trim()) return;
    paymentMutation.mutate({ orderId: paymentOrderId, amount: paymentAmount, paymentMethod });
  }

  function createSettlement() {
    if (!branchId || !route) return;
    createSettlementMutation.mutate({ branchId, routeId, driverId: route.driverId ?? undefined });
  }

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link className="inline-flex items-center gap-2 text-sm font-semibold text-tp-primary" to="/app/manager/routes">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Rutas
          </Link>
          <h1 className="mt-3 text-2xl font-semibold">{route.name}</h1>
          <p className="mt-2 text-sm text-tp-muted">Pedidos, carga, entrega, cobro y liquidacion de ruta.</p>
        </div>
        <StatusBadge tone={route.status === "active" ? "success" : "warning"}>{route.status}</StatusBadge>
      </div>

      <div className="mb-5 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-md border border-tp-border bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold">Nuevo pedido</h2>
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_140px_auto]">
            <select className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setCustomerId(event.target.value)} value={customerId}>
              <option value="">Cliente</option>
              {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
            </select>
            <select className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setProductId(event.target.value)} value={productId}>
              <option value="">Producto</option>
              {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
            </select>
            <input className="h-11 rounded-md border border-tp-border px-3 text-sm" inputMode="decimal" onChange={(event) => setQuantity(event.target.value)} value={quantity} />
            <PermissionButton disabled={!customerId || !productId || createOrderMutation.isPending} onClick={createOrder} permission="routes.manage">
              <Truck className="h-4 w-4" aria-hidden="true" />
              Crear
            </PermissionButton>
          </div>
        </article>

        <article className="rounded-md border border-tp-border bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold">Cobro en ruta</h2>
          <div className="grid gap-3 md:grid-cols-[1fr_120px_130px_auto]">
            <select className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setPaymentOrderId(event.target.value)} value={paymentOrderId}>
              <option value="">Pedido</option>
              {orders.map((order) => <option key={order.id} value={order.id}>{order.customerName ?? order.customerId} - {formatManagerMoney(order.amountPending)}</option>)}
            </select>
            <input className="h-11 rounded-md border border-tp-border px-3 text-sm" inputMode="decimal" onChange={(event) => setPaymentAmount(event.target.value)} placeholder="Monto" value={paymentAmount} />
            <select className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setPaymentMethod(event.target.value as typeof paymentMethod)} value={paymentMethod}>
              <option value="cash">cash</option>
              <option value="card">card</option>
              <option value="transfer">transfer</option>
              <option value="credit">credit</option>
            </select>
            <PermissionButton disabled={!paymentOrderId || !paymentAmount.trim() || paymentMutation.isPending} onClick={recordPayment} permission="routes.manage">
              <CreditCard className="h-4 w-4" aria-hidden="true" />
              Cobrar
            </PermissionButton>
          </div>
        </article>
      </div>

      <div className="mb-5 overflow-x-auto rounded-md border border-tp-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-tp-soft text-xs uppercase text-tp-muted">
            <tr>
              <th className="px-4 py-3">Pedido</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Pendiente</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr className="border-t border-tp-border" key={order.id}>
                <td className="px-4 py-3 font-semibold">{order.id}</td>
                <td className="px-4 py-3">{order.customerName ?? order.customerId}</td>
                <td className="px-4 py-3">{formatManagerMoney(order.total)}</td>
                <td className="px-4 py-3">{formatManagerMoney(order.amountPending)}</td>
                <td className="px-4 py-3"><StatusBadge tone={order.status === "paid" || order.status === "delivered" ? "success" : "warning"}>{order.status}</StatusBadge></td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <PermissionButton disabled={order.status !== "pending" || actionMutation.isPending} onClick={() => act(order.id, "prepare")} permission="routes.manage" variant="secondary">Preparar</PermissionButton>
                    <PermissionButton disabled={order.status !== "prepared" || actionMutation.isPending} onClick={() => act(order.id, "load")} permission="routes.manage" variant="secondary">Cargar</PermissionButton>
                    <PermissionButton disabled={order.status !== "loaded" || actionMutation.isPending} onClick={() => act(order.id, "in-route")} permission="routes.manage" variant="secondary">En ruta</PermissionButton>
                    <PermissionButton disabled={order.status !== "in_route" || deliverMutation.isPending} onClick={() => deliver(order)} permission="routes.manage" variant="secondary">Entregar</PermissionButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <article className="rounded-md border border-tp-border bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold">Liquidacion</h2>
        <div className="grid gap-3 md:grid-cols-[auto_1fr_160px_auto_auto]">
          <PermissionButton disabled={createSettlementMutation.isPending} onClick={createSettlement} permission="routes.manage" variant="secondary">
            <PackageCheck className="h-4 w-4" aria-hidden="true" />
            Crear
          </PermissionButton>
          <input className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setSettlementId(event.target.value)} placeholder="settlementId" value={settlementId} />
          <input className="h-11 rounded-md border border-tp-border px-3 text-sm" inputMode="decimal" onChange={(event) => setDeliveredCashAmount(event.target.value)} placeholder="Efectivo" value={deliveredCashAmount} />
          <PermissionButton disabled={!settlementId || !deliveredCashAmount || closeSettlementMutation.isPending} onClick={() => closeSettlementMutation.mutate({ settlementId, deliveredCashAmount })} permission="routes.manage" variant="secondary">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Cerrar
          </PermissionButton>
          <PermissionButton disabled={!settlementId || depositMutation.isPending} onClick={() => depositMutation.mutate(settlementId)} permission="routes.manage">Depositar</PermissionButton>
        </div>
      </article>
    </section>
  );
}
