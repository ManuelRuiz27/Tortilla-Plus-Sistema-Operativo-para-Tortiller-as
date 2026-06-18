import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Factory } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  closeProductionBatchRequest,
  createProductionBatchRequest,
  managerProductsRequest,
  productionBatchesRequest
} from "../../../api/manager.api";
import { LoadingState } from "../../../shared/components/loading-state";
import { PermissionButton } from "../../../shared/components/permission-button";
import { StatusBadge } from "../../../shared/components/status-badge";
import { useBranchStore } from "../../../shared/stores/branch.store";
import { labelStatus } from "../../../shared/utils/labels";

export function ProductionPage() {
  const queryClient = useQueryClient();
  const branchId = useBranchStore((state) => state.activeBranchId);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const productionQuery = useQuery({ queryFn: productionBatchesRequest, queryKey: ["production"] });
  const productsQuery = useQuery({ queryFn: managerProductsRequest, queryKey: ["manager-products"] });
  const products = useMemo(
    () => (productsQuery.data ?? []).filter((product) => product.requiresProduction && product.status === "active"),
    [productsQuery.data]
  );
  const createMutation = useMutation({
    mutationFn: createProductionBatchRequest,
    onSuccess: () => {
      setQuantities({});
      void queryClient.invalidateQueries({ queryKey: ["production"] });
      void queryClient.invalidateQueries({ queryKey: ["inventory", branchId] });
    }
  });
  const closeMutation = useMutation({
    mutationFn: closeProductionBatchRequest,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["production"] });
      void queryClient.invalidateQueries({ queryKey: ["inventory", branchId] });
    }
  });

  function setProductQuantity(productId: string, quantity: string) {
    setQuantities((current) => ({ ...current, [productId]: quantity }));
  }

  function submit() {
    if (!branchId) return;
    const items = products
      .map((product) => ({
        productId: product.id,
        quantity: quantities[product.id] ?? "0",
        unit: product.unit
      }))
      .filter((item) => Number(item.quantity) > 0);

    if (items.length === 0) return;
    createMutation.mutate({ branchId, items });
  }

  if (productionQuery.isLoading || productsQuery.isLoading) return <LoadingState message="Cargando produccion..." />;
  if (productionQuery.isError || productsQuery.isError) return <p className="rounded-md border border-tp-border bg-white p-5 text-sm text-tp-danger">No se pudo cargar produccion.</p>;

  const batches = productionQuery.data ?? [];
  const hasQuantities = products.some((product) => Number(quantities[product.id] ?? 0) > 0);

  return (
    <section className="max-w-5xl">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-tp-primary">Produccion</p>
        <h1 className="mt-3 text-2xl font-semibold">Produccion de hoy</h1>
        <p className="mt-2 text-sm text-tp-muted">Registra lo que se preparo y mandalo a inventario al cerrar.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link className="inline-flex min-h-10 items-center rounded-md bg-tp-primary px-4 py-2 text-sm font-semibold text-white hover:bg-tp-primaryHover" to="/app/manager/production/new">
            Nuevo lote por receta
          </Link>
          <Link className="inline-flex min-h-10 items-center rounded-md border border-tp-border bg-white px-4 py-2 text-sm font-semibold text-tp-text hover:bg-tp-soft" to="/app/manager/production/recipes">
            Recetas
          </Link>
        </div>
      </div>

      <div className="mb-5 rounded-md border border-tp-border bg-white p-4">
        <div className="mb-4 flex items-center gap-2">
          <Factory className="h-4 w-4 text-tp-secondary" aria-hidden="true" />
          <h2 className="text-sm font-semibold">Nuevo lote</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <label className="grid gap-2 text-sm" key={product.id}>
              <span className="font-semibold">{product.name}</span>
              <div className="flex">
                <input className="h-11 min-w-0 flex-1 rounded-l-md border border-tp-border px-3" inputMode="decimal" onChange={(event) => setProductQuantity(product.id, event.target.value)} placeholder="0.000" value={quantities[product.id] ?? ""} />
                <span className="inline-flex h-11 items-center rounded-r-md border border-l-0 border-tp-border bg-tp-soft px-3 text-tp-muted">{product.unit}</span>
              </div>
            </label>
          ))}
        </div>
        {products.length === 0 ? <p className="text-sm text-tp-muted">No hay productos marcados para producir.</p> : null}
        <div className="mt-4 flex justify-end">
          <PermissionButton disabled={!branchId || !hasQuantities || createMutation.isPending} onClick={submit} permission="production.manage">Registrar lote</PermissionButton>
        </div>
      </div>

      <div className="grid gap-3">
        {batches.map((batch) => (
          <article className="rounded-md border border-tp-border bg-white p-5" key={batch.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">{batch.productionDate}</h2>
                <p className="mt-2 text-sm text-tp-muted">Tortilla: {batch.tortillaKg} kg - Masa: {batch.masaKg} kg</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge tone={batch.status === "open" ? "success" : "neutral"}>{labelStatus(batch.status)}</StatusBadge>
                <PermissionButton disabled={batch.status !== "open" || closeMutation.isPending} onClick={() => closeMutation.mutate(batch.id)} permission="production.manage" variant="secondary">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  Cerrar
                </PermissionButton>
              </div>
            </div>
          </article>
        ))}
        {batches.length === 0 ? <p className="rounded-md border border-tp-border bg-white p-5 text-sm text-tp-muted">Todavia no hay produccion registrada.</p> : null}
      </div>
    </section>
  );
}
