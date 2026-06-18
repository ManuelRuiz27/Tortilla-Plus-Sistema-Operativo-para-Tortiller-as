import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FlaskConical, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { createRecipeRequest, managerProductsRequest, recipesRequest } from "../../../api/manager.api";
import { LoadingState } from "../../../shared/components/loading-state";
import { PermissionButton } from "../../../shared/components/permission-button";
import { StatusBadge } from "../../../shared/components/status-badge";
import { useBranchStore } from "../../../shared/stores/branch.store";
import { labelProductType, labelStatus, labelUnit } from "../../../shared/utils/labels";
import type { ManagerProduct } from "../types/manager.types";

type IngredientForm = {
  productId: string;
  quantity: string;
  unit: ManagerProduct["unit"];
};

export function RecipesPage() {
  const queryClient = useQueryClient();
  const branchId = useBranchStore((state) => state.activeBranchId);
  const [name, setName] = useState("");
  const [outputProductId, setOutputProductId] = useState("");
  const [expectedOutputQuantity, setExpectedOutputQuantity] = useState("33.000");
  const [ingredients, setIngredients] = useState<IngredientForm[]>([{ productId: "", quantity: "1.000", unit: "kg" }]);

  const recipesQuery = useQuery({ queryFn: recipesRequest, queryKey: ["recipes"] });
  const productsQuery = useQuery({ queryFn: managerProductsRequest, queryKey: ["manager-products"] });
  const outputProducts = useMemo(
    () => (productsQuery.data ?? []).filter((product) => (product.productType === "masa" || product.productType === "tortilla") && product.status === "active"),
    [productsQuery.data]
  );
  const ingredientProducts = useMemo(
    () => (productsQuery.data ?? []).filter((product) => product.isRecipeIngredient && product.isStockTracked && product.status === "active"),
    [productsQuery.data]
  );
  const selectedOutput = outputProducts.find((product) => product.id === outputProductId) ?? outputProducts[0] ?? null;

  const createMutation = useMutation({
    mutationFn: createRecipeRequest,
    onSuccess: () => {
      setName("");
      setOutputProductId("");
      setExpectedOutputQuantity("33.000");
      setIngredients([{ productId: "", quantity: "1.000", unit: "kg" }]);
      void queryClient.invalidateQueries({ queryKey: ["recipes"] });
    }
  });

  function updateIngredient(index: number, partial: Partial<IngredientForm>) {
    setIngredients((current) => current.map((ingredient, currentIndex) => (currentIndex === index ? { ...ingredient, ...partial } : ingredient)));
  }

  function addIngredient() {
    setIngredients((current) => [...current, { productId: "", quantity: "1.000", unit: "kg" }]);
  }

  function removeIngredient(index: number) {
    setIngredients((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  function submitRecipe() {
    const validIngredients = ingredients
      .filter((ingredient) => ingredient.productId && Number(ingredient.quantity) > 0)
      .map((ingredient) => ({ ...ingredient, unit: ingredient.unit }));
    const output = selectedOutput;
    if (!branchId || !name.trim() || !output || Number(expectedOutputQuantity) <= 0 || validIngredients.length === 0) return;

    createMutation.mutate({
      branchId,
      name: name.trim(),
      outputProductId: output.id,
      expectedOutputQuantity,
      outputUnit: output.unit,
      ingredients: validIngredients
    });
  }

  if (recipesQuery.isLoading || productsQuery.isLoading) return <LoadingState message="Cargando recetas..." />;
  if (recipesQuery.isError || productsQuery.isError) return <p className="rounded-md border border-tp-border bg-white p-5 text-sm text-tp-danger">No se pudieron cargar recetas.</p>;

  const recipes = recipesQuery.data ?? [];
  const canSubmit = Boolean(branchId && name.trim() && selectedOutput && ingredients.some((ingredient) => ingredient.productId && Number(ingredient.quantity) > 0));

  return (
    <section>
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-tp-primary">Recetas</p>
        <h1 className="mt-3 text-2xl font-semibold">Recetas de produccion</h1>
        <p className="mt-2 text-sm text-tp-muted">Define salida, rendimiento esperado e insumos consumidos.</p>
      </div>

      <div className="mb-5 rounded-md border border-tp-border bg-white p-4">
        <div className="mb-4 flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-tp-secondary" aria-hidden="true" />
          <h2 className="text-sm font-semibold">Nueva receta</h2>
        </div>
        <div className="grid gap-3 lg:grid-cols-[1.3fr_1fr_150px]">
          <input className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setName(event.target.value)} placeholder="Nombre" value={name} />
          <select className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setOutputProductId(event.target.value)} value={selectedOutput?.id ?? ""}>
            {outputProducts.map((product) => <option key={product.id} value={product.id}>{product.name} - {labelProductType(product.productType)}</option>)}
          </select>
          <input className="h-11 rounded-md border border-tp-border px-3 text-sm" inputMode="decimal" onChange={(event) => setExpectedOutputQuantity(event.target.value)} value={expectedOutputQuantity} />
        </div>
        <div className="mt-4 space-y-3">
          {ingredients.map((ingredient, index) => {
            const selectedIngredient = ingredientProducts.find((product) => product.id === ingredient.productId);
            const unit = selectedIngredient?.unit ?? ingredient.unit;
            return (
              <div className="grid gap-3 md:grid-cols-[1fr_150px_90px_44px]" key={`${index}-${ingredient.productId}`}>
                <select className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => {
                  const product = ingredientProducts.find((item) => item.id === event.target.value);
                  updateIngredient(index, { productId: event.target.value, unit: product?.unit ?? "kg" });
                }} value={ingredient.productId}>
                  <option value="">Ingrediente</option>
                  {ingredientProducts.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                </select>
                <input className="h-11 rounded-md border border-tp-border px-3 text-sm" inputMode="decimal" onChange={(event) => updateIngredient(index, { quantity: event.target.value })} value={ingredient.quantity} />
                <span className="inline-flex h-11 items-center rounded-md border border-tp-border bg-tp-soft px-3 text-sm text-tp-muted">{labelUnit(unit)}</span>
                <button className="inline-flex h-11 items-center justify-center rounded-md text-tp-muted hover:bg-tp-soft hover:text-tp-danger" onClick={() => removeIngredient(index)} type="button">
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap justify-between gap-3">
          <button className="inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-tp-primary hover:bg-tp-soft" onClick={addIngredient} type="button">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Agregar ingrediente
          </button>
          <PermissionButton disabled={!canSubmit || createMutation.isPending} onClick={submitRecipe} permission="recipes.manage">Crear receta</PermissionButton>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-tp-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-tp-soft text-xs uppercase text-tp-muted">
            <tr>
              <th className="px-4 py-3">Receta</th>
              <th className="px-4 py-3">Salida</th>
              <th className="px-4 py-3">Rendimiento</th>
              <th className="px-4 py-3">Ingredientes</th>
              <th className="px-4 py-3">Version</th>
              <th className="px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {recipes.map((recipe) => (
              <tr className="border-t border-tp-border" key={recipe.id}>
                <td className="px-4 py-3 font-semibold">{recipe.name}</td>
                <td className="px-4 py-3">{recipe.outputProduct?.name ?? "-"}</td>
                <td className="px-4 py-3">{recipe.currentVersion?.expectedOutputQuantity ?? "-"} {recipe.currentVersion ? labelUnit(recipe.currentVersion.outputUnit) : ""}</td>
                <td className="px-4 py-3">{recipe.currentVersion?.ingredients.length ?? 0}</td>
                <td className="px-4 py-3">v{recipe.currentVersion?.version ?? "-"}</td>
                <td className="px-4 py-3"><StatusBadge tone={recipe.status === "active" ? "success" : "warning"}>{labelStatus(recipe.status)}</StatusBadge></td>
              </tr>
            ))}
          </tbody>
        </table>
        {recipes.length === 0 ? <p className="p-5 text-sm text-tp-muted">No hay recetas registradas.</p> : null}
      </div>
    </section>
  );
}
