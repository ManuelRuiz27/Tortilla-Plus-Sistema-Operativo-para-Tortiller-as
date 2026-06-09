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
| INV-REC-DEBT-001 | Critica | Abierta | Inventario | Los movimientos de inventario estan repartidos entre `inventory-service.ts`, `sale-service.ts` y `delivery-service.ts`; falta `InventoryLedgerService` como fuente unica. | Sprint R2 | No conviene cerrar recetas operativas antes de centralizar. |
| INV-REC-DEBT-002 | Alta | Abierta | POS | `createSaleItem` no valida `isSellable`; cuando existan insumos, backend podria aceptar productos no vendibles si se llama directo al endpoint. | Sprint R3 | `quoteSale` si filtra vendibles, pero no basta. |
| INV-REC-DEBT-003 | Alta | Abierta | Reparto | La carga de ruta resuelve stock directo y no bloquea explicitamente `raw_material`/`packaging` porque esos tipos aun no existen. | Sprint R3 | Debe validarse en backend, no solo en UI. |
| INV-REC-DEBT-004 | Alta | Abierta | Inventario | No hay bloqueo de duplicados por referencia en `InventoryMovement`; un reintento puede duplicar movimientos si el flujo no usa idempotencia externa. | Sprint R2 | Relevante para cierre de produccion y carga/venta. |
| INV-REC-DEBT-005 | Alta | Abierta | Modelo de datos | `ProductType` no contempla `raw_material` ni `packaging`; `Product` no tiene `isRecipeIngredient` ni `allowNegativeStock`. | Sprint R1 | Bloquea insumos reales. |
| INV-REC-DEBT-006 | Alta | Abierta | Produccion | `ProductionBatch` solo soporta produccion manual con items producidos; no hay receta, salida esperada/real, rendimiento ni snapshot de insumos. | Sprint R1/R5 | R1 prepara schema; R5 hace comportamiento operativo. |
| INV-REC-DEBT-007 | Media | Abierta | Conversiones | No existe `UnitConversion`; unidades como cubeta/costal no se pueden modelar de forma auditable. | Sprint R1 | Revisar constraint unica si `name` fuera nullable. |
| INV-REC-DEBT-008 | Media | Abierta | API | No hay endpoint para consultar movimientos de inventario con filtros. | Sprint R6 | Necesario para auditoria operativa. |
| INV-REC-DEBT-009 | Media | Abierta | Pruebas | Tests unitarios actuales cubren utilidades pequenas, pero no cubren idempotencia ni transacciones de inventario centralizado. | Sprint R2/R6 | Agregar pruebas conforme se refactoriza. |
| INV-REC-DEBT-010 | Media | Resuelta | Decisiones funcionales | Decisiones de salida de receta, masa->tortilla, agua, empaques, tolerancia y PIN por variacion alta quedaron registradas en R0. | Sprint R0 | Ver `inventory-recipes-r0-decisions-v0.1.md`. |
| INV-REC-DEBT-011 | Media | Abierta | Configuracion | Tolerancia de rendimiento sera fija en V1; configuracion por organizacion queda pendiente. | Futuro post R8 | No bloquea R1. |
| INV-REC-DEBT-012 | Baja | Abierta | Produccion | Agua queda como dato informativo en V1; si un cliente requiere control real, habra que modelarla como insumo inventariable. | Futuro | No bloquea R1. |
| INV-REC-DEBT-013 | Media | Abierta | Produccion | Flujo formal `masa -> tortilla` queda preparado pero no se implementa como segundo paso obligatorio en V1. | Futuro post R5 | No bloquea R1; el modelo debe no cerrarle la puerta. |
| INV-REC-DEBT-014 | Media | Abierta | Empaques | Descuento de empaques en venta queda fuera de V1; solo se descuentan en produccion si son ingrediente de receta. | Futuro post R7 | No bloquea R1. |

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
**Estado:** Pendiente.  

| ID | Severidad | Estado | Deuda | Resolucion esperada |
|---|---|---|---|---|
| INV-REC-DEBT-005 | Alta | Abierta | Product types y campos faltantes en `Product`. | Migracion Prisma. |
| INV-REC-DEBT-006 | Alta | Abierta | Produccion no soporta receta ni snapshot de insumos. | Extender schema sin romper produccion manual. |
| INV-REC-DEBT-007 | Media | Abierta | Conversiones de unidad inexistentes. | Agregar modelo y validar constraint. |

### Sprint R2 - InventoryLedgerService

**Objetivo del sprint:** centralizar movimientos de inventario.  
**Estado:** Pendiente.  

| ID | Severidad | Estado | Deuda | Resolucion esperada |
|---|---|---|---|---|
| INV-REC-DEBT-001 | Critica | Abierta | Movimientos de inventario repartidos. | Crear ledger y migrar ajustes/produccion manual. |
| INV-REC-DEBT-004 | Alta | Abierta | Sin bloqueo de duplicados por referencia. | Idempotencia o constraint logica en ledger. |
| INV-REC-DEBT-009 | Media | Abierta | Falta cobertura de transacciones/idempotencia. | Tests unitarios/integracion del ledger. |

### Sprint R3 - Productos e insumos

**Objetivo del sprint:** insumos reales y bloqueos en POS/reparto.  
**Estado:** Pendiente.  

| ID | Severidad | Estado | Deuda | Resolucion esperada |
|---|---|---|---|---|
| INV-REC-DEBT-002 | Alta | Abierta | POS puede crear item sin validar `isSellable`. | Bloquear productos no vendibles en backend. |
| INV-REC-DEBT-003 | Alta | Abierta | Reparto no bloquea insumos por tipo. | Validar tipos cargables en backend. |

### Sprint R4 - RecipeService

**Objetivo del sprint:** recetas versionadas sin inventario.  
**Estado:** Pendiente.  

| ID | Severidad | Estado | Deuda | Resolucion esperada |
|---|---|---|---|---|
| TBD | Media | Abierta | Deuda a registrar durante el sprint. | Registrar hallazgos antes de cerrar R4. |

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
