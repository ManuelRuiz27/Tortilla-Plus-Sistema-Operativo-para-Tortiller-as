import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { recipesRequest, reportsSummaryRequest } from "../../../api/manager.api";
import { LoadingState } from "../../../shared/components/loading-state";
import { OperationalAlert } from "../../../shared/components/operational-alert";
import { OperationalCard } from "../../../shared/components/operational-card";
import { OperationalTable, OperationalTableHead, OperationalTableRow } from "../../../shared/components/operational-table";
import { StatusBadge } from "../../../shared/components/status-badge";
import { WorkspacePageHeader } from "../../../shared/components/workspace-page-header";
import { useBranchStore } from "../../../shared/stores/branch.store";
import { formatManagerMoney } from "../utils/money";

function defaultFrom() {
  const date = new Date();
  date.setDate(date.getDate() - 6);
  return date.toISOString().slice(0, 10);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function Bars({ items, money = true }: { items: Array<{ label: string; value: number }>; money?: boolean }) {
  if (items.length === 0) {
    return <p className="text-sm text-tp-muted">Sin datos para el periodo.</p>;
  }

  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div className="grid grid-cols-[110px_1fr_96px] items-center gap-3 text-sm" key={item.label}>
          <span className="truncate text-tp-muted">{item.label}</span>
          <div className="h-2 overflow-hidden rounded-full bg-tp-soft">
            <div className="h-full rounded-full bg-tp-secondary" style={{ width: `${Math.max((item.value / max) * 100, 6)}%` }} />
          </div>
          <span className="text-right font-semibold">{money ? formatManagerMoney(item.value) : item.value}</span>
        </div>
      ))}
    </div>
  );
}

function formatQuantity(value: number, unit?: string | null) {
  return `${value.toLocaleString("es-MX", { maximumFractionDigits: 3 })}${unit ? ` ${unit}` : ""}`;
}

export function ReportsPage() {
  const branchId = useBranchStore((state) => state.activeBranchId);
  const [from, setFrom] = useState(defaultFrom());
  const [to, setTo] = useState(today());
  const [recipeId, setRecipeId] = useState("");
  const recipesQuery = useQuery({ queryFn: recipesRequest, queryKey: ["recipes"] });
  const { data, isError, isFetching, isLoading } = useQuery({
    enabled: Boolean(from && to),
    queryFn: () => reportsSummaryRequest({ branchId, from, to, recipeId }),
    queryKey: ["reports-summary", branchId, from, to, recipeId]
  });

  if (isLoading) return <LoadingState message="Cargando reportes..." />;
  if (isError || !data) return <p className="rounded-md border border-tp-border bg-white p-5 text-sm text-tp-danger">No se pudieron cargar reportes.</p>;

  const totalSales = data.salesByDay.reduce((sum, point) => sum + point.value, 0);
  const totalWithdrawals = data.withdrawalsByReason.reduce((sum, point) => sum + point.value, 0);
  const totalDifferences = data.cashDifferences.reduce((sum, point) => sum + point.value, 0);
  const production = data.production;
  const outputVariance = production.summary.outputVarianceQuantity;
  const outputVarianceAbs = Math.abs(outputVariance);
  const highVarianceBatches = production.summary.batchesWithHighVarianceAuthorization;
  const needsProductionReview = outputVarianceAbs > 0 || highVarianceBatches > 0;
  const needsCashReview = Math.abs(totalDifferences) > 0;
  const needsConsumptionReview = production.ingredientConsumption.some((item) => Math.abs(item.varianceQuantity) > 0);
  const operationalAlerts = [
    needsProductionReview
      ? {
          title: "Revisar rendimiento de produccion",
          tone: highVarianceBatches > 0 ? "danger" as const : "warning" as const,
          text: `${formatQuantity(outputVarianceAbs)} de diferencia acumulada y ${highVarianceBatches} lote(s) con variacion alta.`,
          to: "/app/production"
        }
      : null,
    needsConsumptionReview
      ? {
          title: "Consumo de insumos con variacion",
          tone: "warning" as const,
          text: "Compara esperado contra real antes de ajustar compras o recetas.",
          to: "/app/inventory"
        }
      : null,
    needsCashReview
      ? {
          title: "Diferencias de caja en el periodo",
          tone: "warning" as const,
          text: `${formatManagerMoney(totalDifferences)} acumulado en faltantes o sobrantes.`,
          to: "/app/cash"
        }
      : null,
  ].filter(Boolean) as Array<{ title: string; tone: "warning" | "danger"; text: string; to: string }>;

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <WorkspacePageHeader
          className="mb-0"
          description="Ventas, caja, produccion por receta y rendimiento en el periodo elegido."
          eyebrow="Reportes"
          title="Como va el negocio"
        />
        <div className="flex flex-wrap gap-2">
          <input className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setFrom(event.target.value)} type="date" value={from} />
          <input className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setTo(event.target.value)} type="date" value={to} />
          <select className="h-11 rounded-md border border-tp-border px-3 text-sm" onChange={(event) => setRecipeId(event.target.value)} value={recipeId}>
            <option value="">Todas las recetas</option>
            {(recipesQuery.data ?? []).map((recipe) => (
              <option key={recipe.id} value={recipe.id}>{recipe.name}</option>
            ))}
          </select>
        </div>
      </div>

      {isFetching ? <p className="mb-4 text-sm text-tp-muted">Actualizando reportes...</p> : null}

      <div className="mb-5 grid gap-3">
        {operationalAlerts.length === 0 ? (
          <OperationalAlert title="Periodo sin alertas operativas" tone="success">
            No hay variaciones, diferencias de caja ni errores fiscales en los datos cargados.
          </OperationalAlert>
        ) : (
          operationalAlerts.map((alert) => (
            <OperationalAlert
              action={<Link className="text-sm font-semibold text-tp-primary" to={alert.to}>Abrir</Link>}
              key={alert.title}
              title={alert.title}
              tone={alert.tone}
            >
              {alert.text}
            </OperationalAlert>
          ))
        )}
      </div>

      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <OperationalCard>
          <p className="text-sm text-tp-muted">Ventas del periodo</p>
          <p className="mt-2 text-2xl font-semibold">{formatManagerMoney(totalSales)}</p>
        </OperationalCard>
        <OperationalCard>
          <p className="text-sm text-tp-muted">Retiros</p>
          <p className="mt-2 text-2xl font-semibold">{formatManagerMoney(totalWithdrawals)}</p>
        </OperationalCard>
        <OperationalCard>
          <p className="text-sm text-tp-muted">Diferencias de caja</p>
          <p className={`mt-2 text-2xl font-semibold ${needsCashReview ? "text-tp-warning" : ""}`}>{formatManagerMoney(totalDifferences)}</p>
        </OperationalCard>
      </div>

      <div className="mb-5 grid gap-4 md:grid-cols-4">
        <OperationalCard>
          <p className="text-sm text-tp-muted">Lotes cerrados</p>
          <p className="mt-2 text-2xl font-semibold">{production.summary.closedBatches}</p>
        </OperationalCard>
        <OperationalCard>
          <p className="text-sm text-tp-muted">Produccion real</p>
          <p className="mt-2 text-2xl font-semibold">{formatQuantity(production.summary.actualOutputQuantity)}</p>
        </OperationalCard>
        <OperationalCard>
          <p className="text-sm text-tp-muted">Rendimiento promedio</p>
          <p className="mt-2 text-2xl font-semibold">{production.summary.averageYieldPercentage.toFixed(2)}%</p>
        </OperationalCard>
        <OperationalCard>
          <p className="text-sm text-tp-muted">Lotes con variacion</p>
          <p className={`mt-2 text-2xl font-semibold ${production.summary.batchesWithVarianceReason > 0 ? "text-tp-warning" : ""}`}>{production.summary.batchesWithVarianceReason}</p>
        </OperationalCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <OperationalCard>
          <h2 className="mb-4 text-sm font-semibold">Produccion por receta</h2>
          <Bars items={production.byRecipe} money={false} />
        </OperationalCard>
        <OperationalCard>
          <h2 className="mb-4 text-sm font-semibold">Consumo de insumos</h2>
          {production.ingredientConsumption.length === 0 ? (
            <p className="text-sm text-tp-muted">Sin consumos para el periodo.</p>
          ) : (
            <div className="divide-y divide-tp-border text-sm">
              {production.ingredientConsumption.map((item) => (
                <div className="grid gap-2 py-3 md:grid-cols-[1fr_120px_120px_120px]" key={item.label}>
                  <span className="font-medium">{item.label}</span>
                  <span className="text-tp-muted">Esp. {formatQuantity(item.expectedQuantity, item.unit)}</span>
                  <span className="font-semibold">Real {formatQuantity(item.actualQuantity, item.unit)}</span>
                  <span className={item.varianceQuantity > 0 ? "text-tp-warning" : "text-tp-muted"}>
                    Var. {formatQuantity(item.varianceQuantity, item.unit)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </OperationalCard>
        <OperationalCard>
          <h2 className="mb-4 text-sm font-semibold">Ventas por dia</h2>
          <Bars items={data.salesByDay} />
        </OperationalCard>
        <OperationalCard>
          <h2 className="mb-4 text-sm font-semibold">Ventas por producto</h2>
          <Bars items={data.salesByProduct} />
        </OperationalCard>
        <OperationalCard>
          <h2 className="mb-4 text-sm font-semibold">Ventas por sucursal</h2>
          <Bars items={data.salesByBranch} />
        </OperationalCard>
        <OperationalCard>
          <h2 className="mb-4 text-sm font-semibold">Ventas por cliente</h2>
          <Bars items={data.salesByCustomer} />
        </OperationalCard>
        <OperationalCard>
          <h2 className="mb-4 text-sm font-semibold">Caja</h2>
          <div className="mb-5">
            <p className="mb-3 text-xs uppercase text-tp-muted">Retiros por motivo</p>
            <Bars items={data.withdrawalsByReason} />
          </div>
          <p className="mb-3 text-xs uppercase text-tp-muted">Faltantes y sobrantes</p>
          <Bars items={data.cashDifferences} />
        </OperationalCard>
      </div>

      <OperationalCard className="mt-5">
        <h2 className="mb-4 text-sm font-semibold">Lotes recientes por receta</h2>
        {production.recentBatches.length === 0 ? (
          <p className="text-sm text-tp-muted">Sin lotes cerrados para el periodo.</p>
        ) : (
          <OperationalTable wrapperClassName="border-0">
              <OperationalTableHead>
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Sucursal</th>
                  <th className="px-4 py-3">Receta</th>
                  <th className="px-4 py-3">Salida</th>
                  <th className="px-4 py-3">Esperado</th>
                  <th className="px-4 py-3">Real</th>
                  <th className="px-4 py-3">Yield</th>
                  <th className="px-4 py-3">Variacion</th>
                </tr>
              </OperationalTableHead>
              <tbody>
                {production.recentBatches.map((batch) => (
                  <OperationalTableRow key={batch.id}>
                    <td className="px-4 py-3">{batch.productionDate}</td>
                    <td className="px-4 py-3">{batch.branchName}</td>
                    <td className="px-4 py-3">{batch.recipeName}{batch.recipeVersion ? ` v${batch.recipeVersion}` : ""}</td>
                    <td className="px-4 py-3">{batch.outputProductName}</td>
                    <td className="px-4 py-3">{formatQuantity(batch.expectedOutputQuantity, batch.outputUnit)}</td>
                    <td className="px-4 py-3 font-semibold">{formatQuantity(batch.actualOutputQuantity, batch.outputUnit)}</td>
                    <td className="px-4 py-3">{batch.yieldPercentage.toFixed(2)}%</td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={Math.abs(batch.outputVariancePercentage) > 10 ? "danger" : Math.abs(batch.outputVariancePercentage) >= 3 ? "warning" : "success"}>
                        {batch.outputVariancePercentage.toFixed(2)}%
                      </StatusBadge>
                    </td>
                  </OperationalTableRow>
                ))}
              </tbody>
          </OperationalTable>
        )}
      </OperationalCard>
    </section>
  );
}
