import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { createWasteRecordRequest, inventoryAdjustmentRequest, inventoryRequest } from "../../../api/manager.api";
import { LoadingState } from "../../../shared/components/loading-state";
import { PermissionButton } from "../../../shared/components/permission-button";
import { StatusBadge } from "../../../shared/components/status-badge";
import { useBranchStore } from "../../../shared/stores/branch.store";

const statusTone = {
  ok: "success",
  low: "warning",
  negative: "danger",
  out: "danger"
} as const;

const wasteReasons = [
  { value: "tortilla_rota", label: "Tortilla rota" },
  { value: "masa_echada_a_perder", label: "Masa echada a perder" },
  { value: "producto_vencido", label: "Producto vencido" },
  { value: "devolucion_no_revendible", label: "Devolucion no revendible" },
  { value: "otro", label: "Otro" }
] as const;

type WasteReason = (typeof wasteReasons)[number]["value"];

export function InventoryPage() {
  const queryClient = useQueryClient();
  const branchId = useBranchStore((state) => state.activeBranchId);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState("1.000");
  const [reason, setReason] = useState("Ajuste de conteo");
  const [wasteReason, setWasteReason] = useState<WasteReason>("otro");
  const { data = [], isError, isLoading } = useQuery({
    enabled: Boolean(branchId),
    queryFn: () => inventoryRequest(branchId ?? ""),
    queryKey: ["inventory", branchId]
  });
  const selectedProduct = useMemo(() => data.find((item) => item.productId === selectedProductId), [data, selectedProductId]);
  const adjustmentMutation = useMutation({
    mutationFn: inventoryAdjustmentRequest,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["inventory", branchId] })
  });
  const wasteMutation = useMutation({
    mutationFn: createWasteRecordRequest,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["inventory", branchId] })
  });

  function submitAdjustment(direction: "in" | "out") {
    if (!branchId || !selectedProductId || !reason.trim()) {
      return;
    }

    adjustmentMutation.mutate({
      branchId,
      productId: selectedProductId,
      direction,
      quantity,
      reason: reason.trim()
    });
  }

  function submitWaste() {
    if (!branchId || !selectedProductId || Number(quantity) <= 0) {
      return;
    }

    wasteMutation.mutate({
      branchId,
      productId: selectedProductId,
      quantity,
      wasteReason
    });
  }

  if (isLoading) {
    return <LoadingState message="Cargando inventario..." />;
  }

  if (isError) {
    return <p className="rounded-md border border-tp-border bg-white p-5 text-sm text-tp-danger">No se pudo cargar inventario.</p>;
  }

  const isMutating = adjustmentMutation.isPending || wasteMutation.isPending;

  return (
    <section>
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-tp-primary">Inventario</p>
        <h1 className="mt-3 text-2xl font-semibold">Existencias por sucursal</h1>
        <p className="mt-2 text-sm text-tp-muted">Ajustes manuales y registro de merma sobre productos con inventario.</p>
      </div>

      <div className="mb-5 rounded-md border border-tp-border bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_140px_1fr_180px]">
          <select className="h-11 rounded-md border border-tp-border px-3" onChange={(event) => setSelectedProductId(event.target.value)} value={selectedProductId}>
            <option value="">Producto</option>
            {data.map((item) => <option key={item.productId} value={item.productId}>{item.productName}</option>)}
          </select>
          <input className="h-11 rounded-md border border-tp-border px-3" inputMode="decimal" onChange={(event) => setQuantity(event.target.value)} value={quantity} />
          <input className="h-11 rounded-md border border-tp-border px-3" onChange={(event) => setReason(event.target.value)} value={reason} />
          <select className="h-11 rounded-md border border-tp-border px-3" onChange={(event) => setWasteReason(event.target.value as WasteReason)} value={wasteReason}>
            {wasteReasons.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-tp-muted">
            {selectedProduct ? `Unidad: ${selectedProduct.unit}. Stock actual: ${selectedProduct.currentStock}` : "Selecciona producto para aplicar movimiento."}
          </p>
          <div className="flex flex-wrap gap-2">
            <PermissionButton disabled={!selectedProductId || isMutating || Number(quantity) <= 0} onClick={() => submitAdjustment("in")} permission="inventory.manage">Entrada</PermissionButton>
            <PermissionButton disabled={!selectedProductId || isMutating || Number(quantity) <= 0} onClick={() => submitAdjustment("out")} permission="inventory.manage" variant="secondary">Salida</PermissionButton>
            <PermissionButton disabled={!selectedProductId || isMutating || Number(quantity) <= 0} onClick={submitWaste} permission="inventory.manage" variant="danger">
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Merma
            </PermissionButton>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-tp-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-tp-soft text-xs uppercase text-tp-muted">
            <tr>
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Minimo</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Actualizado</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr className="border-t border-tp-border" key={item.productId}>
                <td className="px-4 py-3 font-semibold">{item.productName}</td>
                <td className="px-4 py-3">{item.productType}</td>
                <td className="px-4 py-3">{item.currentStock} {item.unit}</td>
                <td className="px-4 py-3">{item.minimumStock} {item.unit}</td>
                <td className="px-4 py-3"><StatusBadge tone={statusTone[item.status]}>{item.status}</StatusBadge></td>
                <td className="px-4 py-3">{item.updatedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
