import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  closeProductionRecipeBatchRequest,
  inventoryMovementsRequest,
  productionRecipeBatchRequest,
  updateProductionRecipeBatchActualsRequest
} from "../../../api/manager.api";
import { LoadingState } from "../../../shared/components/loading-state";
import { PermissionButton } from "../../../shared/components/permission-button";
import { StatusBadge } from "../../../shared/components/status-badge";
import { useAuthStore } from "../../../shared/stores/auth.store";
import { useBranchStore } from "../../../shared/stores/branch.store";
import { labelMovement, labelStatus, labelUnit } from "../../../shared/utils/labels";

export function ProductionRecipeBatchPage() {
  const queryClient = useQueryClient();
  const { batchId = "" } = useParams();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const branchId = useBranchStore((state) => state.activeBranchId);
  const [actualOutputQuantity, setActualOutputQuantity] = useState("");
  const [varianceReason, setVarianceReason] = useState("");
  const [actualIngredients, setActualIngredients] = useState<Record<string, string>>({});
  const batchQuery = useQuery({
    enabled: Boolean(batchId),
    queryFn: () => productionRecipeBatchRequest(batchId),
    queryKey: ["production-recipe-batch", batchId]
  });
  const movementsQuery = useQuery({
    enabled: Boolean(batchId && branchId),
    queryFn: () => inventoryMovementsRequest({ branchId, referenceType: "production_batch", referenceId: batchId, limit: 20 }),
    queryKey: ["inventory-movements", "production_batch", batchId, branchId]
  });
  const batch = batchQuery.data;

  useEffect(() => {
    if (!batch) return;
    setActualOutputQuantity(batch.actualOutputQuantity?.toFixed(3) ?? "");
    setVarianceReason(batch.varianceReason ?? "");
    setActualIngredients(Object.fromEntries(batch.ingredients.map((ingredient) => [ingredient.id, ingredient.actualQuantity.toFixed(3)])));
  }, [batch]);

  const expectedOutput = batch?.expectedOutputQuantity ?? 0;
  const actualOutput = Number(actualOutputQuantity || batch?.actualOutputQuantity || 0);
  const variancePercentage = useMemo(() => {
    if (!expectedOutput || expectedOutput <= 0 || !actualOutput || actualOutput <= 0) return 0;
    return Math.abs(actualOutput - expectedOutput) / expectedOutput * 100;
  }, [actualOutput, expectedOutput]);

  const actualPayload = () => ({
    actualOutputQuantity,
    varianceReason: varianceReason.trim() || undefined,
    ingredients: Object.entries(actualIngredients).map(([productionBatchIngredientId, actualQuantity]) => ({
      productionBatchIngredientId,
      actualQuantity
    }))
  });

  const updateMutation = useMutation({
    mutationFn: updateProductionRecipeBatchActualsRequest,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["production-recipe-batch", batchId] })
  });
  const closeMutation = useMutation({
    mutationFn: closeProductionRecipeBatchRequest,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["production-recipe-batch", batchId] });
      void queryClient.invalidateQueries({ queryKey: ["inventory-movements", "production_batch", batchId, branchId] });
      void queryClient.invalidateQueries({ queryKey: ["inventory", branchId] });
      void queryClient.invalidateQueries({ queryKey: ["production"] });
    }
  });

  function saveActuals() {
    if (!batch) return;
    updateMutation.mutate({ batchId: batch.id, ...actualPayload() });
  }

  function closeBatch() {
    if (!batch) return;
    closeMutation.mutate({
      batchId: batch.id,
      ...actualPayload(),
      authorizedByUserId: variancePercentage > 10 ? currentUserId : undefined
    });
  }

  if (batchQuery.isLoading) return <LoadingState message="Cargando lote..." />;
  if (batchQuery.isError || !batch) return <p className="rounded-md border border-tp-border bg-white p-5 text-sm text-tp-danger">No se pudo cargar el lote.</p>;

  const needsReason = variancePercentage >= 3;
  const needsAuthorization = variancePercentage > 10;

  return (
    <section className="max-w-6xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-tp-primary">Produccion</p>
          <h1 className="mt-3 text-2xl font-semibold">Cierre de lote por receta</h1>
          <p className="mt-2 text-sm text-tp-muted">{batch.outputProduct?.name ?? "Salida"} - esperado {batch.expectedOutputQuantity?.toFixed(3)} {batch.outputUnit ? labelUnit(batch.outputUnit) : ""}</p>
        </div>
        <StatusBadge tone={batch.status === "open" ? "success" : "neutral"}>{labelStatus(batch.status)}</StatusBadge>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <div className="rounded-md border border-tp-border bg-white p-4">
          <div className="grid gap-3 md:grid-cols-[180px_1fr]">
            <label className="grid gap-2 text-sm">
              <span className="font-semibold">Salida real</span>
              <input className="h-11 rounded-md border border-tp-border px-3" inputMode="decimal" onChange={(event) => setActualOutputQuantity(event.target.value)} value={actualOutputQuantity} />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-semibold">Motivo de variacion</span>
              <input className="h-11 rounded-md border border-tp-border px-3" onChange={(event) => setVarianceReason(event.target.value)} placeholder={needsReason ? "Requerido por variacion" : "Opcional"} value={varianceReason} />
            </label>
          </div>
          <div className="mt-4 rounded-md bg-tp-soft p-3 text-sm text-tp-muted">
            Rendimiento {actualOutput && expectedOutput ? (actualOutput / expectedOutput * 100).toFixed(2) : "0.00"}%. Variacion {variancePercentage.toFixed(2)}%.
            {needsAuthorization ? " Requiere autorizacion de variacion alta." : null}
          </div>

          <div className="mt-5 overflow-x-auto rounded-md border border-tp-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-tp-soft text-xs uppercase text-tp-muted">
                <tr>
                  <th className="px-4 py-3">Insumo</th>
                  <th className="px-4 py-3">Esperado</th>
                  <th className="px-4 py-3">Real</th>
                </tr>
              </thead>
              <tbody>
                {batch.ingredients.map((ingredient) => (
                  <tr className="border-t border-tp-border" key={ingredient.id}>
                    <td className="px-4 py-3 font-semibold">{ingredient.product?.name ?? "Ingrediente"}</td>
                    <td className="px-4 py-3">{ingredient.expectedQuantity.toFixed(3)} {labelUnit(ingredient.unit)}</td>
                    <td className="px-4 py-3">
                      <input className="h-10 w-36 rounded-md border border-tp-border px-3" inputMode="decimal" onChange={(event) => setActualIngredients((current) => ({ ...current, [ingredient.id]: event.target.value }))} value={actualIngredients[ingredient.id] ?? ""} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <PermissionButton disabled={batch.status !== "open" || updateMutation.isPending} onClick={saveActuals} permission="production.manage" variant="secondary">
              <Save className="h-4 w-4" aria-hidden="true" />
              Guardar reales
            </PermissionButton>
            <PermissionButton disabled={batch.status !== "open" || closeMutation.isPending || (needsReason && !varianceReason.trim())} onClick={closeBatch} permission="production.manage">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Cerrar lote
            </PermissionButton>
          </div>
        </div>

        <aside className="rounded-md border border-tp-border bg-white p-4">
          <h2 className="text-sm font-semibold">Movimientos</h2>
          <div className="mt-3 divide-y divide-tp-border">
            {(movementsQuery.data ?? []).map((movement) => (
              <div className="py-3 text-sm" key={movement.id}>
                <p className="font-semibold">{labelMovement(movement.movementType)}</p>
                <p className="text-tp-muted">{movement.product?.name ?? "Producto"} - {movement.quantity.toFixed(3)} {labelUnit(movement.unit)}</p>
              </div>
            ))}
            {(movementsQuery.data ?? []).length === 0 ? <p className="py-4 text-sm text-tp-muted">Los movimientos apareceran al cerrar el lote.</p> : null}
          </div>
        </aside>
      </div>
    </section>
  );
}
