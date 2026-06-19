import { useMutation, useQuery } from "@tanstack/react-query";
import { Factory } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createProductionRecipeBatchRequest, recipesRequest } from "../../../api/manager.api";
import { LoadingState } from "../../../shared/components/loading-state";
import { OperationalCard } from "../../../shared/components/operational-card";
import { OperationalTable, OperationalTableHead, OperationalTableRow } from "../../../shared/components/operational-table";
import { PermissionButton } from "../../../shared/components/permission-button";
import { WorkspacePageHeader } from "../../../shared/components/workspace-page-header";
import { useBranchStore } from "../../../shared/stores/branch.store";
import { labelUnit } from "../../../shared/utils/labels";

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

export function ProductionRecipeNewPage() {
  const navigate = useNavigate();
  const branchId = useBranchStore((state) => state.activeBranchId);
  const [recipeId, setRecipeId] = useState("");
  const [expectedOutputQuantity, setExpectedOutputQuantity] = useState("");
  const [productionDate, setProductionDate] = useState(new Date().toISOString().slice(0, 10));
  const recipesQuery = useQuery({ queryFn: recipesRequest, queryKey: ["recipes"] });
  const activeRecipes = useMemo(() => (recipesQuery.data ?? []).filter((recipe) => recipe.status === "active" && recipe.currentVersion), [recipesQuery.data]);
  const selectedRecipe = activeRecipes.find((recipe) => recipe.id === recipeId) ?? activeRecipes[0] ?? null;
  const selectedVersion = selectedRecipe?.currentVersion ?? null;

  const createMutation = useMutation({
    mutationFn: createProductionRecipeBatchRequest,
    onSuccess: (batch) => navigate(`/app/production/batches/${batch.id}`)
  });

  function submitBatch() {
    if (!branchId || !selectedVersion || Number(expectedOutputQuantity || selectedVersion.expectedOutputQuantity) <= 0) return;
    createMutation.mutate({
      branchId,
      recipeVersionId: selectedVersion.id,
      expectedOutputQuantity: expectedOutputQuantity || selectedVersion.expectedOutputQuantity.toFixed(3),
      productionDate
    });
  }

  if (recipesQuery.isLoading) return <LoadingState message="Cargando recetas..." />;
  if (recipesQuery.isError) return <p className="rounded-md border border-tp-border bg-white p-5 text-sm text-tp-danger">No se pudieron cargar recetas.</p>;

  return (
    <section className="max-w-5xl">
      <WorkspacePageHeader
        description="Elige una receta activa, revisa los insumos esperados y crea el lote para capturar produccion real."
        eyebrow="Produccion"
        title="Nuevo lote por receta"
      />

      <WizardSteps currentStep={selectedVersion ? 2 : 1} />

      <OperationalCard>
        <div className="mb-4 flex items-center gap-2">
          <Factory className="h-4 w-4 text-tp-primary" aria-hidden="true" />
          <h2 className="text-sm font-semibold">1. Elegir receta y salida esperada</h2>
        </div>
        <div className="grid gap-3 lg:grid-cols-[1.4fr_160px_170px]">
          <label className="grid gap-2 text-sm font-semibold">
            Receta activa
          <select className="h-11 rounded-md border border-tp-border px-3 text-sm font-normal" onChange={(event) => setRecipeId(event.target.value)} value={selectedRecipe?.id ?? ""}>
            {activeRecipes.map((recipe) => <option key={recipe.id} value={recipe.id}>{recipe.name} - {recipe.outputProduct?.name ?? "Salida"}</option>)}
          </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Fecha
          <input className="h-11 rounded-md border border-tp-border px-3 text-sm font-normal" onChange={(event) => setProductionDate(event.target.value)} type="date" value={productionDate} />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Salida esperada
          <input className="h-11 rounded-md border border-tp-border px-3 text-sm font-normal" inputMode="decimal" onChange={(event) => setExpectedOutputQuantity(event.target.value)} placeholder={selectedVersion?.expectedOutputQuantity.toFixed(3) ?? "0.000"} value={expectedOutputQuantity} />
          </label>
        </div>

        {selectedVersion ? (
          <div className="mt-5">
            <h2 className="mb-3 text-sm font-semibold">2. Confirmar insumos esperados</h2>
          <OperationalTable>
              <OperationalTableHead>
                <tr>
                  <th className="px-4 py-3">Insumo esperado</th>
                  <th className="px-4 py-3">Cantidad base</th>
                </tr>
              </OperationalTableHead>
              <tbody>
                {selectedVersion.ingredients.map((ingredient) => (
                  <OperationalTableRow key={ingredient.id}>
                    <td className="px-4 py-3 font-semibold">{ingredient.product?.name ?? "Ingrediente"}</td>
                    <td className="px-4 py-3">{ingredient.quantity.toFixed(3)} {labelUnit(ingredient.unit)}</td>
                  </OperationalTableRow>
                ))}
              </tbody>
          </OperationalTable>
          </div>
        ) : <p className="mt-4 text-sm text-tp-muted">No hay recetas activas.</p>}

        <div className="mt-4 flex justify-end">
          <PermissionButton disabled={!branchId || !selectedVersion || createMutation.isPending} onClick={submitBatch} permission="production.manage">Crear lote y capturar reales</PermissionButton>
        </div>
      </OperationalCard>
    </section>
  );
}
