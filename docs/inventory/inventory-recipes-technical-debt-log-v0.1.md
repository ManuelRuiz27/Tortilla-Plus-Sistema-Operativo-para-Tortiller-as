# Tortilla Plus - Deuda Tecnica Inventario con Recetas V0.1

**Area:** Inventario, produccion, insumos, recetas, POS y reparto  
**Roadmap asociado:** `docs/inventory/inventory-recipes-roadmap-v0.1.md`  
**Documento base:** `docs/inventory/inventory-core-recipes-update-v0.1.md`  
**Estado:** Registro vivo  
**Fecha:** 2026-06-09  

---

## 1. Regla de uso

Este archivo registra la deuda tecnica que aparezca durante cada sprint del parche de inventario con recetas.

Regla operativa:

```txt
La deuda critica de un sprint se atiende como prioridad del siguiente avance antes de agregar mas funcionalidad.
```

Si una deuda no se atiende en el siguiente avance, debe quedar marcada como `Aceptada temporalmente` con motivo, impacto y fecha de revision.

---

## 2. Estados permitidos

| Estado | Uso |
|---|---|
| Abierta | Detectada y pendiente de resolver. |
| En progreso | Se esta resolviendo en el avance actual. |
| Resuelta | Corregida y verificada. |
| Aceptada temporalmente | Se deja viva con justificacion y fecha de revision. |
| Cancelada | Ya no aplica por cambio de alcance o diseno. |

---

## 3. Severidad

| Severidad | Criterio |
|---|---|
| Critica | Puede duplicar stock, mezclar tenants, romper POS/reparto, perder auditoria o bloquear produccion real. |
| Alta | Afecta reglas de negocio importantes o genera trabajo manual riesgoso. |
| Media | Afecta mantenibilidad, pruebas, claridad de API o experiencia operativa. |
| Baja | Mejora conveniente que no bloquea operacion. |

---

## 4. Deuda inicial detectada antes de Sprint R1

| ID | Severidad | Estado | Area | Deuda | Prioridad siguiente avance | Notas |
|---|---|---|---|---|---|---|
| INV-REC-DEBT-001 | Critica | Resuelta | Inventario | `InventoryLedgerService` ya existe y `inventory-service.ts` lo usa para ajustes, produccion manual y mermas. | Sprint R2 | Remanentes de POS/reparto se separan en `INV-REC-DEBT-015` e `INV-REC-DEBT-016`. |
| INV-REC-DEBT-002 | Alta | Resuelta | POS | `createSaleItem` valida `isSellable === true` y bloquea productos no vendibles en backend con `PRODUCT_NOT_SELLABLE`. | Auditoria pre R5 | Confirmado/corregido en auditoria R1-R4; aplica a `addSaleItem`, `addSaleItems` y `checkoutSale`. |
| INV-REC-DEBT-003 | Alta | Resuelta | Reparto | Ruta bloquea explicitamente `raw_material` y `packaging` al crear/cotizar pedido y al resolver carga de stock. | Pre R3 | Resuelto antes de avanzar a R3 funcional. |
| INV-REC-DEBT-004 | Alta | Resuelta | Inventario | El ledger bloquea duplicados por referencia y existe indice unico parcial para movimientos con `referenceType` y `referenceId`. | Sprint R2 | Aplica a flujos que ya usan ledger. POS/reparto se cubren al migrarlos. |
| INV-REC-DEBT-005 | Alta | Resuelta | Modelo de datos | `ProductType` ya contempla `raw_material` y `packaging`; `Product` ya tiene `isRecipeIngredient` y `allowNegativeStock`. | Sprint R1 | Resuelto en migracion `0012_inventory_recipes_core`. |
| INV-REC-DEBT-006 | Alta | Resuelta | Produccion | `ProductionBatch` ya tiene comportamiento operativo por receta: snapshot de insumos, salida real, rendimiento y cierre con ledger. | Sprint R5 | Resuelto con `ProductionRecipeService`. |
| INV-REC-DEBT-007 | Media | Resuelta | Conversiones | `UnitConversion` ya existe con conversion por organizacion/producto y `name` obligatorio para evitar duplicados con `NULL`. | Sprint R1 | Resuelto en migracion `0012_inventory_recipes_core`. |
| INV-REC-DEBT-008 | Media | Resuelta | API | `GET /api/v1/inventory/movements` consulta movimientos con filtros por sucursal, producto, tipo, referencia, fechas y limite. | Pre R6 | Resuelto antes de iniciar R6. |
| INV-REC-DEBT-009 | Media | Resuelta | Pruebas | Se agregaron pruebas unitarias para calculo de ledger y referencia duplicada sin re-aplicar stock. | Sprint R2 | Queda pendiente QA de integracion por flujo cuando POS/reparto migren al ledger. |
| INV-REC-DEBT-010 | Media | Resuelta | Decisiones funcionales | Decisiones de salida de receta, masa->tortilla, agua, empaques, tolerancia y PIN por variacion alta quedaron registradas en R0. | Sprint R0 | Ver `inventory-recipes-r0-decisions-v0.1.md`. |
| INV-REC-DEBT-011 | Media | Aceptada temporalmente | Configuracion | Configuracion de tolerancia de rendimiento por organizacion se difiere; V1 aplica tolerancia fija en backend. | Futuro post R8 | Aceptada porque la regla fija ya esta implementada y no requiere configuracion por tenant para operar V1. Revision: post R8. |
| INV-REC-DEBT-012 | Baja | Aceptada temporalmente | Produccion | Agua queda como dato informativo en V1; si un cliente requiere control real, habra que modelarla como insumo inventariable. | Futuro | Aceptada porque no bloquea produccion por receta; se reabre solo si un cliente exige control de agua. |
| INV-REC-DEBT-013 | Media | Aceptada temporalmente | Produccion | Flujo formal `masa -> tortilla` queda preparado pero no se implementa como segundo paso obligatorio en V1. | Futuro post R8 | Aceptada porque R5 soporta recetas con salida masa o tortilla y no cierra la puerta al segundo paso. |
| INV-REC-DEBT-014 | Media | Aceptada temporalmente | Empaques | Descuento de empaques en venta queda fuera de V1; solo se descuentan en produccion si son ingrediente de receta. | Futuro post R8 | Aceptada porque POS/reparto ya estan protegidos y R5 puede consumir empaques si la receta los incluye. |
| INV-REC-DEBT-015 | Alta | Resuelta | POS | POS delega movimientos de venta y devolucion al `InventoryLedgerService`. | Pre R3 | Resuelto antes de avanzar a R3 funcional. |
| INV-REC-DEBT-016 | Alta | Resuelta | Reparto | Reparto delega carga y devoluciones al `InventoryLedgerService`. | Pre R3 | Resuelto antes de avanzar a R3 funcional. |
| INV-REC-DEBT-017 | Media | Resuelta | Productos | API no filtraba productos por `productType`, `isRecipeIngredient` ni `isSellable`. | Sprint R3 | Resuelto en R3. |
| INV-REC-DEBT-018 | Media | Resuelta | Frontend | Tipos/labels frontend no reconocian `raw_material` ni `packaging`. | Sprint R3 | Resuelto en R3 con ajuste minimo. |
| INV-REC-DEBT-019 | Media | Resuelta | Recetas/conversiones | `RecipeService` normaliza cantidades con `UnitConversion` activa cuando la unidad capturada difiere de la unidad base del producto. | Pre R5 | Resuelto antes de iniciar R5; se persisten cantidades en unidad base para evitar conversiones tardias al cerrar produccion. |
| INV-REC-DEBT-020 | Alta | Resuelta | Recetas | `RecipeService` ahora valida `isRecipeIngredient=true` para impedir que productos stockeables no autorizados sean consumidos como insumos. | Auditoria pre R5 | Resuelto antes de iniciar R5; mantiene permitido `raw_material`, `packaging` y `masa` solo si estan marcados como ingrediente de receta. |
| INV-REC-DEBT-023 | Media | Resuelta | Conversiones/API | API backend ya expone CRUD de `UnitConversion` y valida que toda conversion apunte a la unidad base del producto. | Sprint R6 | Resuelto en R6 con endpoints de listado, alta, edicion y baja logica de conversiones. |
| INV-REC-DEBT-024 | Alta | Resuelta | Produccion | `ProductionRecipeService` ahora aplica tolerancia fija de rendimiento: motivo desde 3% y autorizacion desde mas de 10%. | Post R6 | Resuelto antes de R7; agrega permiso `production.authorize_variance` y audita autorizador en movimientos de cierre. |
| INV-REC-DEBT-025 | Media | Resuelta | Frontend/API | Detalle de lote por receta requeria endpoint de lectura directa para soportar URL recuperable. | Sprint R7 | Resuelto con `GET /api/v1/production/recipe-batches/{id}` y pantalla de cierre conectada. |
| INV-REC-DEBT-026 | Media | Resuelta | QA/E2E | El entorno e2e no configuraba CORS para el servidor frontend de prueba, ejecutaba workers paralelos contra DB compartida y algunos tests usaban roles incorrectos para caja/facturacion. | Sprint R8 | Resuelto con `CORS_ORIGINS`, `workers=1` y ajuste de roles por flujo. |

---

## 5. Registro por sprint

### Sprint R0 - Preparacion y decisiones

**Objetivo del sprint:** cerrar decisiones minimas y preparar R1.  
**Estado:** Cerrado.  

| ID | Severidad | Estado | Deuda | Resolucion esperada |
|---|---|---|---|---|
| INV-REC-DEBT-010 | Media | Resuelta | Decisiones funcionales pendientes. | Registradas en `inventory-recipes-r0-decisions-v0.1.md`. |
| INV-REC-DEBT-011 | Media | Aceptada temporalmente | Tolerancia configurable por organizacion fuera de V1. | Revisar post R8 si clientes requieren umbrales por tenant. |
| INV-REC-DEBT-012 | Baja | Aceptada temporalmente | Agua informativa, no inventariable. | Reabrir si cliente requiere control de agua. |
| INV-REC-DEBT-013 | Media | Aceptada temporalmente | `masa -> tortilla` no obligatorio en V1. | Evaluar como mejora despues de produccion por receta basica. |
| INV-REC-DEBT-014 | Media | Aceptada temporalmente | Empaques no se descuentan en venta en V1. | Evaluar post R8; en V1 se descuentan si son ingrediente de receta. |

### Sprint R1 - Base de datos y contrato de dominio

**Objetivo del sprint:** migracion y modelos base.  
**Estado:** Completado.  
**Auditoria de deuda post R1:** Sin deuda bloqueante para iniciar R2.  

| ID | Severidad | Estado | Deuda | Resolucion esperada |
|---|---|---|---|---|
| INV-REC-DEBT-005 | Alta | Resuelta | Product types y campos faltantes en `Product`. | Migracion Prisma creada. |
| INV-REC-DEBT-006 | Alta | Resuelta | Produccion no soportaba comportamiento operativo por receta. | Resuelto en R5 con `ProductionRecipeService`. |
| INV-REC-DEBT-007 | Media | Resuelta | Conversiones de unidad inexistentes. | Modelo agregado con `name` obligatorio. |

### Auditoria post R2 - Deuda cerrada antes de R3

Antes de avanzar a R3 funcional se cerro la deuda tecnica de POS y reparto que seguia moviendo inventario directo:

| ID | Severidad | Estado | Accion siguiente |
|---|---|---|---|
| INV-REC-DEBT-002 | Alta | Resuelta | POS bloquea productos no vendibles desde `createSaleItem`. |
| INV-REC-DEBT-003 | Alta | Resuelta | Reparto bloquea insumos. |
| INV-REC-DEBT-015 | Alta | Resuelta | POS usa ledger. |
| INV-REC-DEBT-016 | Alta | Resuelta | Reparto usa ledger. |

### Sprint R2 - InventoryLedgerService

**Objetivo del sprint:** centralizar movimientos de inventario.  
**Estado:** Completado para alcance R2.  

| ID | Severidad | Estado | Deuda | Resolucion esperada |
|---|---|---|---|---|
| INV-REC-DEBT-001 | Critica | Resuelta | Movimientos de inventario en `inventory-service.ts` no usaban ledger. | Ledger creado; ajustes, produccion manual y mermas migrados. |
| INV-REC-DEBT-004 | Alta | Resuelta | Sin bloqueo de duplicados por referencia. | Ledger valida duplicado e indice unico parcial protege concurrencia. |
| INV-REC-DEBT-009 | Media | Resuelta | Falta cobertura de idempotencia. | Pruebas unitarias agregadas para calculo y duplicado por referencia. |
| INV-REC-DEBT-015 | Alta | Resuelta | POS movia stock directo. | Migrado al ledger antes de R3 funcional. |
| INV-REC-DEBT-016 | Alta | Resuelta | Reparto movia stock directo. | Migrado al ledger antes de R3 funcional. |

### Sprint R3 - Productos e insumos

**Objetivo del sprint:** insumos reales y bloqueos en POS/reparto.  
**Estado:** Completado.  

| ID | Severidad | Estado | Deuda | Resolucion esperada |
|---|---|---|---|---|
| INV-REC-DEBT-002 | Alta | Resuelta | POS podia crear item sin validar `isSellable`. | Bloqueado en backend antes de R3 funcional. |
| INV-REC-DEBT-003 | Alta | Resuelta | Reparto no bloqueaba insumos por tipo. | Bloqueado en backend antes de R3 funcional. |
| INV-REC-DEBT-015 | Alta | Resuelta | POS movia stock directo. | Migrado al ledger antes de R3 funcional. |
| INV-REC-DEBT-016 | Alta | Resuelta | Reparto movia stock directo. | Migrado al ledger antes de R3 funcional. |
| INV-REC-DEBT-017 | Media | Resuelta | API no filtraba productos por tipo/ingrediente/vendible. | `GET /products` ya acepta `productType`, `isRecipeIngredient` e `isSellable`. |
| INV-REC-DEBT-018 | Media | Resuelta | Frontend no reconocia `raw_material` ni `packaging`. | Tipos y etiquetas minimas actualizadas. |

### Sprint R4 - RecipeService

**Objetivo del sprint:** recetas versionadas sin inventario.  
**Estado:** Completado.  

| ID | Severidad | Estado | Deuda | Resolucion esperada |
|---|---|---|---|---|
| INV-REC-DEBT-019 | Media | Resuelta | Las recetas quedaban restringidas a la unidad base del producto; `UnitConversion` no se aplicaba en alta/versionado. | `RecipeService` acepta unidad distinta solo si existe conversion activa hacia la unidad base y guarda la cantidad normalizada. |
| INV-REC-DEBT-020 | Alta | Resuelta | `RecipeService` aceptaba ingredientes por ser stockeables, sin exigir `isRecipeIngredient=true`. | Validacion backend agregada con `INVALID_RECIPE_INGREDIENT`. |

### Auditoria pre R5 - Deuda cerrada antes de produccion por receta

Antes de iniciar R5 se cerraron los bloqueantes detectados en la auditoria R1-R4:

| ID | Severidad | Estado | Accion siguiente |
|---|---|---|---|
| INV-REC-DEBT-002 | Alta | Resuelta | POS no puede vender productos con `isSellable=false` por backend. |
| INV-REC-DEBT-019 | Media | Resuelta | R5 puede calcular snapshots y consumos sobre cantidades ya normalizadas a la unidad base del producto. |
| INV-REC-DEBT-020 | Alta | Resuelta | R5 solo recibira ingredientes autorizados explicitamente con `isRecipeIngredient=true`. |

**Estado pre R5:** R4 queda listo para avanzar a R5 despues de estas correcciones. No queda deuda critica o alta abierta que bloquee `ProductionRecipeService`.

### Sprint R5 - ProductionRecipeService

**Objetivo del sprint:** cierre de lote por receta con inventario real.  
**Estado:** Completado para alcance backend.  

| ID | Severidad | Estado | Deuda | Resolucion esperada |
|---|---|---|---|---|
| INV-REC-DEBT-021 | Baja | Resuelta | Prueba de integracion R5 no pudo ejecutarse localmente porque PostgreSQL no respondia en `localhost:5432`. | PostgreSQL se levanto con Docker, se aplicaron migraciones/seed y `recipe-operational-flow.test.js` paso 3/3. |
| INV-REC-DEBT-022 | Alta | Resuelta | Produccion por receta necesitaba descontar insumos, ingresar salida y bloquear doble cierre. | `ProductionRecipeService` creado con cierre transaccional via `InventoryLedgerService`. |

### Sprint R6 - Endpoints y QA backend

**Objetivo del sprint:** API completa y pruebas.  
**Estado:** Completado para alcance backend.  

| ID | Severidad | Estado | Deuda | Resolucion esperada |
|---|---|---|---|---|
| INV-REC-DEBT-008 | Media | Resuelta | Faltaba endpoint de movimientos. | `GET /api/v1/inventory/movements` agregado. |
| INV-REC-DEBT-023 | Media | Resuelta | Faltaban endpoints operativos de conversiones de unidad. | CRUD backend de `UnitConversion` agregado y validado con integracion. |
| INV-REC-DEBT-024 | Alta | Resuelta | R0 definia tolerancia fija y autorizacion por variacion alta, pero R5 solo calculaba rendimiento. | Cierre de lote por receta exige motivo entre 3% y 10%, exige autorizador con `production.authorize_variance` arriba de 10%, y registra autorizador en movimientos. |

**Estado post R6:** sin deuda critica o alta abierta que bloquee R7. Las deudas `INV-REC-DEBT-011` a `INV-REC-DEBT-014` siguen aceptadas temporalmente porque son decisiones funcionales futuras, no bloqueantes del backend R6; `INV-REC-DEBT-011` ya cuenta con regla fija backend y solo difiere configuracion por organizacion.

### Sprint R7 - Frontend minimo operativo

**Objetivo del sprint:** pantallas minimas para operar recetas.  
**Estado:** Completado para alcance frontend minimo.  

| ID | Severidad | Estado | Deuda | Resolucion esperada |
|---|---|---|---|---|
| INV-REC-DEBT-025 | Media | Resuelta | La pantalla de cierre necesitaba consultar un lote por receta por URL, pero solo existian acciones de crear/actualizar/cerrar. | `GET /api/v1/production/recipe-batches/{id}` agregado y conectado al detalle frontend. |

**Estado post R7:** sin deuda critica o alta abierta. Queda pendiente QA visual/e2e amplio como parte de R8.

### Sprint R8 - Hardening y reportabilidad base

**Objetivo del sprint:** cierre de deuda critica y release operativo.  
**Estado:** Completado.  

| ID | Severidad | Estado | Deuda | Resolucion esperada |
|---|---|---|---|---|
| INV-REC-DEBT-026 | Media | Resuelta | Configuracion e2e incompleta para validar frontend contra API real: CORS, concurrencia sobre DB compartida y roles por flujo. | Suite e2e completa pasa 7/7 con servidor frontend de prueba, API real y datos seed consistentes. |

**Estado post R8:** sin deuda critica o alta abierta. El parche de inventario con recetas queda listo para piloto operativo. La reportabilidad avanzada de rendimiento, consumo historico y merma detallada queda como fase futura sobre los movimientos auditables existentes, no como bloqueante del parche R0-R8.

### Post R8-A - Reportes de produccion y rendimiento

**Objetivo del avance:** convertir lotes, insumos y rendimiento en reporte operativo para gerencia.  
**Estado:** Completado para reporte operativo base.  

| ID | Severidad | Estado | Deuda | Resolucion esperada |
|---|---|---|---|---|
| N/A | N/A | N/A | Sin deuda critica o alta nueva detectada. | Avanzar a Post R8-B con piloto operativo controlado. |

**Estado post R8-A:** sin deuda critica o alta abierta. Quedan como mejoras futuras no bloqueantes la exportacion especifica del reporte de produccion, el pulido visual de estados de variacion y el reporte de stock bajo de insumos.

### Post R8-B - Piloto operativo controlado

**Objetivo del avance:** preparar ejecucion de piloto con datos demo, roles reales, checklist manual y validacion automatica.  
**Estado:** Preparado para ejecucion manual local/staging.  

| ID | Severidad | Estado | Deuda | Resolucion esperada |
|---|---|---|---|---|
| N/A | N/A | N/A | Sin deuda critica o alta nueva detectada en preparacion automatica. | Ejecutar checklist manual y registrar hallazgos antes de Post R8-C. |

**Estado post R8-B preparacion:** sin deuda critica o alta abierta. Queda pendiente la ejecucion manual en LAN/staging con dispositivos reales; cualquier hallazgo critico o alto se registrara antes de tolerancias configurables.

---

## 6. Formato para nuevas entradas

Agregar nuevas deudas con este formato:

```txt
ID:
Sprint origen:
Severidad:
Estado:
Area:
Descripcion:
Impacto:
Resolucion esperada:
Prioridad siguiente avance:
Fecha de revision:
Notas:
```

---

## 7. Criterio para avanzar de sprint

Antes de iniciar un nuevo sprint:

1. Revisar deuda del sprint anterior.
2. Resolver deuda critica.
3. Resolver deuda alta que afecte el nuevo alcance.
4. Marcar deuda aceptada temporalmente solo con justificacion.
5. Actualizar este archivo con estado real.
