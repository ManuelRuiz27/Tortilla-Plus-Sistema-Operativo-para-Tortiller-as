import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BadgeDollarSign, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  configureCustomerCreditRequest,
  customerBalanceRequest,
  managerCustomersRequest,
  managerProductsRequest,
  setCustomerPriceRequest,
  updateCustomerRequest
} from "../../../api/manager.api";
import { LoadingState } from "../../../shared/components/loading-state";
import { PermissionButton } from "../../../shared/components/permission-button";
import { StatusBadge } from "../../../shared/components/status-badge";
import { useBranchStore } from "../../../shared/stores/branch.store";
import { labelMovement, labelSaleMode, labelStatus } from "../../../shared/utils/labels";
import type { ManagerCustomer, ManagerPrice } from "../types/manager.types";
import { formatManagerMoney } from "../utils/money";

const customerTypes: Array<ManagerCustomer["customerType"]> = ["tienda", "puesto", "comedor", "repartidor", "cliente_frecuente", "empresa", "otro"];
const saleModes: Array<ManagerPrice["saleMode"]> = ["by_kg", "by_amount", "by_package", "by_unit"];

export function CustomerDetailPage() {
  const { customerId = "" } = useParams();
  const branchId = useBranchStore((state) => state.activeBranchId);
  const queryClient = useQueryClient();
  const customersQuery = useQuery({
    queryFn: managerCustomersRequest,
    queryKey: ["manager-customers"]
  });
  const balanceQuery = useQuery({
    enabled: Boolean(customerId),
    queryFn: () => customerBalanceRequest(customerId),
    queryKey: ["customer-balance", customerId]
  });
  const productsQuery = useQuery({
    queryFn: managerProductsRequest,
    queryKey: ["manager-products"]
  });
  const customer = useMemo(
    () => customersQuery.data?.find((item) => item.id === customerId) ?? null,
    [customerId, customersQuery.data]
  );
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [taxId, setTaxId] = useState("");
  const [notes, setNotes] = useState("");
  const [customerType, setCustomerType] = useState<ManagerCustomer["customerType"]>("cliente_frecuente");
  const [status, setStatus] = useState<ManagerCustomer["status"]>("active");
  const [creditEnabled, setCreditEnabled] = useState(false);
  const [creditLimit, setCreditLimit] = useState("0.00");
  const [productId, setProductId] = useState("");
  const [saleMode, setSaleMode] = useState<ManagerPrice["saleMode"]>("by_unit");
  const [price, setPrice] = useState("");

  useEffect(() => {
    if (!customer) return;
    setName(customer.name);
    setPhone(customer.phone ?? "");
    setEmail(customer.email ?? "");
    setTaxId(customer.taxId ?? "");
    setNotes(customer.notes ?? "");
    setCustomerType(customer.customerType);
    setStatus(customer.status);
    setCreditEnabled(customer.creditEnabled);
    setCreditLimit(customer.creditLimit.toFixed(2));
  }, [customer]);

  const updateMutation = useMutation({
    mutationFn: updateCustomerRequest,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["manager-customers"] })
  });
  const creditMutation = useMutation({
    mutationFn: configureCustomerCreditRequest,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["manager-customers"] })
  });
  const priceMutation = useMutation({
    mutationFn: setCustomerPriceRequest,
    onSuccess: () => setPrice("")
  });

  function saveCustomer() {
    if (!customerId || !name.trim()) return;
    updateMutation.mutate({
      id: customerId,
      name: name.trim(),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      taxId: taxId.trim() || undefined,
      notes: notes.trim() || undefined,
      customerType,
      status
    });
  }

  function saveCredit() {
    if (!customerId) return;
    creditMutation.mutate({ customerId, creditEnabled, creditLimit });
  }

  function savePrice() {
    if (!customerId || !productId || !price.trim()) return;
    priceMutation.mutate({ customerId, branchId: branchId ?? undefined, productId, saleMode, price: price.trim() });
  }

  if (customersQuery.isLoading || balanceQuery.isLoading || productsQuery.isLoading) {
    return <LoadingState message="Cargando cliente..." />;
  }

  if (customersQuery.isError || balanceQuery.isError || productsQuery.isError || !customer) {
    return <p className="rounded-md border border-tp-border bg-white p-5 text-sm text-tp-danger">No se pudo cargar el cliente.</p>;
  }

  const balance = balanceQuery.data;
  const products = (productsQuery.data ?? []).filter((product) => product.isSellable && product.status === "active");

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link className="inline-flex items-center gap-2 text-sm font-semibold text-tp-primary" to="/app/manager/customers">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Clientes
          </Link>
          <h1 className="mt-3 text-2xl font-semibold">{customer.name}</h1>
          <p className="mt-2 text-sm text-tp-muted">Datos, credito, saldo y precios especiales.</p>
        </div>
        <StatusBadge tone={customer.status === "active" ? "success" : "warning"}>{labelStatus(customer.status)}</StatusBadge>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-md border border-tp-border bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold">Datos del cliente</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <input className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setName(event.target.value)} value={name} />
            <select className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setCustomerType(event.target.value as ManagerCustomer["customerType"])} value={customerType}>
              {customerTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
            <input className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setPhone(event.target.value)} placeholder="Telefono" value={phone} />
            <input className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setEmail(event.target.value)} placeholder="Email" value={email} />
            <input className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setTaxId(event.target.value)} placeholder="RFC" value={taxId} />
            <select className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setStatus(event.target.value as ManagerCustomer["status"])} value={status}>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
              <option value="deleted">Eliminado</option>
            </select>
          </div>
          <textarea className="mt-3 min-h-24 w-full rounded-md border border-tp-border px-3 py-2 text-sm" onChange={(event) => setNotes(event.target.value)} placeholder="Notas operativas" value={notes} />
          <div className="mt-4 flex justify-end">
            <PermissionButton disabled={!name.trim() || updateMutation.isPending} onClick={saveCustomer} permission="customers.manage">
              <Save className="h-4 w-4" aria-hidden="true" />
              Guardar cliente
            </PermissionButton>
          </div>
        </article>

        <article className="rounded-md border border-tp-border bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold">Credito y saldo</h2>
          <div className="mb-5 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs uppercase text-tp-muted">Saldo actual</p>
              <p className="mt-1 text-2xl font-semibold">{formatManagerMoney(balance?.currentBalance ?? customer.currentBalance)}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-tp-muted">Limite</p>
              <p className="mt-1 text-2xl font-semibold">{formatManagerMoney(Number(creditLimit || 0))}</p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_160px_auto]">
            <label className="flex h-11 items-center gap-2 rounded-md border border-tp-border px-3 text-sm text-tp-muted">
              <input checked={creditEnabled} onChange={(event) => setCreditEnabled(event.target.checked)} type="checkbox" />
              Permitir credito
            </label>
            <input className="h-11 rounded-md border border-tp-border px-3 text-sm" disabled={!creditEnabled} inputMode="decimal" onChange={(event) => setCreditLimit(event.target.value)} value={creditLimit} />
            <PermissionButton disabled={creditMutation.isPending} onClick={saveCredit} permission="customers.manage" variant="secondary">Guardar credito</PermissionButton>
          </div>
        </article>

        <article className="rounded-md border border-tp-border bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold">Precio especial</h2>
          <div className="grid gap-3 md:grid-cols-[1fr_160px_140px_auto]">
            <select className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setProductId(event.target.value)} value={productId}>
              <option value="">Producto</option>
              {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
            </select>
            <select className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setSaleMode(event.target.value as ManagerPrice["saleMode"])} value={saleMode}>
              {saleModes.map((mode) => <option key={mode} value={mode}>{labelSaleMode(mode)}</option>)}
            </select>
            <input className="h-11 rounded-md border border-tp-border px-3 text-sm" inputMode="decimal" onChange={(event) => setPrice(event.target.value)} placeholder="Precio" value={price} />
            <PermissionButton disabled={!productId || !price.trim() || priceMutation.isPending} onClick={savePrice} permission="customers.manage">
              <BadgeDollarSign className="h-4 w-4" aria-hidden="true" />
              Guardar
            </PermissionButton>
          </div>
        </article>

        <article className="rounded-md border border-tp-border bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold">Movimientos de saldo</h2>
          <div className="space-y-3">
            {(balance?.movements ?? []).length === 0 ? (
              <p className="text-sm text-tp-muted">Sin movimientos de saldo.</p>
            ) : (
              balance?.movements.map((movement) => (
                <div className="flex items-center justify-between border-t border-tp-border pt-3 first:border-t-0 first:pt-0" key={movement.id}>
                  <div>
                    <p className="font-semibold">{labelMovement(movement.movementType)}</p>
                    <p className="text-xs text-tp-muted">{movement.createdAt}</p>
                  </div>
                  <p className="text-sm font-semibold">{formatManagerMoney(movement.amount)}</p>
                </div>
              ))
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
