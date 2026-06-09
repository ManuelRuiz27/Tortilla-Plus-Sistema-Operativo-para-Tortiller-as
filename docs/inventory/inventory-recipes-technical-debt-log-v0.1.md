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
| INV-REC-DEBT-002 | Alta | Resuelta | POS | `createSaleItem` valida `isSellable` y bloquea productos no vendibles en backend. | Pre R3 | Resuelto antes de avanzar a R3 funcional. |
| INV-REC-DEBT-003 | Alta | Resuelta | Reparto | Ruta bloquea explicitamente `raw_material` y `packaging` al crear/cotizar pedido y al resolver carga de stock. | Pre R3 | Resuelto antes de avanzar a R3 funcional. |
| INV-REC-DEBT-004 | Alta | Resuelta | Inventario | El ledger bloquea duplicados por referencia y existe indice unico parcial para movimientos con `referenceType` y `referenceId`. | Sprint R2 | Aplica a flujos que ya usan ledger. POS/reparto se cubren al migrarlos. |
| INV-REC-DEBT-005 | Alta | Resuelta | Modelo de datos | `ProductType` ya contempla `raw_material` y `packaging`; `Product` ya tiene `isRecipeIngredient` y `allowNegativeStock`. | Sprint R1 | Resuelto en migracion `0012_inventory_recipes_core`. |
| INV-REC-DEBT-006 | Alta | Aceptada temporalmente | Produccion | `ProductionBatch` ya tiene contrato de schema para receta, salida esperada/real, rendimiento y snapshot de insumos; falta comportamiento operativo. | Sprint R5 | Aceptada porque R1 solo cubre contrato de datos. Se revisa al iniciar R5. |
| INV-REC-DEBT-007 | Media | Resuelta | Conversiones | `UnitConversion` ya existe con conversion por organizacion/producto y `name` obligatorio para evitar duplicados con `NULL`. | Sprint R1 | Resuelto en migracion `0012_inventory_recipes_core`. |
| INV-REC-DEBT-008 | Media | Abierta | API | No hay endpoint para consultar movimientos de inventario con filtros. | Sprint R6 | Necesario para auditoria operativa. |
| INV-REC-DEBT-009 | Media | Resuelta | Pruebas | Se agregaron pruebas unitarias para calculo de ledger y referencia duplicada sin re-aplicar stock. | Sprint R2 | Queda pendiente QA de integracion por flujo cuando POS/reparto migren al ledger. |
| INV-REC-DEBT-010 | Media | Resuelta | Decisiones funcionales | Decisiones de salida de receta, masa->tortilla, agua, empaques, tolerancia y PIN por variacion alta quedaron registradas en R0. | Sprint R0 | Ver `inventory-recipes-r0-decisions-v0.1.md`. |
| INV-REC-DEBT-011 | Media | Abierta | Configuracion | Tolerancia de rendimiento sera fija en V1; configuracion por organizacion queda pendiente. | Futuro post R8 | No bloquea R1. |
| INV-REC-DEBT-012 | Baja | Abierta | Produccion | Agua queda como dato informativo en V1; si un cliente requiere control real, habra que modelarla como insumo inventariable. | Futuro | No bloquea R1. |
| INV-REC-DEBT-013 | Media | Abierta | Produccion | Flujo formal `masa -> tortilla` queda preparado pero no se implementa como segundo paso obligatorio en V1. | Futuro post R5 | No bloquea R1; el modelo debe no cerrarle la puerta. |
| INV-REC-DEBT-014 | Media | Abierta | Empaques | Descuento de empaques en venta queda fuera de V1; solo se descuentan en produccion si son ingrediente de receta. | Futuro post R7 | No bloquea R1. |
| INV-REC-DEBT-015 | Alta | Resuelta | POS | POS delega movimientos de venta y devolucion al `InventoryLedgerService`. | Pre R3 | Resuelto antes de avanzar a R3 funcional. |
| INV-REC-DEBT-016 | Alta | Resuelta | Reparto | Reparto delega carga y devoluciones al `InventoryLedgerService`. | Pre R3 | Resuelto antes de avanzar a R3 funcional. |
| INV-REC-DEBT-017 | Media | Resuelta | Productos | API no filtraba productos por `productType`, `isRecipeIngredient` ni `isSellable`. | Sprint R3 | Resuelto en R3. |
| INV-REC-DEBT-018 | Media | Resuelta | Frontend | Tipos/labels frontend no reconocian `raw_material` ni `packaging`. | Sprint R3 | Resuelto en R3 con ajuste minimo. |
| INV-REC-DEBT-019 | Media | Resuelta | Recetas/conversiones | `RecipeService` normaliza cantidades con `UnitConversion` activa cuando la unidad capturada difiere de la unidad base del producto. | Pre R5 | Resuelto antes de iniciar R5; se persisten cantidades en unidad base para evitar conversiones tardias al cerrar produccion. |

---

## 5. Registro por sprint

### Sprint R0 - Preparacion y decisiones

**Objetivo del sprint:** cerrar decisiones minimas y preparar R1.  
**Estado:** Cerrado.  

| ID | Severidad | Estado | Deuda | Resolucion esperada |
|---|---|---|---|---|
| INV-REC-DEBT-010 | Media | Resuelta | Decisiones funcionales pendientes. | Registradas en `inventory-recipes-r0-decisions-v0.1.md`. |
| INV-REC-DEBT-011 | Media | Abierta | Tolerancia configurable por organizacion fuera de V1. | Revisar despues de validar flujo operativo. |
| INV-REC-DEBT-012 | Baja | Abierta | Agua informativa, no inventariable. | Reabrir si cliente requiere control de agua. |
| INV-REC-DEBT-013 | Media | Abierta | `masa -> tortilla` no obligatorio en V1. | Evaluar como mejora despues de produccion por receta basica. |
| INV-REC-DEBT-014 | Media | Abierta | Empaques no se descuentan en venta en V1. | Evaluar despues de pantalla de cierre y POS. |

### Sprint R1 - Base de datos y contrato de dominio

**Objetivo del sprint:** migracion y modelos base.  
**Estado:** Completado.  
**Auditoria de deuda post R1:** Sin deuda bloqueante para iniciar R2.  

| ID | Severidad | Estado | Deuda | Resolucion esperada |
|---|---|---|---|---|
| INV-REC-DEBT-005 | Alta | Resuelta | Product types y campos faltantes en `Product`. | Migracion Prisma creada. |
| INV-REC-DEBT-006 | Alta | Aceptada temporalmente | Produccion no soporta comportamiento operativo por receta. | Resolver en R5 con `ProductionRecipeService`; no bloquea R2. |
| INV-REC-DEBT-007 | Media | Resuelta | Conversiones de unidad inexistentes. | Modelo agregado con `name` obligatorio. |

### Auditoria post R2 - Deuda cerrada antes de R3

Antes de avanzar a R3 funcional se cerro la deuda tecnica de POS y reparto que seguia moviendo inventario directo:

| ID | Severidad | Estado | Accion siguiente |
|---|---|---|---|
| INV-REC-DEBT-002 | Alta | Resuelta | POS bloquea productos no vendibles. |
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

### Auditoria pre R5 - Deuda cerrada antes de produccion por receta

Antes de iniciar R5 se cerro la deuda tecnica de conversiones en recetas:

| ID | Severidad | Estado | Accion siguiente |
|---|---|---|---|
| INV-REC-DEBT-019 | Media | Resuelta | R5 puede calcular snapshots y consumos sobre cantidades ya normalizadas a la unidad base del producto. |

### Sprint R5 - ProductionRecipeService

**Objetivo del sprint:** cierre de lote por receta con inventario real.  
**Estado:** Pendiente.  

| ID | Severidad | Estado | Deuda | Resolucion esperada |
|---|---|---|---|---|
| TBD | Critica | Abierta | Deuda a registrar durante el sprint. | Ninguna deuda critica debe quedar abierta sin aceptacion explicita. |

### Sprint R6 - Endpoints y QA backend

**Objetivo del sprint:** API completa y pruebas.  
**Estado:** Pendiente.  

| ID | Severidad | Estado | Deuda | Resolucion esperada |
|---|---|---|---|---|
| INV-REC-DEBT-008 | Media | Abierta | Falta endpoint de movimientos. | Agregar consulta filtrable de movimientos. |

### Sprint R7 - Frontend minimo operativo

**Objetivo del sprint:** pantallas minimas para operar recetas.  
**Estado:** Pendiente.  

| ID | Severidad | Estado | Deuda | Resolucion esperada |
|---|---|---|---|---|
| TBD | Media | Abierta | Deuda a registrar durante el sprint. | Priorizar en R8. |

### Sprint R8 - Hardening y reportabilidad base

**Objetivo del sprint:** cierre de deuda critica y release operativo.  
**Estado:** Pendiente.  

| ID | Severidad | Estado | Deuda | Resolucion esperada |
|---|---|---|---|---|
| TBD | Alta | Abierta | Deuda remanente del parche. | Resolver o aceptar temporalmente con fecha. |

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
