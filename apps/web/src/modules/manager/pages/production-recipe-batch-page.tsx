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
import { OperationalAlert } from "../../../shared/components/operational-alert";
import { OperationalCard } from "../../../shared/components/operational-card";
import { OperationalTable, OperationalTableHead, OperationalTableRow } from "../../../shared/components/operational-table";
import { PermissionButton } from "../../../shared/components/permission-button";
import { StatusBadge } from "../../../shared/components/status-badge";
import { WorkspacePageHeader } from "../../../shared/components/workspace-page-header";
import { useAuthStore } from "../../../shared/stores/auth.store";
import { useBranchStore } from "../../../shared/stores/branch.store";
import { labelMovement, labelStatus, labelUnit } from "../../../shared/utils/labels";

const wizardSteps = [
  "Elegir receta",
  "Confirmar insumos esperados",
  "Capturar reales",
  "Revisar rendimiento",
  "Cerrar lote"
];

function WizardSteps({ currentStep }: { currentStep: number }) {
  return (
    <ol className="mb-5 grid gap-2 md:grid-cols-5">
      {wizardSteps.map((step, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === currentStep;
        const isDone = stepNumber < currentStep;
        return (
          <li
            className={`rounded-md border px-3 py-2 text-sm ${
              isActive
                ? "border-tp-primary bg-tp-brandSoft text-tp-text"
                : isDone
                  ? "border-green-100 bg-green-50 text-tp-success"
                  : "border-tp-border bg-white text-tp-muted"
            }`}
            key={step}
          >
            <span className="block text-xs font-semibold">Paso {stepNumber}</span>
            <span className="font-semibold">{step}</span>
          </li>
        );
      })}
    </ol>
  );
}

function signedQuantity(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(3)}`;
}

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
  const outputVarianceQuantity = actualOutput && expectedOutput ? actualOutput - expectedOutput : 0;

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
  const currentStep = batch.status === "closed" ? 5 : actualOutput > 0 ? 4 : 3;
  const varianceTone = needsAuthorization ? "danger" : needsReason ? "warning" : "success";
  const canClose = batch.status === "open" && !(needsReason && !varianceReason.trim()) && !closeMutation.isPending;

  return (
    <section className="max-w-6xl">
      <WorkspacePageHeader
        description={`${batch.outputProduct?.name ?? "Salida"} - esperado ${batch.expectedOutputQuantity?.toFixed(3)} ${batch.outputUnit ? labelUnit(batch.outputUnit) : ""}`}
        eyebrow="Produccion"
        title="Cierre de lote por receta"
      />
      <div className="mb-5">
        <StatusBadge tone={batch.status === "open" ? "success" : "neutral"}>{labelStatus(batch.status)}</StatusBadge>
      </div>

      <WizardSteps currentStep={currentStep} />

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <OperationalCard>
          <h2 className="mb-4 text-sm font-semibold">3. Capturar insumos reales y salida real</h2>
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

          <div className="mt-5">
          <OperationalTable>
              <OperationalTableHead>
                <tr>
                  <th className="px-4 py-3">Insumo</th>
                  <th className="px-4 py-3">Esperado</th>
                  <th className="px-4 py-3">Real</th>
                  <th className="px-4 py-3">Diferencia</th>
                </tr>
              </OperationalTableHead>
              <tbody>
                {batch.ingredients.map((ingredient) => {
                  const actualIngredient = Number(actualIngredients[ingredient.id] ?? ingredient.actualQuantity ?? 0);
                  const difference = actualIngredient - ingredient.expectedQuantity;
                  return (
                  <OperationalTableRow key={ingredient.id}>
                    <td className="px-4 py-3 font-semibold">{ingredient.product?.name ?? "Ingrediente"}</td>
                    <td className="px-4 py-3">{ingredient.expectedQuantity.toFixed(3)} {labelUnit(ingredient.unit)}</td>
                    <td className="px-4 py-3">
                      <input className="h-10 w-36 rounded-md border border-tp-border px-3" inputMode="decimal" onChange={(event) => setActualIngredients((current) => ({ ...current, [ingredient.id]: event.target.value }))} value={actualIngredients[ingredient.id] ?? ""} />
                    </td>
                    <td className={difference === 0 ? "px-4 py-3 text-tp-muted" : "px-4 py-3 font-semibold text-tp-warning"}>{signedQuantity(difference)} {labelUnit(ingredient.unit)}</td>
                  </OperationalTableRow>
                  );
                })}
              </tbody>
          </OperationalTable>
          </div>

          <div className="mt-5">
            <h2 className="mb-3 text-sm font-semibold">4. Revisar rendimiento</h2>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-md border border-tp-border bg-tp-surface p-4">
                <p className="text-xs uppercase text-tp-muted">Esperado</p>
                <p className="mt-1 text-2xl font-semibold">{expectedOutput.toFixed(3)} {batch.outputUnit ? labelUnit(batch.outputUnit) : ""}</p>
              </div>
              <div className="rounded-md border border-tp-border bg-tp-surface p-4">
                <p className="text-xs uppercase text-tp-muted">Real</p>
                <p className="mt-1 text-2xl font-semibold">{actualOutput.toFixed(3)} {batch.outputUnit ? labelUnit(batch.outputUnit) : ""}</p>
              </div>
              <div className="rounded-md border border-tp-border bg-tp-surface p-4">
                <p className="text-xs uppercase text-tp-muted">Variacion</p>
                <p className="mt-1 text-2xl font-semibold">{signedQuantity(outputVarianceQuantity)} / {variancePercentage.toFixed(2)}%</p>
              </div>
            </div>
          </div>

          {actualOutput > 0 ? (
            <div className="mt-4">
              <OperationalAlert
                title={needsAuthorization ? "Requiere autorizacion" : needsReason ? "Requiere motivo" : "Rendimiento dentro del rango"}
                tone={varianceTone}
              >
                {needsAuthorization
                  ? "La variacion supera 10%. Captura motivo; el cierre enviara autorizacion con tu usuario si tienes permiso."
                  : needsReason
                    ? "La variacion es de 3% a 10%. Captura un motivo antes de cerrar el lote."
                    : "La variacion es menor a 3%. Puedes cerrar el lote sin motivo."}
              </OperationalAlert>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <PermissionButton disabled={batch.status !== "open" || updateMutation.isPending} onClick={saveActuals} permission="production.manage" variant="secondary">
              <Save className="h-4 w-4" aria-hidden="true" />
              Guardar reales
            </PermissionButton>
            <PermissionButton disabled={!canClose} onClick={closeBatch} permission="production.manage">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Cerrar lote
            </PermissionButton>
          </div>
        </OperationalCard>

        <aside className="rounded-md border border-tp-border bg-white p-4">
          <h2 className="text-sm font-semibold">5. Movimientos generados</h2>
          <p className="mt-1 text-sm text-tp-muted">Al cerrar, se descuentan insumos reales y se ingresa la produccion real.</p>
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
