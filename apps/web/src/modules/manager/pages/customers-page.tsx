import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { createCustomerRequest, managerCustomersRequest } from "../../../api/manager.api";
import { LoadingState } from "../../../shared/components/loading-state";
import { PermissionButton } from "../../../shared/components/permission-button";
import { StatusBadge } from "../../../shared/components/status-badge";
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
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [customerType, setCustomerType] = useState<ManagerCustomer["customerType"]>("cliente_frecuente");
  const [creditEnabled, setCreditEnabled] = useState(false);
  const [creditLimit, setCreditLimit] = useState("0.00");
  const { data = [], isError, isLoading } = useQuery({
    queryFn: managerCustomersRequest,
    queryKey: ["manager-customers"]
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

  if (isLoading) return <LoadingState message="Cargando clientes..." />;
  if (isError) return <p className="rounded-md border border-tp-border bg-white p-5 text-sm text-tp-danger">No se pudieron cargar clientes.</p>;

  const creditTotal = data.reduce((sum, customer) => sum + customer.currentBalance, 0);

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

      <div className="overflow-x-auto rounded-md border border-tp-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-tp-soft text-xs uppercase text-tp-muted">
            <tr>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Contacto</th>
              <th className="px-4 py-3">Credito</th>
              <th className="px-4 py-3">Saldo</th>
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
                  <StatusBadge tone={customer.status === "active" ? "success" : "warning"}>{labelStatus(customer.status)}</StatusBadge>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link className="text-sm font-semibold text-tp-primary hover:underline" to={`/app/manager/customers/${customer.id}`}>
                    Ver detalle
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
