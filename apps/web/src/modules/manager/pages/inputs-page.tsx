import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PackagePlus, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import {
  createManagerProductRequest,
  createUnitConversionRequest,
  deleteUnitConversionRequest,
  managerProductsRequest,
  unitConversionsRequest
} from "../../../api/manager.api";
import { LoadingState } from "../../../shared/components/loading-state";
import { PermissionButton } from "../../../shared/components/permission-button";
import { StatusBadge } from "../../../shared/components/status-badge";
import { labelProductType, labelStatus, labelUnit } from "../../../shared/utils/labels";
import type { ManagerProduct } from "../types/manager.types";

const inputTypes: Array<Extract<ManagerProduct["productType"], "raw_material" | "packaging">> = ["raw_material", "packaging"];
const productUnits: Array<ManagerProduct["unit"]> = ["kg", "piece", "package", "liter"];

export function InputsPage() {
  const queryClient = useQueryClient();
  const [selectedProductId, setSelectedProductId] = useState("");
  const [productForm, setProductForm] = useState({
    name: "",
    sku: "",
    productType: "raw_material" as Extract<ManagerProduct["productType"], "raw_material" | "packaging">,
    unit: "kg" as ManagerProduct["unit"],
    isRecipeIngredient: true
  });
  const [conversionForm, setConversionForm] = useState({
    name: "",
    fromUnit: "",
    factor: "1.000"
  });

  const productsQuery = useQuery({ queryFn: managerProductsRequest, queryKey: ["manager-products"] });
  const inputs = useMemo(
    () => (productsQuery.data ?? []).filter((product) => product.productType === "raw_material" || product.productType === "packaging"),
    [productsQuery.data]
  );
  const selectedProduct = inputs.find((product) => product.id === selectedProductId) ?? inputs[0] ?? null;
  const conversionsQuery = useQuery({
    enabled: Boolean(selectedProduct?.id),
    queryFn: () => unitConversionsRequest(selectedProduct?.id ?? ""),
    queryKey: ["unit-conversions", selectedProduct?.id]
  });

  const createProductMutation = useMutation({
    mutationFn: createManagerProductRequest,
    onSuccess: (product) => {
      setProductForm({ name: "", sku: "", productType: "raw_material", unit: "kg", isRecipeIngredient: true });
      setSelectedProductId(product.id);
      void queryClient.invalidateQueries({ queryKey: ["manager-products"] });
    }
  });
  const createConversionMutation = useMutation({
    mutationFn: createUnitConversionRequest,
    onSuccess: () => {
      setConversionForm({ name: "", fromUnit: "", factor: "1.000" });
      void queryClient.invalidateQueries({ queryKey: ["unit-conversions", selectedProduct?.id] });
    }
  });
  const deleteConversionMutation = useMutation({
    mutationFn: deleteUnitConversionRequest,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["unit-conversions", selectedProduct?.id] })
  });

  function submitProduct() {
    if (!productForm.name.trim()) return;
    createProductMutation.mutate({
      name: productForm.name.trim(),
      sku: productForm.sku.trim() || undefined,
      productType: productForm.productType,
      unit: productForm.unit,
      isSellable: false,
      isStockTracked: true,
      requiresProduction: false,
      isRecipeIngredient: productForm.isRecipeIngredient,
      allowNegativeStock: false
    });
  }

  function submitConversion() {
    if (!selectedProduct || !conversionForm.name.trim() || !conversionForm.fromUnit.trim() || Number(conversionForm.factor) <= 0) return;
    createConversionMutation.mutate({
      productId: selectedProduct.id,
      name: conversionForm.name.trim(),
      fromUnit: conversionForm.fromUnit.trim(),
      toUnit: selectedProduct.unit,
      factor: conversionForm.factor
    });
  }

  if (productsQuery.isLoading) return <LoadingState message="Cargando insumos..." />;
  if (productsQuery.isError) return <p className="rounded-md border border-tp-border bg-white p-5 text-sm text-tp-danger">No se pudieron cargar insumos.</p>;

  return (
    <section>
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-tp-primary">Insumos</p>
        <h1 className="mt-3 text-2xl font-semibold">Materias primas y empaques</h1>
        <p className="mt-2 text-sm text-tp-muted">Administra productos no vendibles que se consumen en recetas.</p>
      </div>

      <div className="mb-5 rounded-md border border-tp-border bg-white p-4">
        <div className="mb-4 flex items-center gap-2">
          <PackagePlus className="h-4 w-4 text-tp-secondary" aria-hidden="true" />
          <h2 className="text-sm font-semibold">Nuevo insumo</h2>
        </div>
        <div className="grid gap-3 lg:grid-cols-[1.4fr_140px_150px_140px_170px]">
          <input className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))} placeholder="Nombre" value={productForm.name} />
          <input className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setProductForm((current) => ({ ...current, sku: event.target.value }))} placeholder="Clave" value={productForm.sku} />
          <select className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setProductForm((current) => ({ ...current, productType: event.target.value as typeof productForm.productType }))} value={productForm.productType}>
            {inputTypes.map((type) => <option key={type} value={type}>{labelProductType(type)}</option>)}
          </select>
          <select className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setProductForm((current) => ({ ...current, unit: event.target.value as ManagerProduct["unit"] }))} value={productForm.unit}>
            {productUnits.map((unit) => <option key={unit} value={unit}>{labelUnit(unit)}</option>)}
          </select>
          <label className="flex h-11 items-center gap-2 text-sm text-tp-muted">
            <input checked={productForm.isRecipeIngredient} onChange={(event) => setProductForm((current) => ({ ...current, isRecipeIngredient: event.target.checked }))} type="checkbox" />
            Ingrediente de receta
          </label>
        </div>
        <div className="mt-4 flex justify-end">
          <PermissionButton disabled={!productForm.name.trim() || createProductMutation.isPending} onClick={submitProduct} permission="products.manage">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Crear insumo
          </PermissionButton>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="overflow-x-auto rounded-md border border-tp-border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-tp-soft text-xs uppercase text-tp-muted">
              <tr>
                <th className="px-4 py-3">Insumo</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Unidad</th>
                <th className="px-4 py-3">Uso</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {inputs.map((product) => (
                <tr className="border-t border-tp-border" key={product.id}>
                  <td className="px-4 py-3">
                    <button className="text-left font-semibold text-tp-text hover:text-tp-primary" onClick={() => setSelectedProductId(product.id)} type="button">
                      {product.name}
                    </button>
                    <p className="text-xs text-tp-muted">{product.sku ?? "-"}</p>
                  </td>
                  <td className="px-4 py-3">{labelProductType(product.productType)}</td>
                  <td className="px-4 py-3">{labelUnit(product.unit)}</td>
                  <td className="px-4 py-3 text-xs text-tp-muted">{product.isRecipeIngredient ? "Ingrediente" : "Control inventario"}</td>
                  <td className="px-4 py-3"><StatusBadge tone={product.status === "active" ? "success" : "warning"}>{labelStatus(product.status)}</StatusBadge></td>
                </tr>
              ))}
            </tbody>
          </table>
          {inputs.length === 0 ? <p className="p-5 text-sm text-tp-muted">No hay insumos registrados.</p> : null}
        </div>

        <aside className="rounded-md border border-tp-border bg-white p-4">
          <h2 className="text-sm font-semibold">Conversiones</h2>
          <p className="mt-1 text-sm text-tp-muted">{selectedProduct ? `${selectedProduct.name} - unidad base ${labelUnit(selectedProduct.unit)}` : "Selecciona un insumo."}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <input className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setConversionForm((current) => ({ ...current, name: event.target.value }))} placeholder="Nombre" value={conversionForm.name} />
            <input className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setConversionForm((current) => ({ ...current, fromUnit: event.target.value }))} placeholder="Costal, cubeta" value={conversionForm.fromUnit} />
            <input className="h-11 rounded-md border border-tp-border px-3 text-sm" inputMode="decimal" onChange={(event) => setConversionForm((current) => ({ ...current, factor: event.target.value }))} placeholder="25.000" value={conversionForm.factor} />
          </div>
          <div className="mt-3 flex justify-end">
            <PermissionButton disabled={!selectedProduct || createConversionMutation.isPending} onClick={submitConversion} permission="products.manage" variant="secondary">Agregar conversion</PermissionButton>
          </div>
          <div className="mt-4 divide-y divide-tp-border">
            {(conversionsQuery.data ?? []).map((conversion) => (
              <div className="flex items-center justify-between gap-3 py-3 text-sm" key={conversion.id}>
                <div>
                  <p className="font-semibold">{conversion.name}</p>
                  <p className="text-tp-muted">1 {conversion.fromUnit} = {conversion.factor.toFixed(3)} {labelUnit(conversion.toUnit)}</p>
                </div>
                <PermissionButton onClick={() => deleteConversionMutation.mutate(conversion.id)} permission="products.manage" variant="ghost">
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </PermissionButton>
              </div>
            ))}
            {selectedProduct && (conversionsQuery.data ?? []).length === 0 ? <p className="py-4 text-sm text-tp-muted">Sin conversiones configuradas.</p> : null}
          </div>
        </aside>
      </div>
    </section>
  );
}
