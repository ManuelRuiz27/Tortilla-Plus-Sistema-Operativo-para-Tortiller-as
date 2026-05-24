import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeDollarSign, Plus } from "lucide-react";
import { useState } from "react";
import { managerPricesRequest, managerProductsRequest, setManagerPriceRequest } from "../../../api/manager.api";
import { LoadingState } from "../../../shared/components/loading-state";
import { PermissionButton } from "../../../shared/components/permission-button";
import { StatusBadge } from "../../../shared/components/status-badge";
import { useBranchStore } from "../../../shared/stores/branch.store";
import { labelSaleMode, labelStatus } from "../../../shared/utils/labels";
import type { ManagerPrice } from "../types/manager.types";
import { formatManagerMoney } from "../utils/money";

const saleModes: Array<ManagerPrice["saleMode"]> = ["by_kg", "by_amount", "by_package", "by_unit"];

export function PricesPage() {
  const queryClient = useQueryClient();
  const branchId = useBranchStore((state) => state.activeBranchId);
  const [productId, setProductId] = useState("");
  const [saleMode, setSaleMode] = useState<ManagerPrice["saleMode"]>("by_unit");
  const [price, setPrice] = useState("");
  const pricesQuery = useQuery({
    enabled: Boolean(branchId),
    queryFn: () => managerPricesRequest(branchId ?? ""),
    queryKey: ["manager-prices", branchId]
  });
  const productsQuery = useQuery({
    queryFn: managerProductsRequest,
    queryKey: ["manager-products"]
  });
  const priceMutation = useMutation({
    mutationFn: setManagerPriceRequest,
    onSuccess: () => {
      setPrice("");
      void queryClient.invalidateQueries({ queryKey: ["manager-prices", branchId] });
      void queryClient.invalidateQueries({ queryKey: ["pos-products", branchId] });
    }
  });

  if (pricesQuery.isLoading || productsQuery.isLoading) return <LoadingState message="Cargando precios..." />;
  if (pricesQuery.isError || productsQuery.isError) return <p className="rounded-md border border-tp-border bg-white p-5 text-sm text-tp-danger">No se pudieron cargar precios.</p>;

  const prices = pricesQuery.data ?? [];
  const products = (productsQuery.data ?? []).filter((product) => product.isSellable && product.status === "active");

  function submitPrice() {
    if (!branchId || !productId || !price.trim()) return;
    priceMutation.mutate({ branchId, productId, saleMode, price: price.trim() });
  }

  return (
    <section>
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-tp-primary">Precios</p>
        <h1 className="mt-3 text-2xl font-semibold">Precios de venta</h1>
        <p className="mt-2 text-sm text-tp-muted">Guarda el precio que se usara en la sucursal seleccionada.</p>
      </div>

      <div className="mb-5 grid gap-3 rounded-md border border-tp-border bg-white p-4 md:grid-cols-[1fr_170px_160px_auto]">
        <select className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setProductId(event.target.value)} value={productId}>
          <option value="">Producto</option>
          {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
        </select>
        <select className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setSaleMode(event.target.value as ManagerPrice["saleMode"])} value={saleMode}>
          {saleModes.map((mode) => <option key={mode} value={mode}>{labelSaleMode(mode)}</option>)}
        </select>
        <input className="h-11 rounded-md border border-tp-border px-3 text-sm" inputMode="decimal" onChange={(event) => setPrice(event.target.value)} placeholder="Precio" value={price} />
        <PermissionButton disabled={!branchId || !productId || !price.trim() || priceMutation.isPending} onClick={submitPrice} permission="prices.manage">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Guardar precio
        </PermissionButton>
      </div>

      <div className="overflow-x-auto rounded-md border border-tp-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-tp-soft text-xs uppercase text-tp-muted">
            <tr>
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3">Se vende</th>
              <th className="px-4 py-3">Precio</th>
              <th className="px-4 py-3">Desde</th>
              <th className="px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {prices.map((item) => (
              <tr className="border-t border-tp-border" key={`${item.productId}-${item.saleMode}`}>
                <td className="px-4 py-3 font-semibold">{item.productName}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-2">
                    <BadgeDollarSign className="h-4 w-4 text-tp-secondary" aria-hidden="true" />
                    {labelSaleMode(item.saleMode)}
                  </span>
                </td>
                <td className="px-4 py-3">{formatManagerMoney(item.price)}</td>
                <td className="px-4 py-3">{item.effectiveFrom}</td>
                <td className="px-4 py-3">
                  <StatusBadge tone={item.status === "active" ? "success" : "warning"}>{labelStatus(item.status)}</StatusBadge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
