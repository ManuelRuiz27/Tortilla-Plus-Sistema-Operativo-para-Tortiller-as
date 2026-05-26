import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, CreditCard, PackageCheck, Truck } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  assignCustomerToRouteRequest,
  closeDeliverySettlementRequest,
  createDeliveryOrderRequest,
  createDeliverySettlementRequest,
  deliverDeliveryOrderRequest,
  deliveryOrderActionRequest,
  deliveryOrdersRequest,
  deliveryRoutesRequest,
  deliverySettlementsRequest,
  depositDeliverySettlementRequest,
  managerCustomersRequest,
  managerProductsRequest,
  removeCustomerFromRouteRequest,
  reorderRouteCustomersRequest,
  recordDeliveryPaymentRequest
} from "../../../api/manager.api";
import { LoadingState } from "../../../shared/components/loading-state";
import { PermissionButton } from "../../../shared/components/permission-button";
import { StatusBadge } from "../../../shared/components/status-badge";
import { useBranchStore } from "../../../shared/stores/branch.store";
import { labelStatus } from "../../../shared/utils/labels";
import type { DeliveryOrder } from "../types/manager.types";
import { formatManagerMoney } from "../utils/money";

type RouteTab = "customers" | "orders" | "delivery" | "payments" | "settlement";

export function RouteDetailPage() {
  const { routeId = "" } = useParams();
  const branchId = useBranchStore((state) => state.activeBranchId);
  const queryClient = useQueryClient();
  const [customerId, setCustomerId] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1.000");
  const [orderItems, setOrderItems] = useState<Array<{ productId: string; quantity: string }>>([]);
  const [routeOrderValues, setRouteOrderValues] = useState<Record<string, string>>({});
  const [deliveryQuantities, setDeliveryQuantities] = useState<Record<string, string>>({});
  const [paymentOrderId, setPaymentOrderId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "transfer" | "credit">("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [authorizationPin, setAuthorizationPin] = useState("");
  const [routeCustomerId, setRouteCustomerId] = useState("");
  const [routeSortOrder, setRouteSortOrder] = useState("0");
  const [settlementId, setSettlementId] = useState("");
  const [deliveredCashAmount, setDeliveredCashAmount] = useState("");
  const [activeTab, setActiveTab] = useState<RouteTab>("customers");

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
    onSuccess: () => {
      setOrderItems([]);
      setCustomerId("");
      void queryClient.invalidateQueries({ queryKey: ["delivery-orders", routeId, branchId] });
    }
  });
  const settlementsQuery = useQuery({
    enabled: Boolean(branchId && routeId),
    queryFn: () => deliverySettlementsRequest({ branchId: branchId ?? "", routeId }),
    queryKey: ["delivery-settlements", routeId, branchId]
  });
  const assignCustomerMutation = useMutation({
    mutationFn: assignCustomerToRouteRequest,
    onSuccess: () => {
      setRouteCustomerId("");
      setRouteSortOrder("0");
      void queryClient.invalidateQueries({ queryKey: ["delivery-routes", branchId] });
    }
  });
  const removeCustomerMutation = useMutation({
    mutationFn: removeCustomerFromRouteRequest,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["delivery-routes", branchId] })
  });
  const reorderCustomersMutation = useMutation({
    mutationFn: reorderRouteCustomersRequest,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["delivery-routes", branchId] })
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
      setPaymentReference("");
      setAuthorizationPin("");
      void queryClient.invalidateQueries({ queryKey: ["delivery-orders", routeId, branchId] });
      void queryClient.invalidateQueries({ queryKey: ["manager-customers"] });
      void queryClient.invalidateQueries({ queryKey: ["customer-balance"] });
      void queryClient.invalidateQueries({ queryKey: ["delivery-settlements", routeId, branchId] });
    }
  });
  const createSettlementMutation = useMutation({
    mutationFn: createDeliverySettlementRequest,
    onSuccess: (settlement) => {
      setSettlementId(settlement.id);
      void queryClient.invalidateQueries({ queryKey: ["delivery-settlements", routeId, branchId] });
    }
  });
  const closeSettlementMutation = useMutation({
    mutationFn: closeDeliverySettlementRequest,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["delivery-settlements", routeId, branchId] })
  });
  const depositMutation = useMutation({
    mutationFn: depositDeliverySettlementRequest,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["delivery-settlements", routeId, branchId] })
  });

  if (routesQuery.isLoading || ordersQuery.isLoading || customersQuery.isLoading || productsQuery.isLoading || settlementsQuery.isLoading) {
    return <LoadingState message="Cargando ruta..." />;
  }

  if (routesQuery.isError || ordersQuery.isError || customersQuery.isError || productsQuery.isError || settlementsQuery.isError || !route) {
    return <p className="rounded-md border border-tp-border bg-white p-5 text-sm text-tp-danger">No se pudo cargar la ruta.</p>;
  }

  const orders = ordersQuery.data ?? [];
  const settlements = settlementsQuery.data ?? [];
  const products = (productsQuery.data ?? []).filter((product) => product.isSellable && product.status === "active");
  const customers = (customersQuery.data ?? []).filter((customer) => customer.status === "active");
  const routeCustomers = route.customers
    .filter((assignment) => assignment.customer?.status === "active")
    .sort((left, right) => left.sortOrder - right.sortOrder);
  const availableCustomers = customers.filter(
    (customer) => !route.customers.some((assignment) => assignment.customerId === customer.id)
  );
  const selectedPaymentOrder = orders.find((order) => order.id === paymentOrderId) ?? null;
  const selectedPaymentCustomer = selectedPaymentOrder
    ? customers.find((customer) => customer.id === selectedPaymentOrder.customerId) ?? null
    : null;
  const selectedCreditAvailable = selectedPaymentCustomer
    ? selectedPaymentCustomer.creditLimit - selectedPaymentCustomer.currentBalance
    : 0;
  const selectedSettlement = settlements.find((settlement) => settlement.id === settlementId) ?? null;
  const tabs: Array<{ id: RouteTab; label: string }> = [
    { id: "customers", label: "Clientes" },
    { id: "orders", label: "Pedidos" },
    { id: "delivery", label: "Carga / entrega" },
    { id: "payments", label: "Cobros" },
    { id: "settlement", label: "Liquidacion" }
  ];

  function createOrder() {
    if (!branchId || !route || !customerId || orderItems.length === 0) return;
    createOrderMutation.mutate({
      branchId,
      routeId,
      driverId: route.driverId ?? undefined,
      customerId,
      items: orderItems
    });
  }

  function addOrderItem() {
    if (!productId || Number(quantity) <= 0) return;
    setOrderItems((items) => [...items, { productId, quantity }]);
    setProductId("");
    setQuantity("1.000");
  }

  function removeOrderItem(index: number) {
    setOrderItems((items) => items.filter((_, itemIndex) => itemIndex !== index));
  }

  function act(orderId: string, action: "prepare" | "load" | "in-route") {
    actionMutation.mutate({ orderId, action });
  }

  function deliver(order: DeliveryOrder) {
    deliverMutation.mutate({
      order,
      items: order.items.map((item) => ({
        deliveryOrderItemId: item.id,
        quantity: (deliveryQuantities[item.id] || item.quantityLoaded.toFixed(3)).trim()
      }))
    });
  }

  function recordPayment() {
    if (!paymentOrderId || !paymentAmount.trim()) return;
    paymentMutation.mutate({
      orderId: paymentOrderId,
      amount: paymentAmount,
      paymentMethod,
      reference: paymentReference.trim() || undefined,
      authorizationPin: authorizationPin.trim() || undefined
    });
  }

  function assignCustomer() {
    if (!routeCustomerId) return;
    assignCustomerMutation.mutate({ routeId, customerId: routeCustomerId, sortOrder: Number(routeSortOrder || 0) });
  }

  function saveRouteOrder() {
    reorderCustomersMutation.mutate({
      routeId,
      customers: routeCustomers.map((assignment, index) => ({
        customerId: assignment.customerId,
        sortOrder: Number(routeOrderValues[assignment.customerId] ?? assignment.sortOrder ?? index + 1)
      }))
    });
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
          <p className="mt-2 text-sm text-tp-muted">Prepara pedidos, registra entregas y cierra el efectivo de la ruta.</p>
        </div>
        <StatusBadge tone={route.status === "active" ? "success" : "warning"}>{labelStatus(route.status)}</StatusBadge>
      </div>

      <div className="mb-5 flex gap-2 overflow-x-auto border-b border-tp-border">
        {tabs.map((tab) => (
          <button
            className={`min-h-11 whitespace-nowrap border-b-2 px-3 text-sm font-semibold transition ${
              activeTab === tab.id
                ? "border-tp-primary text-tp-primary"
                : "border-transparent text-tp-muted hover:text-tp-text"
            }`}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={`${["customers", "orders", "payments"].includes(activeTab) ? "mb-5 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]" : "hidden"}`}>
        <article className={`${activeTab === "customers" ? "rounded-md border border-tp-border bg-white p-5 xl:col-span-2" : "hidden"}`}>
          <h2 className="mb-4 text-sm font-semibold">Clientes de la ruta</h2>
          <div className="mb-4 grid gap-3 md:grid-cols-[1fr_120px_auto]">
            <select className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setRouteCustomerId(event.target.value)} value={routeCustomerId}>
              <option value="">Agregar cliente</option>
              {availableCustomers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
            </select>
            <input className="h-11 rounded-md border border-tp-border px-3 text-sm" inputMode="numeric" onChange={(event) => setRouteSortOrder(event.target.value)} value={routeSortOrder} />
            <PermissionButton disabled={!routeCustomerId || assignCustomerMutation.isPending} onClick={assignCustomer} permission="routes.manage">
              Agregar
            </PermissionButton>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-tp-soft text-xs uppercase text-tp-muted">
                <tr>
                  <th className="px-4 py-3">Orden</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Saldo</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {routeCustomers.map((assignment) => (
                  <tr className="border-t border-tp-border" key={assignment.customerId}>
                    <td className="px-4 py-3">
                      <input
                        className="h-9 w-20 rounded-md border border-tp-border px-2 text-sm"
                        inputMode="numeric"
                        onChange={(event) => setRouteOrderValues((values) => ({ ...values, [assignment.customerId]: event.target.value }))}
                        value={routeOrderValues[assignment.customerId] ?? String(assignment.sortOrder)}
                      />
                    </td>
                    <td className="px-4 py-3 font-semibold">{assignment.customer?.name ?? assignment.customerId}</td>
                    <td className="px-4 py-3">{formatManagerMoney(assignment.customer?.currentBalance ?? 0)}</td>
                    <td className="px-4 py-3 text-right">
                      <PermissionButton disabled={removeCustomerMutation.isPending} onClick={() => removeCustomerMutation.mutate({ routeId, customerId: assignment.customerId })} permission="routes.manage" variant="secondary">
                        Quitar
                      </PermissionButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-end">
            <PermissionButton disabled={routeCustomers.length === 0 || reorderCustomersMutation.isPending} onClick={saveRouteOrder} permission="routes.manage" variant="secondary">
              Guardar orden
            </PermissionButton>
          </div>
        </article>

        <article className={`${activeTab === "orders" ? "rounded-md border border-tp-border bg-white p-5" : "hidden"}`}>
          <h2 className="mb-4 text-sm font-semibold">Nuevo pedido</h2>
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_140px_auto]">
            <select className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setCustomerId(event.target.value)} value={customerId}>
              <option value="">Cliente</option>
              {routeCustomers.map((assignment) => <option key={assignment.customerId} value={assignment.customerId}>{assignment.customer?.name ?? assignment.customerId}</option>)}
            </select>
            <select className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setProductId(event.target.value)} value={productId}>
              <option value="">Producto</option>
              {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
            </select>
            <input className="h-11 rounded-md border border-tp-border px-3 text-sm" inputMode="decimal" onChange={(event) => setQuantity(event.target.value)} value={quantity} />
            <PermissionButton disabled={!productId || Number(quantity) <= 0} onClick={addOrderItem} permission="routes.manage" variant="secondary">
              Agregar
            </PermissionButton>
          </div>
          <div className="mt-4 space-y-2">
            {orderItems.map((item, index) => {
              const product = products.find((candidate) => candidate.id === item.productId);
              return (
                <div className="flex items-center justify-between rounded-md border border-tp-border px-3 py-2 text-sm" key={`${item.productId}-${index}`}>
                  <span>{product?.name ?? item.productId} - {item.quantity}</span>
                  <button className="font-semibold text-tp-danger" onClick={() => removeOrderItem(index)} type="button">
                    Quitar
                  </button>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex justify-end">
            <PermissionButton disabled={!customerId || orderItems.length === 0 || createOrderMutation.isPending} onClick={createOrder} permission="routes.manage">
              <Truck className="h-4 w-4" aria-hidden="true" />
              Crear
            </PermissionButton>
          </div>
        </article>

        <article className={`${activeTab === "orders" ? "rounded-md border border-tp-border bg-white p-5" : "hidden"}`}>
          <h2 className="mb-4 text-sm font-semibold">Pedidos de la ruta</h2>
          <div className="space-y-3">
            {orders.length === 0 ? (
              <p className="text-sm text-tp-muted">Sin pedidos registrados.</p>
            ) : (
              orders.map((order) => (
                <button
                  className="flex w-full items-center justify-between gap-3 rounded-md border border-tp-border px-3 py-3 text-left text-sm hover:bg-tp-soft"
                  key={order.id}
                  onClick={() => {
                    setPaymentOrderId(order.id);
                    setActiveTab("payments");
                  }}
                  type="button"
                >
                  <span>
                    <span className="block font-semibold">{order.customerName ?? order.customerId}</span>
                    <span className="text-xs text-tp-muted">{labelStatus(order.status)}</span>
                  </span>
                  <span className="text-right">
                    <span className="block font-semibold">{formatManagerMoney(order.total)}</span>
                    <span className="text-xs text-tp-muted">Pendiente {formatManagerMoney(order.amountPending)}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </article>

        <article className={`${activeTab === "payments" ? "rounded-md border border-tp-border bg-white p-5 xl:col-span-2" : "hidden"}`}>
          <h2 className="mb-4 text-sm font-semibold">Cobro en ruta</h2>
          {selectedPaymentOrder ? (
            <div className="mb-4 grid gap-3 rounded-md border border-tp-border bg-tp-soft p-3 text-sm md:grid-cols-5">
              <div>
                <p className="text-xs uppercase text-tp-muted">Cliente</p>
                <p className="font-semibold">{selectedPaymentOrder.customerName ?? selectedPaymentOrder.customerId}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-tp-muted">Saldo actual</p>
                <p className="font-semibold">{formatManagerMoney(selectedPaymentCustomer?.currentBalance ?? 0)}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-tp-muted">Limite</p>
                <p className="font-semibold">{formatManagerMoney(selectedPaymentCustomer?.creditLimit ?? 0)}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-tp-muted">Disponible</p>
                <p className="font-semibold">{formatManagerMoney(selectedCreditAvailable)}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-tp-muted">Pendiente pedido</p>
                <p className="font-semibold">{formatManagerMoney(selectedPaymentOrder.amountPending)}</p>
              </div>
            </div>
          ) : null}
          <div className="grid gap-3 md:grid-cols-[1fr_120px_130px_1fr_auto]">
            <select className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setPaymentOrderId(event.target.value)} value={paymentOrderId}>
              <option value="">Pedido</option>
              {orders.map((order) => <option key={order.id} value={order.id}>{order.customerName ?? order.customerId} - {formatManagerMoney(order.amountPending)}</option>)}
            </select>
            <input className="h-11 rounded-md border border-tp-border px-3 text-sm" inputMode="decimal" onChange={(event) => setPaymentAmount(event.target.value)} placeholder="Monto" value={paymentAmount} />
            <select className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setPaymentMethod(event.target.value as typeof paymentMethod)} value={paymentMethod}>
              <option value="cash">Efectivo</option>
              <option value="card">Tarjeta</option>
              <option value="transfer">Transferencia</option>
              <option value="credit">Credito</option>
            </select>
            <input className="h-11 rounded-md border border-tp-border px-3 text-sm" disabled={paymentMethod === "cash" || paymentMethod === "credit"} onChange={(event) => setPaymentReference(event.target.value)} placeholder="Referencia" value={paymentReference} />
            <PermissionButton disabled={!paymentOrderId || !paymentAmount.trim() || ((paymentMethod === "card" || paymentMethod === "transfer") && !paymentReference.trim()) || paymentMutation.isPending} onClick={recordPayment} permission="routes.manage">
              <CreditCard className="h-4 w-4" aria-hidden="true" />
              Cobrar
            </PermissionButton>
          </div>
          {paymentMethod === "credit" ? (
            <input autoComplete="one-time-code" className="mt-3 h-11 w-full rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setAuthorizationPin(event.target.value)} placeholder="PIN si excede limite" type="password" value={authorizationPin} />
          ) : null}
        </article>
      </div>

      <div className={`${activeTab === "delivery" ? "mb-5 overflow-x-auto rounded-md border border-tp-border bg-white" : "hidden"}`}>
        <table className="w-full text-left text-sm">
          <thead className="bg-tp-soft text-xs uppercase text-tp-muted">
            <tr>
              <th className="px-4 py-3">Pedido</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Pendiente</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Que hacer</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr className="border-t border-tp-border" key={order.id}>
                <td className="px-4 py-3 font-semibold">{order.id}</td>
                <td className="px-4 py-3">{order.customerName ?? order.customerId}</td>
                <td className="px-4 py-3">{formatManagerMoney(order.total)}</td>
                <td className="px-4 py-3">{formatManagerMoney(order.amountPending)}</td>
                <td className="px-4 py-3"><StatusBadge tone={order.status === "paid" || order.status === "delivered" ? "success" : "warning"}>{labelStatus(order.status)}</StatusBadge></td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <PermissionButton disabled={order.status !== "pending" || actionMutation.isPending} onClick={() => act(order.id, "prepare")} permission="routes.manage" variant="secondary">Preparar</PermissionButton>
                    <PermissionButton disabled={order.status !== "prepared" || actionMutation.isPending} onClick={() => act(order.id, "load")} permission="routes.manage" variant="secondary">Cargar</PermissionButton>
                    <PermissionButton disabled={order.status !== "loaded" || actionMutation.isPending} onClick={() => act(order.id, "in-route")} permission="routes.manage" variant="secondary">En ruta</PermissionButton>
                    {order.status === "in_route" ? (
                      <div className="basis-full space-y-2">
                        {order.items.map((item) => (
                          <label className="grid gap-1 text-xs text-tp-muted md:grid-cols-[1fr_100px]" key={item.id}>
                            <span>{item.productName}: cargado {item.quantityLoaded}</span>
                            <input
                              className="h-9 rounded-md border border-tp-border px-2 text-sm text-tp-text"
                              inputMode="decimal"
                              onChange={(event) => setDeliveryQuantities((values) => ({ ...values, [item.id]: event.target.value }))}
                              value={deliveryQuantities[item.id] ?? item.quantityLoaded.toFixed(3)}
                            />
                          </label>
                        ))}
                      </div>
                    ) : null}
                    <PermissionButton disabled={order.status !== "in_route" || deliverMutation.isPending} onClick={() => deliver(order)} permission="routes.manage" variant="secondary">Entregar</PermissionButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <article className={`${activeTab === "settlement" ? "rounded-md border border-tp-border bg-white p-5" : "hidden"}`}>
        <h2 className="mb-4 text-sm font-semibold">Cierre de ruta</h2>
        <div className="grid gap-3 md:grid-cols-[auto_1fr_160px_auto_auto]">
          <PermissionButton disabled={createSettlementMutation.isPending} onClick={createSettlement} permission="routes.manage" variant="secondary">
            <PackageCheck className="h-4 w-4" aria-hidden="true" />
            Crear
          </PermissionButton>
          <select className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setSettlementId(event.target.value)} value={settlementId}>
            <option value="">Liquidacion</option>
            {settlements.map((settlement) => (
              <option key={settlement.id} value={settlement.id}>
                {settlement.status} - esperado {formatManagerMoney(settlement.expectedCashAmount)}
              </option>
            ))}
          </select>
          <input className="h-11 rounded-md border border-tp-border px-3 text-sm" inputMode="decimal" onChange={(event) => setDeliveredCashAmount(event.target.value)} placeholder="Efectivo" value={deliveredCashAmount} />
          <PermissionButton
            disabled={!settlementId || selectedSettlement?.status !== "open" || !deliveredCashAmount || closeSettlementMutation.isPending}
            onClick={() => closeSettlementMutation.mutate({ settlementId, deliveredCashAmount })}
            permission="routes.manage"
            variant="secondary"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Cerrar
          </PermissionButton>
          <PermissionButton
            disabled={!settlementId || selectedSettlement?.status !== "closed" || Boolean(selectedSettlement?.cashSessionId) || depositMutation.isPending}
            onClick={() => depositMutation.mutate(settlementId)}
            permission="routes.manage"
          >
            Depositar
          </PermissionButton>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-tp-soft text-xs uppercase text-tp-muted">
              <tr>
                <th className="px-4 py-3">Liquidacion</th>
                <th className="px-4 py-3">Esperado</th>
                <th className="px-4 py-3">Entregado</th>
                <th className="px-4 py-3">Diferencia</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Caja</th>
              </tr>
            </thead>
            <tbody>
              {settlements.map((settlement) => (
                <tr className="border-t border-tp-border" key={settlement.id}>
                  <td className="px-4 py-3 font-semibold">{settlement.id}</td>
                  <td className="px-4 py-3">{formatManagerMoney(settlement.expectedCashAmount)}</td>
                  <td className="px-4 py-3">{formatManagerMoney(settlement.deliveredCashAmount)}</td>
                  <td className="px-4 py-3">{formatManagerMoney(settlement.differenceAmount)}</td>
                  <td className="px-4 py-3"><StatusBadge tone={settlement.status === "closed" ? "success" : "warning"}>{labelStatus(settlement.status)}</StatusBadge></td>
                  <td className="px-4 py-3">{settlement.cashSessionId ? "Depositada" : "Pendiente"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
