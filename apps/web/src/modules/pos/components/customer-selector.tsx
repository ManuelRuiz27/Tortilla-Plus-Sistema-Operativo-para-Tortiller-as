import { useQuery } from "@tanstack/react-query";
import { Search, UserRound, X } from "lucide-react";
import { useMemo, useState } from "react";
import { managerCustomersRequest } from "../../../api/manager.api";
import { Button } from "../../../shared/components/button";
import type { PosSelectedCustomer } from "../types/pos.types";
import { formatMoney } from "../utils/money";

type CustomerSelectorProps = {
  selectedCustomer: PosSelectedCustomer | null;
  onSelect: (customer: PosSelectedCustomer) => void;
  onClear: () => void;
};

export function CustomerSelector({ selectedCustomer, onSelect, onClear }: CustomerSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const customersQuery = useQuery({
    queryFn: managerCustomersRequest,
    queryKey: ["manager-customers"]
  });
  const customers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return (customersQuery.data ?? [])
      .filter((customer) => customer.status === "active")
      .filter((customer) => {
        if (!term) return false;
        return [customer.name, customer.phone, customer.email].some((value) => value?.toLowerCase().includes(term));
      })
      .slice(0, 6);
  }, [customersQuery.data, searchTerm]);

  const availableCredit = selectedCustomer
    ? Math.max(0, selectedCustomer.creditLimit - selectedCustomer.currentBalance)
    : 0;

  return (
    <div className="rounded-md border border-tp-border bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Cliente</p>
          <p className="mt-1 text-xs text-tp-muted">
            {selectedCustomer ? selectedCustomer.name : "Publico general"}
          </p>
        </div>
        {selectedCustomer ? (
          <Button onClick={onClear} variant="ghost">
            <X className="h-4 w-4" aria-hidden="true" />
            Quitar
          </Button>
        ) : null}
      </div>

      {selectedCustomer ? (
        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase text-tp-muted">Saldo</p>
            <p className="font-semibold">{formatMoney(selectedCustomer.currentBalance)}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-tp-muted">Limite</p>
            <p className="font-semibold">{formatMoney(selectedCustomer.creditLimit)}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-tp-muted">Disponible</p>
            <p className="font-semibold">{selectedCustomer.creditEnabled ? formatMoney(availableCredit) : "Sin credito"}</p>
          </div>
        </div>
      ) : (
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-tp-muted" aria-hidden="true" />
          <input
            className="h-11 w-full rounded-md border border-tp-border pl-10 pr-3 text-sm outline-none focus:border-tp-primary"
            disabled={customersQuery.isError}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={customersQuery.isError ? "Clientes no disponibles" : "Buscar cliente por nombre o telefono"}
            value={searchTerm}
          />
          {customers.length > 0 ? (
            <div className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-md border border-tp-border bg-white shadow-lg">
              {customers.map((customer) => (
                <button
                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-tp-soft"
                  key={customer.id}
                  onClick={() => {
                    onSelect(customer);
                    setSearchTerm("");
                  }}
                  type="button"
                >
                  <UserRound className="h-4 w-4 text-tp-secondary" aria-hidden="true" />
                  <span>
                    <span className="block font-semibold">{customer.name}</span>
                    <span className="block text-xs text-tp-muted">{customer.phone ?? "Sin telefono"}</span>
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
