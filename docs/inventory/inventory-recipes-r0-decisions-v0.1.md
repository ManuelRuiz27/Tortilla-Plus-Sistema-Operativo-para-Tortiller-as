# Tortilla Plus - Decisiones R0 Inventario con Recetas V0.1

**Producto:** Tortilla Plus - V1 Operativa Comercial  
**Area:** Inventario, produccion, insumos, recetas, POS y reparto  
**Roadmap asociado:** `docs/inventory/inventory-recipes-roadmap-v0.1.md`  
**Estado:** Decisiones base para iniciar Sprint R1  
**Fecha:** 2026-06-09  

---

## 1. Proposito

Este documento cierra las decisiones minimas de Sprint R0 para permitir el inicio de Sprint R1 sin ambiguedad de modelo.

Estas decisiones son el contrato operativo inicial. Si una decision cambia despues, debe registrarse como cambio de alcance y actualizar roadmap, deuda tecnica y pruebas afectadas.

---

## 2. Resumen ejecutivo

V1 implementara produccion por receta como una sola etapa configurable donde una receta puede producir `masa` o `tortilla`.

No se modelara todavia una cadena obligatoria `masa -> tortilla`. Esa ruta queda preparada por el modelo, pero no sera obligatoria en el primer corte operativo.

La prioridad tecnica sigue siendo:

```txt
Schema
-> InventoryLedgerService
-> Insumos
-> RecipeService
-> ProductionRecipeService
-> API
-> Frontend
```

---

## 3. Decisiones cerradas

| ID | Decision | Resolucion V1 | Motivo | Impacto en desarrollo |
|---|---|---|---|---|
| R0-DEC-001 | Salida de receta | Una receta puede producir `masa` o `tortilla`. | Hay tortillerias que reportan salida como masa base y otras como tortilla; el sistema no debe forzar una sola practica operativa. | `Recipe.outputProductId` debe validar `productType in (masa, tortilla)`. |
| R0-DEC-002 | `masa -> tortilla` | No se implementa como segundo paso obligatorio en V1. | Meter cadena de produccion desde el inicio aumenta complejidad de inventario, rendimiento y UI. | El modelo permitira que `masa` sea ingrediente mas adelante, pero no sera flujo requerido en R5. |
| R0-DEC-003 | Stock negativo en ruta | Ruta no permite stock negativo en V1. | Reparto representa producto fisico cargado; permitir negativo ocultaria fallas de preparacion y liquidacion. | `route_load_out` debe bloquear insuficiencia para todos los productos. |
| R0-DEC-004 | Stock negativo en POS | Se conserva politica actual: `tortilla` y `masa` pueden quedar negativas; retail no. | El POS debe seguir rapido y ya opera con esa regla. | El ledger debe aceptar `allowNegative` por politica del flujo o producto. |
| R0-DEC-005 | Raw materials negativos | `raw_material` y `packaging` no pueden quedar negativos en V1, ni con autorizacion operativa normal. | Son insumos controlados; permitir negativo debilita el beneficio principal del parche. | `allowNegativeStock` existe para futuro, pero default sera `false` y R5 debe bloquear cierre sin stock. |
| R0-DEC-006 | Agua | Agua sera informativa en V1, no inventariable. | Medir agua como stock requiere reglas distintas y puede distraer del control de maiz/harinas/cal. | No se crea producto `raw_material` obligatorio para agua; puede documentarse en `notes` de receta si se requiere. |
| R0-DEC-007 | Empaques | Empaques se modelan como `packaging`; en V1 se descuentan en produccion solo si se agregan como ingrediente de receta. | Algunas operaciones empacan al producir, otras al vender. El modelo debe permitir ambos sin forzar desde el inicio. | `packaging` puede ser `isRecipeIngredient=true`; descuento en venta queda fuera de R5 salvo paquete/base actual. |
| R0-DEC-008 | Conversiones | Las conversiones seran por organizacion y producto. | Una cubeta/costal puede variar por negocio o producto. | `UnitConversion` debe incluir `organizationId` y `productId`. |
| R0-DEC-009 | Tolerancia de rendimiento | V1 usara tolerancia fija de sistema: menor a 3% permite cerrar, 3% a 10% requiere motivo, mayor a 10% requiere autorizacion. | Evita meter configuracion por organizacion antes de validar el flujo operativo. | R5 debe calcular variacion y aplicar reglas fijas; configuracion por organizacion queda como deuda futura. |
| R0-DEC-010 | PIN por variacion alta | Si la variacion supera 10%, V1 requiere autorizacion de usuario con permiso `production.authorize_variance`; PIN se acepta si el flujo de autorizacion ya lo soporta. | La autorizacion debe ser backend-first y auditable. | R5 debe recibir `authorizedByUserId` o validar PIN/autorizacion segun patrones existentes. |
| R0-DEC-011 | Devolucion no vendible | Toda devolucion no vendible debe crear movimiento y `WasteRecord` cuando aplique. | Mantiene trazabilidad de merma y evita que devoluciones queden como eventos invisibles. | Reforzar en R2/R3/R6 si el flujo actual deja brechas. |

---

## 4. Decisiones tecnicas para Sprint R1

### 4.1 `ProductType`

Sprint R1 debe agregar:

```prisma
raw_material
packaging
```

Reglas base:

```txt
raw_material:
  isSellable = false
  requiresProduction = false
  isStockTracked = true
  isRecipeIngredient = true
  allowNegativeStock = false

packaging:
  isSellable = false
  requiresProduction = false
  isStockTracked = true
  isRecipeIngredient = false por default
  allowNegativeStock = false
```

### 4.2 `Recipe` y version activa

Para evitar ambiguedad entre `Recipe.currentVersion` y `RecipeVersion.status`, R1 debe preferir un campo explicito:

```txt
Recipe.currentVersionId nullable/uuid
```

Si se conserva `currentVersion Int`, entonces R4 debe garantizar que activar version actualice ese numero en la misma transaccion. La opcion recomendada es `currentVersionId` porque reduce busquedas ambiguas.

### 4.3 `UnitConversion`

La conversion debe ser por organizacion y producto.

Recomendacion para R1:

```txt
name: obligatorio o normalizado a string no vacio
```

Motivo: si `name` queda nullable, una constraint unica que incluya `name` puede permitir duplicados con `NULL` en PostgreSQL.

### 4.4 Movimientos de inventario

R1 debe preparar tipos de movimiento suficientes para produccion por receta:

```txt
production_in
production_input_out
manual_adjustment_in
manual_adjustment_out
sale_out
route_load_out
route_return_in
waste_out
return_in
return_waste
```

`production_input_out` es necesario para distinguir consumo de insumos de otros egresos.

### 4.5 Produccion manual

El flujo actual de produccion manual debe seguir funcionando.

R1 solo extiende `ProductionBatch`; no debe obligar a que todos los lotes tengan receta.

Regla:

```txt
productionMode = manual:
  usa ProductionBatchItem como hoy.

productionMode = recipe_based:
  usa recipeVersionId, outputProductId, output quantities y ProductionBatchIngredient.
```

---

## 5. Alcance aprobado para Sprint R1

Sprint R1 queda aprobado para:

- Modificar schema Prisma.
- Crear migracion.
- Mantener compatibilidad con produccion manual.
- Agregar modelos de recetas, versiones, ingredientes, conversiones y snapshot de insumos.
- Agregar campos nuevos de producto.
- Agregar enum `ProductionMode`.
- Agregar tipos de movimiento necesarios.
- Validar schema y build.

Sprint R1 no debe implementar todavia:

- Endpoints de recetas.
- `InventoryLedgerService`.
- Cierre operativo por receta.
- Pantallas nuevas.

---

## 6. Riesgos que pasan a Sprint R1

| Riesgo | Manejo |
|---|---|
| Migracion de enum `ProductType` puede afectar seed o tests existentes. | Validar build y seed despues de migracion. |
| Relaciones nuevas en Prisma pueden requerir nombres explicitos por multiples relaciones a `Product`. | Nombrar relaciones desde R1 para evitar conflictos. |
| `Recipe.currentVersionId` puede requerir relacion circular con `RecipeVersion`. | Si complica migracion, usar `currentVersion Int` y documentar regla transaccional para R4. |
| `ProductionBatch` extendido puede romper serializadores actuales. | Campos nuevos deben ser nullable o default para no romper produccion manual. |

---

## 7. Estado de R0

Sprint R0 queda cerrado para iniciar Sprint R1.

Quedan como deuda no bloqueante:

- Configurar tolerancia por organizacion en fase futura.
- Modelar agua como insumo inventariable si un cliente lo exige.
- Descuento de empaques en venta si la operacion lo requiere.
- Cadena `masa -> tortilla` como flujo formal.

