# Tortilla Plus - Auditoria de cobertura Billing / Comercial / Admin

## Estado

Auditoria creada despues de implementar el bloque de billing mensual y revisar los documentos fuente.

Documentos auditados:

- `docs/product/commercial-model-v1.md`
- `docs/product/subscription-and-billing-backlog-v1.md`
- `docs/product/accounting-and-tax-operations-v1.md`
- `docs/product/pilot-deploy-readiness-roles-v0.1.md`

Prioridad usada ante contradicciones:

1. `commercial-model-v1.md`
2. `subscription-and-billing-backlog-v1.md`
3. `accounting-and-tax-operations-v1.md`
4. `pilot-deploy-readiness-roles-v0.1.md`

## Resumen ejecutivo

El nucleo de Sprint Billing 1 queda cubierto.

Tambien queda cubierta una parte relevante de Sprint Billing 2 y Admin 1:

- uso mensual CFDI preparado y calculado;
- excedentes CFDI incluidos en el corte;
- subtotal, IVA y total separados;
- pagos manuales asociados a billing cycle;
- referencia, metodo y nota de pago;
- exportes CSV basicos para ingresos SaaS y cuentas por cobrar.

El repo no queda completamente listo para "deploy piloto total" segun `pilot-deploy-readiness-roles-v0.1.md`, porque ese documento incluye flujos no estrictamente de billing:

- cierre completo de Owner para usuarios/sucursales/POS;
- separacion final de Manager vs Owner;
- decision final de Supervisor;
- ocultamiento/verificacion exhaustiva de todos los modulos visibles con `VITE_USE_MOCKS=false`;
- QA manual por rol PLAT/OWN/MAN/SUP/CASH completo.

Esos puntos son pendientes reales de readiness piloto, no brechas del sprint billing.

## Evidencia principal de implementacion

Base de datos y migraciones:

- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/0010_saas_billing_cycles/migration.sql`
- `apps/api/prisma/migrations/0011_billing_usage_and_one_time_charges/migration.sql`

Servicios backend:

- `apps/api/src/services/billing-cycle-service.ts`
- `apps/api/src/services/platform-service.ts`
- `apps/api/src/services/operational-access-service.ts`
- `apps/api/src/server.ts`

Catalogo y seed:

- `apps/api/src/bootstrap/system-catalog.ts`
- `apps/api/src/bootstrap/system-bootstrap.ts`
- `apps/api/prisma/seed.ts`

Frontend:

- `apps/web/src/api/platform.api.ts`
- `apps/web/src/api/organization.api.ts`
- `apps/web/src/modules/platform/pages/platform-dashboard-page.tsx`
- `apps/web/src/modules/platform/pages/platform-organization-detail-page.tsx`
- `apps/web/src/modules/platform/pages/platform-payments-page.tsx`
- `apps/web/src/modules/manager/components/owner-administration-panel.tsx`

Tests:

- `apps/api/tests/integration/platform-owner-flow.test.ts`
- `apps/api/tests/integration/pos-operational-flow.test.ts`

## Cobertura por documento

### 1. Commercial Model V1

| Requisito | Estado | Evidencia / nota |
|---|---|---|
| Plan Mostrador $299 + IVA | Cubierto | Catalogo comercial y seed/bootstrap. |
| Plan Operativo $599 + IVA | Cubierto | Catalogo comercial y seed/bootstrap. |
| Plan Comercial $999 + IVA | Cubierto | Catalogo comercial y seed/bootstrap. |
| Limites de sucursales, POS, terminales y CFDI por plan | Cubierto | `subscription_items` incluye `included_branch`, `included_pos`, `included_terminal`, `included_cfdi`; Owner los muestra en solo lectura. |
| Terminal incluida no implica hardware/comisiones | Parcial documental/UI | El modelo conserva terminales como limite logico. La frase comercial obligatoria queda para contratos/propuestas, no para backend. |
| Extras como `subscription_items` | Cubierto | Enum extendido: `extra_pos`, `extra_terminal`, `extra_branch`, `support_priority`. |
| Precio snapshot por cliente | Cubierto | Los cortes calculan desde `subscription_items`, no desde precio actual de plan. |
| CFDI excedente a $6 IVA incluido | Cubierto | El corte separa subtotal/IVA desde total IVA incluido. |
| Setup inicial como cargo no recurrente | Cubierto | `SaasOneTimeCharge` y endpoint Platform de cargos unicos. |
| IVA no es ingreso | Cubierto | Billing cycles, pagos y reportes separan subtotal, `taxTotal` y total. |
| Politica de precio piloto primeros 10 clientes / 6 meses | Pendiente operativo | Esta regla esta documentada, pero no hay contador automatico ni bloqueo/alerta al llegar al umbral. No se cambio precio comercial. |
| MRR sin IVA | Cubierto | Dashboard Platform usa metricas sin IVA. |
| COGS, margen bruto y costos directos | Pendiente | No hay modelo de gastos/costos directos ni margen real. No era Sprint Billing 1. |

### 2. Subscription & Billing Backlog V1

| Requisito | Estado | Evidencia / nota |
|---|---|---|
| `BillingCycle` | Cubierto | Prisma + migracion `0010`. |
| `BillingCycleItem` | Cubierto | Prisma + migracion `0010`. |
| Un ciclo por organizacion/suscripcion/mes | Cubierto | Unique index por `subscription_id`, `period_start`, `period_end`. |
| No recalcular ciclo pagado | Cubierto | Servicio y test de integracion. |
| Calculo desde `subscription_items` activos | Cubierto | `billing-cycle-service.ts`. |
| `CfdiUsageCounter` | Cubierto | Prisma + migracion `0011`. |
| Conteo global vs individual | Cubierto a nivel de resumen | Servicio distingue globales e individuales con base en CFDI emitidos existentes. |
| Excedentes CFDI al corte | Cubierto | Item `cfdi_overage`. |
| `SaasOneTimeCharge` | Cubierto | Prisma + endpoint Platform. |
| `SaasPayment.billing_cycle_id` | Cubierto | Prisma + servicio de pago manual. |
| Endpoints Platform requeridos | Cubierto | Todos los endpoints listados existen bajo `/api/v1/platform/...`. |
| Endpoints Owner requeridos | Cubierto | `/organization/billing-summary`, `/organization/subscription`, `/organization/cfdi-usage`. |
| Endpoints internos de billing | Cubierto | Protegidos por `INTERNAL_BILLING_TOKEN`. |
| `billing-cycle-service` | Cubierto | Servicio dedicado implementado. |
| `cfdi-usage-service` separado | Cubierto funcionalmente, no separado | La responsabilidad vive en `billing-cycle-service.ts`. Si se exige archivo separado, queda pendiente de refactor. |
| `subscription-entitlement-service` separado | Cubierto parcialmente, no separado | Limites se calculan para billing/Owner. Falta servicio dedicado para validar terminales/sucursales en todos los flujos. |
| Scheduler mensual | Parcial | Hay endpoints internos y pruebas del servicio de vencimientos; no hay cron/worker instalado. |
| Grace/past_due/suspended por vencimiento | Cubierto funcionalmente | `updateOverdueBillingStatuses` actualiza ciclo, suscripcion y organizacion; cubierto por tests de integracion. |
| Dashboard financiero Director | Cubierto parcial | MRR, pagos, IVA, cuentas por cobrar, setup, CFDI overage y estados se muestran. Faltan links desde alertas si se toma readiness como alcance. |
| Detalle organizacion - Facturacion SaaS | Cubierto | Plan, estado, periodo, deuda, ciclos, pagos, CFDI, cargos unicos. |
| Edicion de `subscription_items` por Director | Cubierto | Endpoint y UI minima. |
| Pagos SaaS contra corte | Cubierto | Pantalla Platform Payments y mark-paid. |
| UI Owner solo lectura | Cubierto para suscripcion/billing | Owner ve plan, estado, limites, deuda y uso. No edita precios/items. |
| Auditoria billing | Cubierto para P0 | Cubiertas acciones principales, cancelacion de cargo unico, suspension por mora y reactivacion por pago. |
| Tests BILL-UNIT-01 a BILL-UNIT-09 | Cubierto por integracion observable | No hay unit tests con esos IDs; la cobertura equivalente valida totales, extras, CFDI IVA incluido, snapshot y no recalculo pagado desde el servicio real. |
| Tests BILL-INT principales | Cubierto | Cubiertos generacion, base plan, extras/setup/CFDI, pago, bloqueo POS y transiciones grace/past_due/suspended/cancelled. |

### 3. Accounting & Tax Operations V1

| Requisito | Estado | Evidencia / nota |
|---|---|---|
| Separar ingreso real, IVA y total | Cubierto | Billing cycles, items y pagos. |
| Separar mensualidad/setup/addons/CFDI excedentes | Cubierto | Tipos de items y cargos unicos. |
| Todo pago con referencia/nota/metodo | Cubierto | Pago manual acepta referencia, metodo y notas. |
| Pago asociado a billing cycle | Cubierto | `billingCycleId` en `SaasPayment`. |
| Estados de pago recomendados | Parcial | Enum incluye estados principales y `partially_applied`. |
| Reporte mensual de ingresos SaaS | Cubierto | CSV `/platform/reports/saas-income` y boton de descarga en Dashboard Platform. |
| Reporte cuentas por cobrar | Cubierto | CSV `/platform/reports/accounts-receivable` y boton de descarga en Dashboard Platform. |
| Reporte gastos | Pendiente | No hay modulo de gastos. |
| Reporte soporte por cliente | Pendiente | No hay modulo de registro de soporte. |
| CFDI SaaS propio | Fuera de alcance / pendiente futuro | No se implemento Facturapi ni emision fiscal del SaaS. |
| UUID CFDI del cobro SaaS | Pendiente futuro | Depende de Sprint Admin 3 / SaaS invoicing. |
| Separar facturacion del cliente vs SaaS | Cubierto por diseno | No se mezclo Facturapi operativo con cobro SaaS. |
| Regimen fiscal / cuenta bancaria | Pendiente administrativo | Decision externa al software. |

### 4. Pilot Deploy Readiness Roles V0.1

| Requisito | Estado | Evidencia / nota |
|---|---|---|
| No agregar `platform_admin` | Cubierto en implementacion | No se agrego rol nuevo. |
| `platform_owner` unico acceso Platform backend | Cubierto | `requirePlatformOwner` valida rol, scope, usuario activo y `organizationId = null`. |
| Usuarios organizacion no acceden a `/platform` backend | Cubierto | Test de rechazo en flujo Platform. |
| Ningun rol organizacional con permisos `platform.*` | Cubierto segun tests existentes | Test revisa roles seed principales. |
| `PlatformGuard` frontend | Ya cubierto en repo | Existe `apps/web/src/shared/guards/platform-guard.tsx`. |
| Bloqueo ventas por `suspended_limited` | Cubierto | `operational-access-service.ts` + tests. |
| Bloqueo ventas por `cancelled` | Cubierto | Servicio bloquea `cancelled`; cubierto por test explicito. |
| Bloqueo POS sin licencia | Cubierto | Servicio + test nuevo. |
| POS inactivo/bloqueado no opera | Cubierto | Servicio exige `status === active`; cubierto por test de POS inactivo licenciado. |
| Owner administra usuarios/sucursales/POS internos | Cubierto para piloto | Owner puede gestionar usuarios, sucursales y POS internos; crear sucursales/POS respeta limites contratados. |
| Owner no licencia POS | Cubierto | POS creado por Owner queda `licensed=false`; plataforma licencia. |
| Separar Manager de Owner | Cubierto para piloto | Comparten layout, pero administracion de negocio depende de `organization.view`; Mercado Pago/integraciones queda solo con `integrations.manage`, retirado de Manager. |
| Supervisor como PIN/autorizador o panel propio | Cubierto para piloto | `/app/supervisor` queda limitado a autorizaciones; no entra como gerente completo. |
| Ocultar todos los modulos que fallan sin mocks | Cubierto por revision tecnica | Produccion, conciliacion y retiros pendientes tienen endpoints reales con `VITE_USE_MOCKS=false`; queda pendiente QA manual navegada. |
| Confirmaciones antes de acciones de impacto | Parcial | Existen algunas confirmaciones; no se audito todo el checklist. |

## Validaciones ejecutadas

Pasaron:

```bash
npm run db:validate -w @tortilla-plus/api
npm run build -w @tortilla-plus/api
npm run test -w @tortilla-plus/api
npm run test:integration -w @tortilla-plus/api
npm run lint -w @tortilla-plus/web
npm run build -w @tortilla-plus/web
npm run build
```

Nota operativa: el build web requirio `NODE_OPTIONS=--max-old-space-size=4096` por consumo de memoria.

## Pendientes reales recomendados

### P0 - Para cerrar cobertura documental de billing/admin

Estado actual: P0 funcional cerrado.

Quedan como decisiones tecnicas opcionales, no bloqueantes:

1. Crear unit tests puros con IDs `BILL-UNIT-01` a `BILL-UNIT-09` si se quiere trazabilidad exacta por nomenclatura. La cobertura equivalente ya vive en integracion.
2. Separar `cfdi-usage-service` y `subscription-entitlement-service` si se quiere alinear arquitectura exactamente al backlog.
3. Instalar un cron/worker real para los endpoints internos de billing.

### P1 - Para readiness piloto completo

1. Auditar manualmente con `VITE_USE_MOCKS=false` todas las pantallas visibles de piloto.
2. Completar QA manual por rol:
   - PLAT;
   - OWN;
   - MAN;
   - CASH;
   - SUP solo si entra al piloto.
3. Revisar confirmaciones de impacto en todas las acciones Platform y POS/licencias.

### P2 - Futuro, fuera del alcance implementado

1. Facturacion CFDI propia del SaaS.
2. UUID CFDI asociado a cobros SaaS.
3. Cobro recurrente automatico.
4. Modulo de gastos/costos directos.
5. Registro formal de soporte por cliente y margen bruto real.

## Conclusion

El objetivo de billing mensual, pagos SaaS manuales, separacion contable basica y visibilidad Director/Owner esta cubierto para piloto.

La cobertura total de todos los documentos requiere una siguiente fase de readiness piloto y administracion avanzada. Esa fase no debe mezclar funcionalidades fuera de alcance como cobro automatico, Facturapi SaaS o `platform_admin`.
