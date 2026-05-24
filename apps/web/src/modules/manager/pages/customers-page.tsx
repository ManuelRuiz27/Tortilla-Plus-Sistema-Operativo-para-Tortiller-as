import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import {
  assignCustomerToRouteRequest,
  createCustomerRequest,
  deliveryRoutesRequest,
  managerCustomersRequest,
  recordCustomerPaymentRequest
} from "../../../api/manager.api";
import { LoadingState } from "../../../shared/components/loading-state";
import { PermissionButton } from "../../../shared/components/permission-button";
import { StatusBadge } from "../../../shared/components/status-badge";
import { useBranchStore } from "../../../shared/stores/branch.store";
import { labelStatus } from "../../../shared/utils/labels";
import type { ManagerCustomer } from "../types/manager.types";
import { formatManagerMoney } from "../utils/money";

const customerTypeLabels: Record<ManagerCustomer["customerType"], string> = {
  tienda: "Tienda",
  puesto: "Puesto",
  comedor: "Comedor",
  repartidor: "Repartidor",
  cliente_frecuente: "Frecuente",
  empresa: "Empresa",
  otro: "Otro"
};

export function CustomersPage() {
  const queryClient = useQueryClient();
  const branchId = useBranchStore((state) => state.activeBranchId);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [customerType, setCustomerType] = useState<ManagerCustomer["customerType"]>("cliente_frecuente");
  const [creditEnabled, setCreditEnabled] = useState(false);
  const [creditLimit, setCreditLimit] = useState("0.00");
  const [routeByCustomer, setRouteByCustomer] = useState<Record<string, string>>({});
  const [sortByCustomer, setSortByCustomer] = useState<Record<string, string>>({});
  const [paymentCustomerId, setPaymentCustomerId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "transfer">("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const { data = [], isError, isLoading } = useQuery({
    queryFn: managerCustomersRequest,
    queryKey: ["manager-customers"]
  });
  const routesQuery = useQuery({
    enabled: Boolean(branchId),
    queryFn: () => deliveryRoutesRequest(branchId ?? ""),
    queryKey: ["delivery-routes", branchId]
  });
  const createMutation = useMutation({
    mutationFn: createCustomerRequest,
    onSuccess: () => {
      setName("");
      setPhone("");
      setCreditEnabled(false);
      setCreditLimit("0.00");
      void queryClient.invalidateQueries({ queryKey: ["manager-customers"] });
    }
  });
  const assignRouteMutation = useMutation({
    mutationFn: assignCustomerToRouteRequest,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["delivery-routes", branchId] })
  });
  const paymentMutation = useMutation({
    mutationFn: recordCustomerPaymentRequest,
    onSuccess: () => {
      const customerId = paymentCustomerId;
      setPaymentCustomerId("");
      setPaymentAmount("");
      setPaymentReference("");
      void queryClient.invalidateQueries({ queryKey: ["manager-customers"] });
      if (customerId) {
        void queryClient.invalidateQueries({ queryKey: ["customer-balance", customerId] });
      }
    }
  });

  function submitCustomer() {
    if (!name.trim()) return;

    createMutation.mutate({
      name: name.trim(),
      phone: phone.trim() || undefined,
      customerType,
      creditEnabled,
      creditLimit
    });
  }

  if (isLoading || routesQuery.isLoading) return <LoadingState message="Cargando clientes..." />;
  if (isError || routesQuery.isError) return <p className="rounded-md border border-tp-border bg-white p-5 text-sm text-tp-danger">No se pudieron cargar clientes.</p>;

  const creditTotal = data.reduce((sum, customer) => sum + customer.currentBalance, 0);
  const routes = routesQuery.data ?? [];

  function assignToRoute(customerId: string) {
    const routeId = routeByCustomer[customerId];
    if (!routeId) return;
    assignRouteMutation.mutate({
      routeId,
      customerId,
      sortOrder: Number(sortByCustomer[customerId] || 0)
    });
  }

  function startPayment(customer: ManagerCustomer) {
    setPaymentCustomerId(customer.id);
    setPaymentAmount(customer.currentBalance > 0 ? customer.currentBalance.toFixed(2) : "");
    setPaymentMethod("cash");
    setPaymentReference("");
  }

  function recordPayment() {
    if (!branchId || !paymentCustomerId || !paymentAmount.trim()) return;
    paymentMutation.mutate({
      customerId: paymentCustomerId,
      branchId,
      amount: paymentAmount,
      paymentMethod,
      reference: paymentReference.trim() || undefined
    });
  }

  const paymentCustomer = data.find((customer) => customer.id === paymentCustomerId) ?? null;

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-tp-primary">Clientes</p>
          <h1 className="mt-3 text-2xl font-semibold">Clientes frecuentes</h1>
          <p className="mt-2 text-sm text-tp-muted">Guarda contactos, credito y saldos pendientes.</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase text-tp-muted">Saldo abierto</p>
          <p className="text-xl font-semibold">{formatManagerMoney(creditTotal)}</p>
        </div>
      </div>

      <div className="mb-5 grid gap-3 rounded-md border border-tp-border bg-white p-4 lg:grid-cols-[1.4fr_150px_150px_120px_auto]">
        <input className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setName(event.target.value)} placeholder="Nombre del cliente" value={name} />
        <input className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setPhone(event.target.value)} placeholder="Telefono" value={phone} />
        <select className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setCustomerType(event.target.value as ManagerCustomer["customerType"])} value={customerType}>
          {Object.entries(customerTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <input className="h-11 rounded-md border border-tp-border px-3 text-sm" disabled={!creditEnabled} inputMode="decimal" onChange={(event) => setCreditLimit(event.target.value)} value={creditLimit} />
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-tp-muted">
            <input checked={creditEnabled} onChange={(event) => setCreditEnabled(event.target.checked)} type="checkbox" />
            Credito
          </label>
          <PermissionButton disabled={!name.trim() || createMutation.isPending} onClick={submitCustomer} permission="customers.manage">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Agregar
          </PermissionButton>
        </div>
      </div>

      {paymentCustomer ? (
        <div className="mb-5 rounded-md border border-tp-border bg-white p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Cobrar saldo</p>
              <p className="text-sm text-tp-muted">{paymentCustomer.name} - saldo {formatManagerMoney(paymentCustomer.currentBalance)}</p>
            </div>
            <button className="text-sm font-semibold text-tp-muted hover:text-tp-text" onClick={() => setPaymentCustomerId("")} type="button">
              Cancelar
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_160px_1fr_auto]">
            <input className="h-11 rounded-md border border-tp-border px-3 text-sm" inputMode="decimal" onChange={(event) => setPaymentAmount(event.target.value)} placeholder="Monto" value={paymentAmount} />
            <select className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setPaymentMethod(event.target.value as typeof paymentMethod)} value={paymentMethod}>
              <option value="cash">Efectivo</option>
              <option value="card">Tarjeta</option>
              <option value="transfer">Transferencia</option>
            </select>
            <input className="h-11 rounded-md border border-tp-border px-3 text-sm" disabled={paymentMethod === "cash"} onChange={(event) => setPaymentReference(event.target.value)} placeholder="Referencia" value={paymentReference} />
            <PermissionButton
              disabled={!branchId || !paymentAmount.trim() || ((paymentMethod === "card" || paymentMethod === "transfer") && !paymentReference.trim()) || paymentMutation.isPending}
              onClick={recordPayment}
              permission="payments.create"
            >
              <CreditCard className="h-4 w-4" aria-hidden="true" />
              Cobrar
            </PermissionButton>
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-md border border-tp-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-tp-soft text-xs uppercase text-tp-muted">
            <tr>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Contacto</th>
              <th className="px-4 py-3">Credito</th>
              <th className="px-4 py-3">Saldo</th>
              <th className="px-4 py-3">Ruta</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {data.map((customer) => (
              <tr className="border-t border-tp-border" key={customer.id}>
                <td className="px-4 py-3">
                  <p className="font-semibold">{customer.name}</p>
                  <p className="text-xs text-tp-muted">{customer.taxId ?? "Sin RFC"}</p>
                </td>
                <td className="px-4 py-3">{customerTypeLabels[customer.customerType]}</td>
                <td className="px-4 py-3">{customer.phone ?? customer.email ?? "-"}</td>
                <td className="px-4 py-3">{customer.creditEnabled ? formatManagerMoney(customer.creditLimit) : "Sin credito"}</td>
                <td className="px-4 py-3 font-semibold">{formatManagerMoney(customer.currentBalance)}</td>
                <td className="px-4 py-3">
                  <div className="grid min-w-72 grid-cols-[1fr_70px_auto] gap-2">
                    <select className="h-10 rounded-md border border-tp-border px-2 text-sm" onChange={(event) => setRouteByCustomer((values) => ({ ...values, [customer.id]: event.target.value }))} value={routeByCustomer[customer.id] ?? ""}>
                      <option value="">Ruta</option>
                      {routes.map((route) => <option key={route.id} value={route.id}>{route.name}</option>)}
                    </select>
                    <input className="h-10 rounded-md border border-tp-border px-2 text-sm" inputMode="numeric" onChange={(event) => setSortByCustomer((values) => ({ ...values, [customer.id]: event.target.value }))} placeholder="#" value={sortByCustomer[customer.id] ?? ""} />
                    <PermissionButton disabled={!routeByCustomer[customer.id] || assignRouteMutation.isPending} onClick={() => assignToRoute(customer.id)} permission="routes.manage" variant="secondary">
                      Asignar
                    </PermissionButton>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge tone={customer.status === "active" ? "success" : "warning"}>{labelStatus(customer.status)}</StatusBadge>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-3">
                  <Link className="text-sm font-semibold text-tp-primary hover:underline" to={`/app/pos/sale?customerId=${customer.id}`}>
                    Vender
                  </Link>
                  <PermissionButton
                    className="min-h-0 px-0 py-0 text-tp-primary hover:bg-transparent hover:underline"
                    disabled={!branchId || customer.currentBalance <= 0}
                    onClick={() => startPayment(customer)}
                    permission="payments.create"
                    variant="ghost"
                  >
                    Cobrar
                  </PermissionButton>
                  <Link className="text-sm font-semibold text-tp-primary hover:underline" to={`/app/manager/customers/${customer.id}`}>
                    Ver detalle
                  </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
