# Tortilla Plus - Roadmap de Inventario con Recetas V0.1

**Producto:** Tortilla Plus - V1 Operativa Comercial  
**Area:** Inventario, produccion, insumos, recetas, POS y reparto  
**Documento base:** `docs/inventory/inventory-core-recipes-update-v0.1.md`  
**Fuente de verdad funcional:** `docs/system-modules-and-flows-source-of-truth-v0.1.md`  
**Roadmap siguiente fase:** `docs/inventory/inventory-recipes-post-r8-roadmap-v0.1.md`  
**Estado:** Roadmap de ejecucion  
**Fecha:** 2026-06-09  

---

## 1. Proposito

Este roadmap convierte la propuesta de recetas en una secuencia de desarrollo controlada.

La regla principal es no construir pantallas ni CRUDs de recetas antes de tener el nucleo de inventario preparado. El cierre de un lote por receta debe descontar insumos, aumentar producto producido y dejar movimientos auditables.

---

## 2. Regla de avance

Cada sprint puede dejar deuda tecnica, pero esa deuda se registra en:

```txt
docs/inventory/inventory-recipes-technical-debt-log-v0.1.md
```

La deuda critica de un sprint se vuelve prioridad del siguiente avance antes de agregar mas alcance funcional.

---

## 3. Roadmap general

| Sprint | Nombre | Resultado esperado |
|---|---|---|
| Sprint R0 | Preparacion y decisiones | Alcance cerrado, decisiones funcionales minimas y deuda inicial registrada. |
| Sprint R1 | Base de datos y contrato de dominio | Schema Prisma, migracion y modelos base para insumos, conversiones, recetas y produccion por receta. |
| Sprint R2 | InventoryLedgerService | Un solo servicio para modificar stock, con idempotencia, auditoria y reglas de stock negativo. |
| Sprint R3 | Productos e insumos | Productos soportan `raw_material` y `packaging`, filtros nuevos y bloqueo de venta/carga de insumos. |
| Sprint R4 | RecipeService | CRUD operativo de recetas y versiones sin tocar stock. |
| Sprint R5 | ProductionRecipeService | Lotes desde receta, captura real, cierre, consumo de insumos y entrada de producto producido. |
| Sprint R6 | Endpoints y QA backend | Endpoints completos de conversiones, recetas, produccion por receta y movimientos. |
| Sprint R7 | Frontend minimo operativo | Pantallas de insumos, recetas, nuevo lote y cierre de lote. |
| Sprint R8 | Hardening y reportabilidad base | QA end to end, auditoria, documentacion y preparacion para reportes de rendimiento. |

---

## 4. Sprint R0 - Preparacion y decisiones

**Estado:** Cerrado para iniciar Sprint R1.  
**Decisiones:** `docs/inventory/inventory-recipes-r0-decisions-v0.1.md`

### Objetivo

Cerrar las decisiones que cambian el modelo antes de tocar codigo.

### Alcance

- Confirmar si V1 produce `masa`, `tortilla` o ambos como salida de receta.
- Confirmar si `masa -> tortilla` entra como segundo paso desde el inicio.
- Confirmar politica de stock negativo en ruta para `tortilla` y `masa`.
- Confirmar si `raw_material` puede quedar negativo con autorizacion.
- Confirmar si agua se controla como insumo inventariable o informativo.
- Confirmar si empaques se descuentan en produccion o en venta.
- Confirmar si tolerancias de rendimiento son globales o configurables por organizacion.
- Registrar deuda tecnica inicial del estado actual.

### Definition of Done

- Decisiones minimas registradas. Completado.
- Primer corte de deuda tecnica creado. Completado.
- Scope de R1 aprobado. Completado.

### Deuda que bloquea el siguiente sprint si no se resuelve

- Ninguna deuda bloqueante queda abierta para iniciar R1.
- Las decisiones no bloqueantes quedaron registradas como deuda futura en el log.

---

## 5. Sprint R1 - Base de datos y contrato de dominio

**Estado:** Completado.  
**Migracion:** `apps/api/prisma/migrations/0012_inventory_recipes_core/migration.sql`

### Objetivo

Preparar el schema para recetas sin cambiar todavia el comportamiento de POS ni reparto.

### Alcance

- Agregar `raw_material` y `packaging` a `ProductType`.
- Agregar `isRecipeIngredient` y `allowNegativeStock` a `Product`.
- Agregar `UnitConversion`.
- Agregar `Recipe`.
- Agregar `RecipeVersion`.
- Agregar `RecipeIngredient`.
- Agregar `ProductionMode`.
- Extender `ProductionBatch`.
- Agregar `ProductionBatchIngredient`.
- Agregar tipos de movimiento necesarios para consumo por produccion.
- Preferir `Recipe.currentVersionId` sobre `Recipe.currentVersion Int` si Prisma/migracion lo permiten sin complejidad excesiva.
- Mantener campos nuevos de `ProductionBatch` como nullable/default para no romper produccion manual.
- Crear migracion Prisma.
- Actualizar seed solo si hace falta para que el entorno local siga funcionando.
- Agregar tests unitarios minimos de calculos y validaciones puras si aplica.

### Fuera de alcance

- Pantallas nuevas.
- Cierre de lote por receta.
- Refactor completo de POS o reparto.

### Definition of Done

- `npm run db:validate -w @tortilla-plus/api` pasa. Completado.
- `npm run build -w @tortilla-plus/api` pasa. Completado.
- Migracion Prisma queda versionada. Completado.
- El flujo actual de produccion manual no se rompe. Completado por compatibilidad de schema; queda sujeto a QA de R2/R5.
- La deuda detectada queda registrada en el log. Completado.
- Auditoria post R1 sin deuda bloqueante para iniciar R2. Completado.

---

## 6. Sprint R2 - InventoryLedgerService

**Estado:** Completado para alcance R2.  
**Servicio:** `apps/api/src/services/inventory-ledger-service.ts`  
**Migracion:** `apps/api/prisma/migrations/0013_inventory_ledger_reference_uniqueness/migration.sql`

### Objetivo

Centralizar movimientos de inventario antes de introducir produccion por receta.

### Alcance

- Crear `InventoryLedgerService`.
- Implementar `applyMovement`.
- Soportar movimientos de entrada y salida.
- Resolver `InventoryStock` con upsert controlado.
- Validar producto activo, stockeable y tenant.
- Validar stock negativo segun politica.
- Bloquear duplicados por `referenceType`, `referenceId` y `movementType` cuando aplique.
- Refactorizar ajustes manuales y produccion manual para usar ledger.
- Mantener compatibilidad con pruebas existentes.

### Fuera de alcance

- Refactor completo de POS y reparto si el riesgo excede el sprint.
- Recetas.

### Definition of Done

- Ajustes manuales usan ledger. Completado.
- Produccion manual usa ledger. Completado.
- Mermas usan ledger. Completado como extension del alcance.
- Tests existentes pasan. Completado.
- Hay pruebas de idempotencia o bloqueo de duplicados. Completado con prueba unitaria e indice unico parcial.
- La deuda pendiente de POS/reparto queda priorizada. Completado.

---

## 7. Sprint R3 - Productos e insumos

**Estado:** Completado.  
**Deuda tecnica previa:** POS/reparto ya delegan movimientos al ledger y bloquean productos no operables antes de iniciar R3 funcional.

### Objetivo

Permitir registrar insumos y bloquear que entren a flujos de venta o reparto.

### Alcance

- `POST /api/v1/products` acepta `raw_material` y `packaging`.
- `GET /api/v1/products` soporta filtros `productType`, `isRecipeIngredient` e `isSellable`.
- Validar defaults por tipo de producto.
- Bloquear POS backend para productos no vendibles.
- Bloquear reparto backend para `raw_material` y `packaging`.
- Mantener paquetes descontando producto base.

### Definition of Done

- No se puede vender `raw_material`. Completado.
- No se puede cargar `raw_material` o `packaging` en ruta. Completado.
- Insumos aparecen en inventario si son stockeables. Completado.
- POS y reparto mantienen comportamiento anterior con tortilla, masa, package y retail. Completado.
- `GET /api/v1/products` soporta filtros `productType`, `isRecipeIngredient` e `isSellable`. Completado.
- API y tipos frontend reconocen `raw_material` y `packaging`. Completado.

---

## 8. Sprint R4 - RecipeService

**Estado:** Completado.  
**Servicio:** `apps/api/src/services/recipe-service.ts`  
**Rutas:** `apps/api/src/server.ts`  
**Pruebas:** `apps/api/tests/recipe-service.test.ts`

### Objetivo

Crear recetas versionadas sin afectar inventario.

### Alcance

- Crear `RecipeService`.
- Crear receta con version inicial. Completado.
- Crear nueva version. Completado.
- Listar recetas. Completado.
- Obtener detalle con version e ingredientes. Completado.
- Activar version. Completado.
- Archivar receta mediante cambio de `status` y archivar versiones no activas. Completado.
- Validar output e ingredientes. Completado.
- Validar duplicados. Completado.
- Validar pertenencia a organizacion y sucursal. Completado.
- Agregar permisos `recipes.view` y `recipes.manage`. Completado.
- Exponer endpoints backend minimos de recetas/versiones. Completado como adelanto de R6.

### Definition of Done

- Receta sin ingredientes se bloquea. Completado.
- Output no puede repetirse como ingrediente. Completado.
- Ingredientes deben ser stockeables. Completado.
- Unidades alternativas se aceptan solo con `UnitConversion` activa y se guardan normalizadas a unidad base. Completado.
- Cambios relevantes crean version nueva. Completado.
- Solo una version queda activa por receta. Completado.
- `npm run db:validate -w @tortilla-plus/api` pasa. Completado.
- `npm run build -w @tortilla-plus/api` pasa. Completado.
- `npm run test -w @tortilla-plus/api` pasa. Completado.

### Deuda tecnica post R4

- `INV-REC-DEBT-019`: Resuelta antes de R5. `RecipeService` normaliza cantidades con conversion activa hacia la unidad base del producto.
- `INV-REC-DEBT-020`: Resuelta antes de R5. `RecipeService` exige `isRecipeIngredient=true` para aceptar productos como ingredientes.
- `INV-REC-DEBT-002`: Confirmada/corregida antes de R5. `createSaleItem` bloquea productos con `isSellable=false`.
- Sin deuda critica o alta abierta que bloquee R5.

---

## 9. Sprint R5 - ProductionRecipeService

**Estado:** Completado para alcance backend.  
**Servicio:** `apps/api/src/services/production-recipe-service.ts`  
**Rutas:** `apps/api/src/server.ts`  
**Pruebas:** `apps/api/tests/production-recipe-service.test.ts`, `apps/api/tests/integration/recipe-operational-flow.test.ts`  
**Deuda tecnica previa:** conversiones de receta cerradas; ingredientes no autorizados bloqueados; POS bloquea productos no vendibles desde backend.

### Objetivo

Hacer operativo el lote por receta con movimientos reales de inventario.

### Alcance

- Crear lote desde `recipeVersionId`. Completado.
- Calcular ingredientes esperados. Completado.
- Crear snapshot en `ProductionBatchIngredient`. Completado.
- Permitir actualizar insumos reales. Completado.
- Permitir capturar salida real. Completado.
- Calcular rendimiento. Completado.
- Cerrar lote con transaccion. Completado.
- Descontar insumos reales via `InventoryLedgerService`. Completado.
- Aumentar producto producido via `InventoryLedgerService`. Completado.
- Bloquear doble cierre. Completado.
- Registrar auditoria. Completado.

### Definition of Done

- Cierre descuenta insumos. Completado por servicio; prueba de integracion agregada.
- Cierre aumenta masa/tortilla. Completado por servicio; prueba de integracion agregada.
- Cierre deja movimientos auditables. Completado.
- Doble cierre no duplica stock. Completado por bloqueo de lote cerrado.
- Version historica de receta no se altera. Completado: el lote usa snapshot en `ProductionBatchIngredient`.
- `npm run db:validate -w @tortilla-plus/api` pasa. Completado.
- `npm run build -w @tortilla-plus/api` pasa. Completado.
- `npm run test -w @tortilla-plus/api` pasa. Completado.
- Integracion R5 pasa contra PostgreSQL local. Completado.

### Endpoints R5 agregados

- `POST /api/v1/production/recipe-batches`
- `PATCH /api/v1/production/recipe-batches/{id}/actuals`
- `PATCH /api/v1/production/recipe-batches/{id}/close`

### Deuda tecnica post R5

- Sin deuda critica o alta detectada en el codigo R5.
- `INV-REC-DEBT-021`: Resuelta; PostgreSQL local levantado con Docker, migraciones/seed aplicados e integracion R5 ejecutada.
- `INV-REC-DEBT-008`: Resuelta antes de R6 con `GET /api/v1/inventory/movements`.

---

## 10. Sprint R6 - Endpoints y QA backend

**Estado:** Completado para alcance backend.  
**Rutas:** `apps/api/src/server.ts`  
**Servicios:** `apps/api/src/services/inventory-service.ts`, `apps/api/src/services/recipe-service.ts`, `apps/api/src/services/production-recipe-service.ts`  
**Pruebas:** `apps/api/tests/integration/recipe-operational-flow.test.ts`  

### Objetivo

Exponer API completa y cubrir flujos principales.

### Alcance

- Endpoints de conversiones. Completado.
- Endpoints de recetas. Completado desde R4.
- Endpoints de produccion por receta. Completado desde R5.
- Endpoint de movimientos de inventario. Completado antes de iniciar R6.
- Tests QA-INV-REC-001 a QA-INV-REC-020 segun prioridad. Cobertura principal backend completada.
- Actualizar OpenAPI o addendum si aplica. Documentado en especificacion base y roadmap.

### Definition of Done

- API permite operar el flujo completo sin frontend. Completado.
- Tests principales pasan. Completado.
- Errores de dominio son consistentes. Completado para conversiones, recetas, POS y produccion por receta.
- Auditoria y movimientos se pueden consultar. Completado.

### Endpoints R6 agregados

- `GET /api/v1/products/{productId}/unit-conversions`
- `POST /api/v1/products/{productId}/unit-conversions`
- `PATCH /api/v1/unit-conversions/{id}`
- `DELETE /api/v1/unit-conversions/{id}`
- `GET /api/v1/inventory/movements`

### Validacion R6

- `npm run db:validate -w @tortilla-plus/api`: Completado.
- `npm run build -w @tortilla-plus/api`: Completado.
- `npm run test -w @tortilla-plus/api`: Completado.
- `npm run test:integration -w @tortilla-plus/api`: Completado, 51/51 pruebas.
- Integracion especifica `recipe-operational-flow.test.js`: cubierta dentro de la suite, 5/5 pruebas.

### Deuda tecnica post R6

- Sin deuda critica o alta abierta que bloquee R7.
- `INV-REC-DEBT-023`: Resuelta; CRUD backend de `UnitConversion` agregado con validacion hacia unidad base del producto.
- `INV-REC-DEBT-024`: Resuelta; cierre por receta aplica tolerancia fija de rendimiento, motivo obligatorio y autorizacion por variacion alta.
- La deuda futura aceptada temporalmente se mantiene fuera del alcance backend R6.

---

## 11. Sprint R7 - Frontend minimo operativo

**Estado:** Completado para alcance frontend minimo.  
**Rutas frontend:** `apps/web/src/app/router.tsx`  
**Paginas:** `inputs-page.tsx`, `recipes-page.tsx`, `production-recipe-new-page.tsx`, `production-recipe-batch-page.tsx`  

### Objetivo

Agregar las pantallas necesarias para operar recetas sin saturar el POS.

### Alcance

- Pantalla de insumos. Completado.
- Pantalla de recetas. Completado.
- Pantalla de nuevo lote. Completado.
- Pantalla de detalle/cierre de lote. Completado.
- Ajustes minimos a productos. Completado.
- Ajustes minimos a inventario. Completado mediante acceso a insumos y conversiones.
- Ajustes minimos a produccion. Completado con accesos a receta/nuevo lote/cierre.
- Filtro en POS para ocultar insumos. Completado previamente por backend y filtro frontend de productos vendibles.
- Filtro en rutas para no cargar insumos. Completado previamente por backend.

### Definition of Done

- Gerente puede crear insumos. Completado.
- Gerente puede crear receta. Completado.
- Encargado puede iniciar lote. Completado.
- Encargado puede cerrar lote. Completado.
- POS no muestra insumos. Completado.

### Validacion R7

- `npm run build -w @tortilla-plus/web`: Completado.
- `npm run build -w @tortilla-plus/api`: Completado.

### Deuda tecnica post R7

- Sin deuda critica o alta detectada en el alcance frontend minimo.
- Queda pendiente QA visual/e2e amplio para R8.

---

## 12. Sprint R8 - Hardening y reportabilidad base

**Estado:** Completado.  
**Pruebas:** `apps/web/e2e/inventory-recipes.spec.ts`, suite e2e completa, suite de integracion API.  

### Objetivo

Cerrar deuda critica, validar integracion y preparar reportes futuros.

### Alcance

- QA end to end backend/frontend. Completado.
- Revision de auditoria. Completado con movimientos consultables y e2e de cierre por receta.
- Revision de idempotencia. Completado sobre pruebas existentes de ledger/POS.
- Revision de permisos. Completado; e2e ajustado para roles correctos y CORS de entorno audit.
- Validacion multi-tenant. Completado en suite de integracion existente.
- Documentar decisiones finales. Completado.
- Preparar base para reportes de rendimiento, consumo y merma. Completado como base de datos/API; reportes detallados quedan fase posterior.

### Definition of Done

- No hay deuda critica abierta del parche. Completado.
- Flujo completo probado con datos reales de sucursal. Completado con e2e `inventory-recipes`.
- Documentacion de operacion actualizada. Completado.
- Reportes quedan documentados para una fase posterior. Completado.

### Validacion R8

- `npm run db:validate -w @tortilla-plus/api`: Completado.
- `npm run test -w @tortilla-plus/api`: Completado, 46/46.
- `npm run test:integration -w @tortilla-plus/api`: Completado, 52/52.
- `npm run build -w @tortilla-plus/web`: Completado.
- `npm run test:e2e -w @tortilla-plus/web`: Completado, 7/7.

### Deuda tecnica post R8

- Sin deuda critica o alta abierta del parche.
- `INV-REC-DEBT-026`: Resuelta; entorno e2e ahora configura CORS, corre serializado contra DB compartida y usa roles correctos por flujo.
- Reportes especificos de rendimiento/consumo/merma quedan como fase futura sobre movimientos y yield ya persistidos.

---

## 13. Gates de calidad

### Gate R-A - Antes de recetas

- Schema migrado.
- Ledger creado.
- Ajustes y produccion manual usan ledger.

### Gate R-B - Antes de frontend

- API de recetas completa.
- Recetas guardan cantidades normalizadas para consumo de inventario.
- Produccion por receta modifica inventario real.
- Doble cierre bloqueado.

### Gate R-C - Antes de release

- POS y rutas bloquean insumos.
- Movimientos de inventario consultables.
- QA principal ejecutado.
- Deuda critica cerrada o explicitamente aceptada.

---

## 14. Riesgos activos

- Recetas visuales que no afectan inventario.
- Tolerancias de rendimiento sin autorizacion clara.
- Deuda tecnica no cerrada antes de avanzar al siguiente sprint.

---

## 15. Cobertura implementada hasta ahora

### R0-R1

- Decisiones funcionales registradas en `docs/inventory/inventory-recipes-r0-decisions-v0.1.md`.
- Schema y migracion base para insumos, conversiones, recetas, versiones, ingredientes y produccion por receta.

### R2

- `InventoryLedgerService` centraliza movimientos de inventario.
- Ajustes manuales, produccion manual, mermas, POS y reparto delegan movimientos al ledger.
- Indice unico parcial protege movimientos duplicados con referencia.

### R3

- Productos soportan `raw_material` y `packaging`.
- Backend bloquea venta/carga de productos no operables.
- API y tipos frontend reconocen nuevos tipos y filtros.

### R4

- `RecipeService` crea, lista, consulta, versiona, activa y archiva recetas/versiones sin tocar stock.
- Permisos `recipes.view` y `recipes.manage` agregados al catalogo.
- Endpoints backend minimos de recetas/versiones disponibles.
- Validaciones de receta cubren ingredientes vacios, duplicados, output como ingrediente, pertenencia tenant/sucursal, producto stockeable y conversiones de unidad.
- Cantidades de receta se persisten normalizadas a la unidad base del producto cuando se usa `UnitConversion`.

### R5

- `ProductionRecipeService` crea lotes desde receta, guarda snapshot de insumos, captura reales y cierra con movimientos de inventario.
- El cierre descuenta insumos reales, ingresa producto producido y bloquea doble cierre.
- La integracion backend verifica receta, version activa, conversiones, cierre de lote y movimientos auditables.

### R6

- API backend expone conversiones de unidad por producto.
- API backend expone consulta de movimientos de inventario con filtros operativos.
- Los endpoints de recetas y produccion por receta quedan disponibles junto con pruebas principales.
- Produccion por receta aplica reglas V1 de variacion: motivo desde 3% y autorizacion `production.authorize_variance` arriba de 10%.
- PostgreSQL local fue validado con migraciones, seed e integracion backend.

### R7

- Frontend manager agrega navegacion a insumos y recetas.
- Productos permite marcar ingrediente de receta y negativo permitido cuando aplique.
- Insumos permite crear `raw_material`/`packaging` y configurar conversiones.
- Recetas permite crear receta con salida e ingredientes.
- Produccion permite crear lote por receta y cerrar lote con captura real, motivo y autorizacion de variacion alta.

### R8

- E2E backend/frontend valida cierre de lote por receta desde UI y movimientos auditables.
- Suite e2e completa corre con mocks desactivados y API real.
- Suite de integracion API mantiene cobertura de POS, rutas, facturacion, plataforma, recetas y produccion por receta.
- El parche queda sin deuda critica o alta abierta.

---

## 16. Siguiente fase post R8

El parche R0-R8 queda cerrado. Las actualizaciones posteriores se gestionan en:

```txt
docs/inventory/inventory-recipes-post-r8-roadmap-v0.1.md
```

Ese roadmap debe respetar la fuente de verdad funcional del proyecto:

```txt
docs/system-modules-and-flows-source-of-truth-v0.1.md
```

Orden recomendado:

1. Reportes de produccion y rendimiento.
2. Piloto operativo controlado.
3. Tolerancias configurables si el piloto lo exige.
4. Flujo formal `masa -> tortilla` si la operacion real trabaja en dos pasos.
5. Empaques y agua avanzados solo con evidencia operativa.
