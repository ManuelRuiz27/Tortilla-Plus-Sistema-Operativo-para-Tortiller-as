import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownToLine, ArrowUpFromLine, Filter, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import {
  createWasteRecordRequest,
  inventoryAdjustmentRequest,
  inventoryMovementsRequest,
  inventoryRequest
} from "../../../api/manager.api";
import { LoadingState } from "../../../shared/components/loading-state";
import { OperationalAlert } from "../../../shared/components/operational-alert";
import { OperationalCard } from "../../../shared/components/operational-card";
import { OperationalTable, OperationalTableHead, OperationalTableRow } from "../../../shared/components/operational-table";
import { PermissionButton } from "../../../shared/components/permission-button";
import { StatusBadge } from "../../../shared/components/status-badge";
import { WorkspacePageHeader } from "../../../shared/components/workspace-page-header";
import { useBranchStore } from "../../../shared/stores/branch.store";
import { cn } from "../../../shared/utils/cn";
import { labelMovement, labelProductType, labelReferenceType, labelStatus, labelUnit } from "../../../shared/utils/labels";
import type { InventoryItem, InventoryMovement } from "../types/manager.types";

const statusTone = {
  ok: "success",
  low: "warning",
  negative: "danger",
  out: "danger"
} as const;

const movementTone = {
  manual_adjustment_in: "success",
  route_return_in: "success",
  return_in: "success",
  production_in: "success",
  manual_adjustment_out: "warning",
  production_input_out: "warning",
  sale_out: "info",
  route_load_out: "info",
  waste_out: "danger",
  return_waste: "danger"
} as const;

const movementOptions = [
  { value: "", label: "Todos los movimientos" },
  { value: "manual_adjustment_in", label: "Ajuste entrada" },
  { value: "manual_adjustment_out", label: "Ajuste salida" },
  { value: "production_in", label: "Entrada de produccion" },
  { value: "production_input_out", label: "Consumo de insumo" },
  { value: "sale_out", label: "Venta" },
  { value: "route_load_out", label: "Carga de ruta" },
  { value: "route_return_in", label: "Devolucion ruta" },
  { value: "waste_out", label: "Merma" },
  { value: "return_in", label: "Devolucion" },
  { value: "return_waste", label: "Devolucion no vendible" }
] as const;

const referenceOptions = [
  { value: "", label: "Todas las referencias" },
  { value: "manual_adjustment", label: "Ajuste manual" },
  { value: "production_batch", label: "Lote de produccion" },
  { value: "sale_item", label: "Venta" },
  { value: "sale_return_item", label: "Devolucion de venta" },
  { value: "waste_record", label: "Merma" },
  { value: "delivery_order_item", label: "Pedido de ruta" },
  { value: "delivery_return_item", label: "Devolucion de ruta" }
] as const;

const wasteReasons = [
  { value: "tortilla_rota", label: "Tortilla rota" },
  { value: "masa_echada_a_perder", label: "Masa echada a perder" },
  { value: "producto_vencido", label: "Producto vencido" },
  { value: "devolucion_no_revendible", label: "Devolucion no revendible" },
  { value: "otro", label: "Otro" }
] as const;

type WasteReason = (typeof wasteReasons)[number]["value"];

function formatQuantity(value: number) {
  return value.toLocaleString("es-MX", { maximumFractionDigits: 3, minimumFractionDigits: value % 1 === 0 ? 0 : 3 });
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" });
}

function movementSign(movementType: string) {
  return ["manual_adjustment_in", "production_in", "route_return_in", "return_in"].includes(movementType) ? "+" : "-";
}

function movementStatusTone(movementType: string): "success" | "warning" | "danger" | "info" | "neutral" {
  return movementTone[movementType as keyof typeof movementTone] ?? "neutral";
}

function referenceLabel(movement: InventoryMovement) {
  if (!movement.referenceType && !movement.referenceId) return "-";
  if (!movement.referenceId) return labelReferenceType(movement.referenceType);
  return `${labelReferenceType(movement.referenceType)} ${movement.referenceId}`;
}

function StockSummary({ items }: { items: InventoryItem[] }) {
  const low = items.filter((item) => item.status === "low").length;
  const negative = items.filter((item) => item.status === "negative").length;
  const out = items.filter((item) => item.status === "out").length;
  const ok = items.length - low - negative - out;

  return (
    <div className="grid gap-3 md:grid-cols-4">
      <OperationalCard className="p-4">
        <p className="text-xs font-semibold uppercase text-tp-muted">Correctos</p>
        <p className="mt-2 text-2xl font-semibold">{ok}</p>
      </OperationalCard>
      <OperationalCard className="p-4">
        <p className="text-xs font-semibold uppercase text-tp-muted">Bajo minimo</p>
        <p className="mt-2 text-2xl font-semibold text-tp-warning">{low}</p>
      </OperationalCard>
      <OperationalCard className="p-4">
        <p className="text-xs font-semibold uppercase text-tp-muted">Agotados</p>
        <p className="mt-2 text-2xl font-semibold text-tp-danger">{out}</p>
      </OperationalCard>
      <OperationalCard className="p-4">
        <p className="text-xs font-semibold uppercase text-tp-muted">Negativos</p>
        <p className="mt-2 text-2xl font-semibold text-tp-danger">{negative}</p>
      </OperationalCard>
    </div>
  );
}

export function InventoryPage() {
  const queryClient = useQueryClient();
  const branchId = useBranchStore((state) => state.activeBranchId);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState("1.000");
  const [reason, setReason] = useState("Ajuste de conteo");
  const [wasteReason, setWasteReason] = useState<WasteReason>("otro");
  const [movementFilters, setMovementFilters] = useState({
    productId: "",
    movementType: "",
    referenceType: "",
    createdFrom: "",
    createdTo: ""
  });

  const { data = [], isError, isLoading } = useQuery({
    enabled: Boolean(branchId),
    queryFn: () => inventoryRequest(branchId ?? ""),
    queryKey: ["inventory", branchId]
  });
  const movementsQuery = useQuery({
    enabled: Boolean(branchId),
    queryFn: () =>
      inventoryMovementsRequest({
        branchId,
        productId: movementFilters.productId || null,
        movementType: movementFilters.movementType || null,
        referenceType: movementFilters.referenceType || undefined,
        createdFrom: movementFilters.createdFrom ? `${movementFilters.createdFrom}T00:00:00.000Z` : null,
        createdTo: movementFilters.createdTo ? `${movementFilters.createdTo}T23:59:59.999Z` : null,
        limit: 100
      }),
    queryKey: ["inventory-movements", branchId, movementFilters]
  });
  const selectedProduct = useMemo(() => data.find((item) => item.productId === selectedProductId), [data, selectedProductId]);
  const attentionItems = useMemo(() => data.filter((item) => item.status !== "ok"), [data]);
  const adjustmentMutation = useMutation({
    mutationFn: inventoryAdjustmentRequest,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["inventory", branchId] });
      void queryClient.invalidateQueries({ queryKey: ["inventory-movements", branchId] });
    }
  });
  const wasteMutation = useMutation({
    mutationFn: createWasteRecordRequest,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["inventory", branchId] });
      void queryClient.invalidateQueries({ queryKey: ["inventory-movements", branchId] });
    }
  });

  function submitAdjustment(direction: "in" | "out") {
    if (!branchId || !selectedProductId || !reason.trim() || Number(quantity) <= 0) {
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

  function updateMovementFilter(key: keyof typeof movementFilters, value: string) {
    setMovementFilters((current) => ({ ...current, [key]: value }));
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
      <WorkspacePageHeader
        description="Revisa existencias, registra ajustes y sigue cada movimiento hasta su referencia operativa."
        eyebrow="Inventario"
        title="Inventario, movimientos y trazabilidad"
      />

      <StockSummary items={data} />

      {attentionItems.length > 0 ? (
        <div className="mt-5">
          <OperationalAlert
            title="Stock por revisar"
            tone={attentionItems.some((item) => item.status === "negative" || item.status === "out") ? "danger" : "warning"}
          >
            {attentionItems.length} producto(s) requieren revision de conteo, produccion o compra.
          </OperationalAlert>
        </div>
      ) : null}

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_420px]">
        <OperationalTable>
          <OperationalTableHead>
            <tr>
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Existencia</th>
              <th className="px-4 py-3">Minimo</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Actualizado</th>
            </tr>
          </OperationalTableHead>
          <tbody>
            {data.map((item) => (
              <OperationalTableRow className={cn(item.status !== "ok" && "bg-red-50/40")} key={item.productId}>
                <td className="px-4 py-3">
                  <button
                    className="text-left font-semibold text-tp-text hover:text-tp-primary"
                    onClick={() => {
                      setSelectedProductId(item.productId);
                      updateMovementFilter("productId", item.productId);
                    }}
                    type="button"
                  >
                    {item.productName}
                  </button>
                  <p className="text-xs text-tp-muted">{item.productId}</p>
                </td>
                <td className="px-4 py-3">{labelProductType(item.productType)}</td>
                <td className="px-4 py-3 font-semibold">{formatQuantity(item.currentStock)} {labelUnit(item.unit)}</td>
                <td className="px-4 py-3">{formatQuantity(item.minimumStock)} {labelUnit(item.unit)}</td>
                <td className="px-4 py-3"><StatusBadge tone={statusTone[item.status]}>{labelStatus(item.status)}</StatusBadge></td>
                <td className="px-4 py-3">{item.updatedAt}</td>
              </OperationalTableRow>
            ))}
          </tbody>
        </OperationalTable>

        <OperationalCard>
          <div>
            <p className="text-sm font-semibold">Ajustes y merma</p>
            <p className="mt-1 text-sm text-tp-muted">Cada accion queda registrada en movimientos de inventario.</p>
          </div>
          <div className="mt-4 grid gap-3">
            <label className="grid gap-1 text-sm font-semibold">
              Producto
              <select className="h-11 rounded-md border border-tp-border px-3 font-normal" onChange={(event) => setSelectedProductId(event.target.value)} value={selectedProductId}>
                <option value="">Selecciona producto</option>
                {data.map((item) => <option key={item.productId} value={item.productId}>{item.productName}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Cantidad
              <input className="h-11 rounded-md border border-tp-border px-3 font-normal" inputMode="decimal" onChange={(event) => setQuantity(event.target.value)} value={quantity} />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Motivo de ajuste
              <input className="h-11 rounded-md border border-tp-border px-3 font-normal" onChange={(event) => setReason(event.target.value)} value={reason} />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Motivo de merma
              <select className="h-11 rounded-md border border-tp-border px-3 font-normal" onChange={(event) => setWasteReason(event.target.value as WasteReason)} value={wasteReason}>
                {wasteReasons.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
          </div>
          <p className="mt-4 text-sm text-tp-muted">
            {selectedProduct ? `Unidad: ${labelUnit(selectedProduct.unit)}. Existencia actual: ${formatQuantity(selectedProduct.currentStock)} ${labelUnit(selectedProduct.unit)}.` : "Selecciona un producto para mover inventario."}
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <PermissionButton disabled={!selectedProductId || isMutating || Number(quantity) <= 0} onClick={() => submitAdjustment("in")} permission="inventory.manage">
              <ArrowDownToLine className="h-4 w-4" aria-hidden="true" />
              Entrada
            </PermissionButton>
            <PermissionButton disabled={!selectedProductId || isMutating || Number(quantity) <= 0} onClick={() => submitAdjustment("out")} permission="inventory.manage" variant="secondary">
              <ArrowUpFromLine className="h-4 w-4" aria-hidden="true" />
              Salida
            </PermissionButton>
            <PermissionButton disabled={!selectedProductId || isMutating || Number(quantity) <= 0} onClick={submitWaste} permission="inventory.manage" variant="danger">
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Merma
            </PermissionButton>
          </div>
        </OperationalCard>
      </div>

      <OperationalCard className="mt-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Movimientos trazables</p>
            <p className="mt-1 text-sm text-tp-muted">Filtra el ledger por producto, tipo, fecha o referencia operativa.</p>
          </div>
          <Filter className="h-5 w-5 text-tp-muted" aria-hidden="true" />
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr_150px_150px]">
          <select className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => updateMovementFilter("productId", event.target.value)} value={movementFilters.productId}>
            <option value="">Todos los productos</option>
            {data.map((item) => <option key={item.productId} value={item.productId}>{item.productName}</option>)}
          </select>
          <select className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => updateMovementFilter("movementType", event.target.value)} value={movementFilters.movementType}>
            {movementOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <select className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => updateMovementFilter("referenceType", event.target.value)} value={movementFilters.referenceType}>
            {referenceOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <input aria-label="Desde" className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => updateMovementFilter("createdFrom", event.target.value)} type="date" value={movementFilters.createdFrom} />
          <input aria-label="Hasta" className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => updateMovementFilter("createdTo", event.target.value)} type="date" value={movementFilters.createdTo} />
        </div>
      </OperationalCard>

      <OperationalTable wrapperClassName="mt-4">
        <OperationalTableHead>
          <tr>
            <th className="px-4 py-3">Fecha</th>
            <th className="px-4 py-3">Producto</th>
            <th className="px-4 py-3">Movimiento</th>
            <th className="px-4 py-3">Cantidad</th>
            <th className="px-4 py-3">Referencia</th>
            <th className="px-4 py-3">Motivo</th>
            <th className="px-4 py-3">Usuario</th>
          </tr>
        </OperationalTableHead>
        <tbody>
          {(movementsQuery.data ?? []).map((movement) => (
            <OperationalTableRow key={movement.id}>
              <td className="px-4 py-3">{formatDateTime(movement.createdAt)}</td>
              <td className="px-4 py-3">
                <p className="font-semibold">{movement.product?.name ?? "Producto"}</p>
                <p className="text-xs text-tp-muted">{movement.product?.sku ?? movement.productId}</p>
              </td>
              <td className="px-4 py-3"><StatusBadge tone={movementStatusTone(movement.movementType)}>{labelMovement(movement.movementType)}</StatusBadge></td>
              <td className="px-4 py-3 font-semibold">{movementSign(movement.movementType)}{formatQuantity(movement.quantity)} {labelUnit(movement.unit)}</td>
              <td className="px-4 py-3 text-sm">{referenceLabel(movement)}</td>
              <td className="px-4 py-3 text-sm text-tp-muted">{movement.reason ?? "-"}</td>
              <td className="px-4 py-3 text-sm text-tp-muted">{movement.createdByUserId ?? movement.authorizedByUserId ?? "-"}</td>
            </OperationalTableRow>
          ))}
        </tbody>
      </OperationalTable>
      {!movementsQuery.isLoading && (movementsQuery.data ?? []).length === 0 ? (
        <p className="rounded-b-md border border-t-0 border-tp-border bg-white p-5 text-sm text-tp-muted">No hay movimientos con los filtros seleccionados.</p>
      ) : null}
    </section>
  );
}
