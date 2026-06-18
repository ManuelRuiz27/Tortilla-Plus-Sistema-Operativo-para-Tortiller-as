import { useMutation, useQuery } from "@tanstack/react-query";
import { Factory } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createProductionRecipeBatchRequest, recipesRequest } from "../../../api/manager.api";
import { LoadingState } from "../../../shared/components/loading-state";
import { PermissionButton } from "../../../shared/components/permission-button";
import { useBranchStore } from "../../../shared/stores/branch.store";
import { labelUnit } from "../../../shared/utils/labels";

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
    onSuccess: (batch) => navigate(`/app/manager/production/batches/${batch.id}`)
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
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-tp-primary">Produccion</p>
        <h1 className="mt-3 text-2xl font-semibold">Nuevo lote por receta</h1>
        <p className="mt-2 text-sm text-tp-muted">Selecciona una receta activa y confirma la salida esperada.</p>
      </div>

      <div className="rounded-md border border-tp-border bg-white p-4">
        <div className="mb-4 flex items-center gap-2">
          <Factory className="h-4 w-4 text-tp-secondary" aria-hidden="true" />
          <h2 className="text-sm font-semibold">Datos del lote</h2>
        </div>
        <div className="grid gap-3 lg:grid-cols-[1.4fr_160px_170px]">
          <select className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setRecipeId(event.target.value)} value={selectedRecipe?.id ?? ""}>
            {activeRecipes.map((recipe) => <option key={recipe.id} value={recipe.id}>{recipe.name} - {recipe.outputProduct?.name ?? "Salida"}</option>)}
          </select>
          <input className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setProductionDate(event.target.value)} type="date" value={productionDate} />
          <input className="h-11 rounded-md border border-tp-border px-3 text-sm" inputMode="decimal" onChange={(event) => setExpectedOutputQuantity(event.target.value)} placeholder={selectedVersion?.expectedOutputQuantity.toFixed(3) ?? "0.000"} value={expectedOutputQuantity} />
        </div>

        {selectedVersion ? (
          <div className="mt-5 overflow-x-auto rounded-md border border-tp-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-tp-soft text-xs uppercase text-tp-muted">
                <tr>
                  <th className="px-4 py-3">Insumo esperado</th>
                  <th className="px-4 py-3">Cantidad base</th>
                </tr>
              </thead>
              <tbody>
                {selectedVersion.ingredients.map((ingredient) => (
                  <tr className="border-t border-tp-border" key={ingredient.id}>
                    <td className="px-4 py-3 font-semibold">{ingredient.product?.name ?? "Ingrediente"}</td>
                    <td className="px-4 py-3">{ingredient.quantity.toFixed(3)} {labelUnit(ingredient.unit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="mt-4 text-sm text-tp-muted">No hay recetas activas.</p>}

        <div className="mt-4 flex justify-end">
          <PermissionButton disabled={!branchId || !selectedVersion || createMutation.isPending} onClick={submitBatch} permission="production.manage">Crear lote</PermissionButton>
        </div>
      </div>
    </section>
  );
}
