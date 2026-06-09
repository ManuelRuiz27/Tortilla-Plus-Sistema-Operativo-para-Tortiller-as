# Tortilla Plus - Roadmap de Inventario con Recetas V0.1

**Producto:** Tortilla Plus - V1 Operativa Comercial  
**Area:** Inventario, produccion, insumos, recetas, POS y reparto  
**Documento base:** `docs/inventory/inventory-core-recipes-update-v0.1.md`  
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

- `npm run db:validate -w @tortilla-plus/api` pasa.
- `npm run build -w @tortilla-plus/api` pasa.
- Migracion Prisma queda versionada.
- El flujo actual de produccion manual no se rompe.
- La deuda detectada queda registrada en el log.

---

## 6. Sprint R2 - InventoryLedgerService

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

- Ajustes manuales usan ledger.
- Produccion manual usa ledger.
- Tests existentes pasan.
- Hay pruebas de idempotencia o bloqueo de duplicados.
- La deuda pendiente de POS/reparto queda priorizada.

---

## 7. Sprint R3 - Productos e insumos

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

- No se puede vender `raw_material`.
- No se puede cargar `raw_material` o `packaging` en ruta.
- Insumos aparecen en inventario si son stockeables.
- POS y reparto mantienen comportamiento anterior con tortilla, masa, package y retail.

---

## 8. Sprint R4 - RecipeService

### Objetivo

Crear recetas versionadas sin afectar inventario.

### Alcance

- Crear `RecipeService`.
- Crear receta con version inicial.
- Crear nueva version.
- Listar recetas.
- Obtener detalle con version e ingredientes.
- Activar version.
- Archivar receta.
- Validar output e ingredientes.
- Validar duplicados.
- Validar pertenencia a organizacion y sucursal.

### Definition of Done

- Receta sin ingredientes se bloquea.
- Output no puede repetirse como ingrediente.
- Ingredientes deben ser stockeables.
- Cambios relevantes crean version nueva.
- Solo una version queda activa por receta.

---

## 9. Sprint R5 - ProductionRecipeService

### Objetivo

Hacer operativo el lote por receta con movimientos reales de inventario.

### Alcance

- Crear lote desde `recipeVersionId`.
- Calcular ingredientes esperados.
- Crear snapshot en `ProductionBatchIngredient`.
- Permitir actualizar insumos reales.
- Permitir capturar salida real.
- Calcular rendimiento.
- Cerrar lote con transaccion.
- Descontar insumos reales via `InventoryLedgerService`.
- Aumentar producto producido via `InventoryLedgerService`.
- Bloquear doble cierre.
- Registrar auditoria.

### Definition of Done

- Cierre descuenta insumos.
- Cierre aumenta masa/tortilla.
- Cierre deja movimientos auditables.
- Doble cierre no duplica stock.
- Version historica de receta no se altera.

---

## 10. Sprint R6 - Endpoints y QA backend

### Objetivo

Exponer API completa y cubrir flujos principales.

### Alcance

- Endpoints de conversiones.
- Endpoints de recetas.
- Endpoints de produccion por receta.
- Endpoint de movimientos de inventario.
- Tests QA-INV-REC-001 a QA-INV-REC-020 segun prioridad.
- Actualizar OpenAPI o addendum si aplica.

### Definition of Done

- API permite operar el flujo completo sin frontend.
- Tests principales pasan.
- Errores de dominio son consistentes.
- Auditoria y movimientos se pueden consultar.

---

## 11. Sprint R7 - Frontend minimo operativo

### Objetivo

Agregar las pantallas necesarias para operar recetas sin saturar el POS.

### Alcance

- Pantalla de insumos.
- Pantalla de recetas.
- Pantalla de nuevo lote.
- Pantalla de detalle/cierre de lote.
- Ajustes minimos a productos.
- Ajustes minimos a inventario.
- Filtro en POS para ocultar insumos.
- Filtro en rutas para no cargar insumos.

### Definition of Done

- Gerente puede crear insumos.
- Gerente puede crear receta.
- Encargado puede iniciar lote.
- Encargado puede cerrar lote.
- POS no muestra insumos.

---

## 12. Sprint R8 - Hardening y reportabilidad base

### Objetivo

Cerrar deuda critica, validar integracion y preparar reportes futuros.

### Alcance

- QA end to end backend/frontend.
- Revision de auditoria.
- Revision de idempotencia.
- Revision de permisos.
- Validacion multi-tenant.
- Documentar decisiones finales.
- Preparar base para reportes de rendimiento, consumo y merma.

### Definition of Done

- No hay deuda critica abierta del parche.
- Flujo completo probado con datos reales de sucursal.
- Documentacion de operacion actualizada.
- Reportes quedan documentados para una fase posterior.

---

## 13. Gates de calidad

### Gate R-A - Antes de recetas

- Schema migrado.
- Ledger creado.
- Ajustes y produccion manual usan ledger.

### Gate R-B - Antes de frontend

- API de recetas completa.
- Produccion por receta modifica inventario real.
- Doble cierre bloqueado.

### Gate R-C - Antes de release

- POS y rutas bloquean insumos.
- Movimientos de inventario consultables.
- QA principal ejecutado.
- Deuda critica cerrada o explicitamente aceptada.

---

## 14. Riesgos activos

- Movimientos de inventario duplicados por no centralizar antes de recetas.
- POS o reparto vendiendo/cargando insumos por falta de validacion backend.
- Recetas visuales que no afectan inventario.
- Conversiones de unidad ambiguas.
- Tolerancias de rendimiento sin autorizacion clara.
- Deuda tecnica no cerrada antes de avanzar al siguiente sprint.
