import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createManagerProductRequest, managerProductsRequest, updateManagerProductRequest } from "../../../api/manager.api";
import { Button } from "../../../shared/components/button";
import { LoadingState } from "../../../shared/components/loading-state";
import { PermissionButton } from "../../../shared/components/permission-button";
import { StatusBadge } from "../../../shared/components/status-badge";
import { labelProductType, labelStatus, labelUnit } from "../../../shared/utils/labels";
import type { ManagerProduct } from "../types/manager.types";

const productTypes: Array<ManagerProduct["productType"]> = [
  "tortilla",
  "masa",
  "package",
  "retail",
  "service",
  "raw_material",
  "packaging",
];
const productUnits: Array<ManagerProduct["unit"]> = ["kg", "piece", "package", "liter", "service"];

type ProductFormState = {
  id?: string;
  name: string;
  sku: string;
  barcode: string;
  productType: ManagerProduct["productType"];
  unit: ManagerProduct["unit"];
  isSellable: boolean;
  isStockTracked: boolean;
  requiresProduction: boolean;
  status: ManagerProduct["status"];
};

const emptyForm: ProductFormState = {
  name: "",
  sku: "",
  barcode: "",
  productType: "retail",
  unit: "piece",
  isSellable: true,
  isStockTracked: true,
  requiresProduction: false,
  status: "active"
};

function formFromProduct(product: ManagerProduct): ProductFormState {
  return {
    id: product.id,
    name: product.name,
    sku: product.sku ?? "",
    barcode: product.barcode ?? "",
    productType: product.productType,
    unit: product.unit,
    isSellable: product.isSellable,
    isStockTracked: product.isStockTracked,
    requiresProduction: product.requiresProduction,
    status: product.status
  };
}

export function ProductsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ProductFormState>(emptyForm);
  const { data = [], isError, isLoading } = useQuery({
    queryFn: managerProductsRequest,
    queryKey: ["manager-products"]
  });
  const createMutation = useMutation({
    mutationFn: createManagerProductRequest,
    onSuccess: () => {
      setForm(emptyForm);
      void queryClient.invalidateQueries({ queryKey: ["manager-products"] });
      void queryClient.invalidateQueries({ queryKey: ["pos-products"] });
    }
  });
  const updateMutation = useMutation({
    mutationFn: updateManagerProductRequest,
    onSuccess: () => {
      setForm(emptyForm);
      void queryClient.invalidateQueries({ queryKey: ["manager-products"] });
      void queryClient.invalidateQueries({ queryKey: ["pos-products"] });
    }
  });

  useEffect(() => {
    if (form.productType === "tortilla" || form.productType === "masa") {
      setForm((current) => ({ ...current, unit: "kg", isStockTracked: true, requiresProduction: true }));
    }
    if (form.productType === "service") {
      setForm((current) => ({ ...current, unit: "service", isStockTracked: false, requiresProduction: false }));
    }
  }, [form.productType]);

  function updateForm(partial: Partial<ProductFormState>) {
    setForm((current) => ({ ...current, ...partial }));
  }

  function submitProduct() {
    if (!form.name.trim()) return;

    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim() || undefined,
      barcode: form.barcode.trim() || undefined,
      productType: form.productType,
      unit: form.unit,
      isSellable: form.isSellable,
      isStockTracked: form.isStockTracked,
      requiresProduction: form.requiresProduction
    };

    if (form.id) {
      updateMutation.mutate({ ...payload, id: form.id, status: form.status });
      return;
    }

    createMutation.mutate(payload);
  }

  if (isLoading) return <LoadingState message="Cargando productos..." />;
  if (isError) return <p className="rounded-md border border-tp-border bg-white p-5 text-sm text-tp-danger">No se pudieron cargar productos.</p>;

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-tp-primary">Productos</p>
          <h1 className="mt-3 text-2xl font-semibold">Productos de venta</h1>
          <p className="mt-2 text-sm text-tp-muted">Agrega y edita lo que se vende, produce o controla en inventario.</p>
        </div>
        {form.id ? (
          <Button onClick={() => setForm(emptyForm)} variant="secondary">
            <X className="h-4 w-4" aria-hidden="true" />
            Dejar de editar
          </Button>
        ) : null}
      </div>

      <div className="mb-5 rounded-md border border-tp-border bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-[1.4fr_140px_140px_130px_130px]">
          <input className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => updateForm({ name: event.target.value })} placeholder="Nombre" value={form.name} />
          <input className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => updateForm({ sku: event.target.value })} placeholder="Clave interna" value={form.sku} />
          <input className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => updateForm({ barcode: event.target.value })} placeholder="Codigo de barras" value={form.barcode} />
          <select className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => updateForm({ productType: event.target.value as ManagerProduct["productType"] })} value={form.productType}>
            {productTypes.map((type) => <option key={type} value={type}>{labelProductType(type)}</option>)}
          </select>
          <select className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => updateForm({ unit: event.target.value as ManagerProduct["unit"] })} value={form.unit}>
            {productUnits.map((unit) => <option key={unit} value={unit}>{labelUnit(unit)}</option>)}
          </select>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-4 text-sm text-tp-muted">
            <label className="flex items-center gap-2"><input checked={form.isSellable} onChange={(event) => updateForm({ isSellable: event.target.checked })} type="checkbox" /> Se vende</label>
            <label className="flex items-center gap-2"><input checked={form.isStockTracked} onChange={(event) => updateForm({ isStockTracked: event.target.checked })} type="checkbox" /> Lleva inventario</label>
            <label className="flex items-center gap-2"><input checked={form.requiresProduction} onChange={(event) => updateForm({ requiresProduction: event.target.checked })} type="checkbox" /> Se produce</label>
            {form.id ? (
              <select className="h-9 rounded-md border border-tp-border px-2 text-sm" onChange={(event) => updateForm({ status: event.target.value as ManagerProduct["status"] })} value={form.status}>
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            ) : null}
          </div>
          <PermissionButton disabled={!form.name.trim() || isSaving} onClick={submitProduct} permission="products.manage">
            <Plus className="h-4 w-4" aria-hidden="true" />
            {form.id ? "Guardar" : "Crear"}
          </PermissionButton>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-tp-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-tp-soft text-xs uppercase text-tp-muted">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Clave</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Unidad</th>
              <th className="px-4 py-3">Uso</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {data.map((product) => (
              <tr className="border-t border-tp-border" key={product.id}>
                <td className="px-4 py-3 font-semibold">{product.name}</td>
                <td className="px-4 py-3">{product.sku ?? "-"}</td>
                <td className="px-4 py-3">{labelProductType(product.productType)}</td>
                <td className="px-4 py-3">{labelUnit(product.unit)}</td>
                <td className="px-4 py-3 text-xs text-tp-muted">
                  {[product.isSellable ? "se vende" : null, product.isStockTracked ? "inventario" : null, product.requiresProduction ? "produccion" : null].filter(Boolean).join(" / ") || "-"}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge tone={product.status === "active" ? "success" : "warning"}>{labelStatus(product.status)}</StatusBadge>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button onClick={() => setForm(formFromProduct(product))} variant="ghost">
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                    Editar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
