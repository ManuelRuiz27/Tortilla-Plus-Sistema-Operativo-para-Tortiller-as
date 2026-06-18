# Tortilla Plus - Roadmap Post R8 de Inventario con Recetas V0.1

**Producto:** Tortilla Plus - V1 Operativa Comercial  
**Area:** Inventario, produccion, recetas, reportes y piloto operativo  
**Roadmap base cerrado:** `docs/inventory/inventory-recipes-roadmap-v0.1.md`  
**Fuente de verdad funcional:** `docs/system-modules-and-flows-source-of-truth-v0.1.md`  
**Deuda tecnica:** `docs/inventory/inventory-recipes-technical-debt-log-v0.1.md`  
**Estado:** Roadmap propuesto para fase posterior a R8  
**Fecha:** 2026-06-17  

---

## 1. Proposito

El parche R0-R8 dejo operativo el flujo base de inventario con recetas: insumos, recetas versionadas, lotes por receta, cierre con movimientos auditables, frontend minimo y pruebas e2e.

Este roadmap define la siguiente etapa sin reabrir el alcance base. La prioridad es convertir los datos auditables en informacion operativa para gerencia y, despues, resolver las decisiones aceptadas temporalmente solo cuando generen valor real en piloto.

---

## 2. Regla de avance

Antes de iniciar cada fase:

1. Revisar deuda critica o alta abierta.
2. Resolver bloqueantes del sprint anterior.
3. Mapear el cambio a uno o mas modulos definidos en `docs/system-modules-and-flows-source-of-truth-v0.1.md`.
4. No cambiar POS, reparto, caja ni produccion manual salvo que el sprint lo indique.
5. Mantener compatibilidad con el flujo R0-R8 ya validado.
6. Registrar deuda nueva en `inventory-recipes-technical-debt-log-v0.1.md`.

Reglas transversales que no se deben romper:

- Todo movimiento de stock pasa por `InventoryLedgerService`.
- POS solo vende productos con `isSellable=true`.
- POS no vende `raw_material` ni `packaging`.
- Ruta no carga `raw_material` ni `packaging`.
- Ruta no permite stock negativo.
- Recetas solo consumen productos con `isRecipeIngredient=true`.
- Produccion por receta genera `production_input_out` y `production_in`.
- Acciones criticas deben conservar auditoria, permisos y scope por organizacion/sucursal.

---

## 3. Roadmap general

| Fase | Nombre | Resultado esperado |
|---|---|---|
| Post R8-A | Reportes de produccion y rendimiento | Gerencia puede revisar rendimiento, merma y consumos por lote, receta, sucursal y periodo. |
| Post R8-B | Piloto operativo controlado | Flujo validado con datos reales, roles reales y uso desde dispositivos del cliente. |
| Post R8-C | Tolerancias configurables | Las reglas de variacion dejan de ser fijas y pueden configurarse por organizacion. |
| Post R8-D | Flujo formal masa -> tortilla | Produccion en dos pasos cuando el cliente produzca masa y despues tortilla como procesos separados. |
| Post R8-E | Empaques y agua avanzados | Decidir e implementar control de empaques en venta y agua inventariable solo si el piloto lo justifica. |

---

## 3.1 Alineacion con modulos fuente de verdad

| Fase | Modulos principales | Modulos que deben mantenerse estables |
|---|---|---|
| Post R8-A | Inventario / Ledger; Recetas; Produccion por receta; Reportes, auditoria y hardening | POS; Caja; Rutas; Facturacion |
| Post R8-B | Todos los modulos criticos de operacion y RBAC | Plataforma / SaaS; Organizacion / sucursales / dispositivos |
| Post R8-C | Produccion por receta; Autenticacion / RBAC; Reportes, auditoria y hardening | Recetas historicas; POS; Rutas |
| Post R8-D | Recetas; Produccion por receta; Inventario / Ledger; Productos | POS; Precios; Rutas |
| Post R8-E | Productos; Insumos y conversiones; Inventario / Ledger; POS; Rutas | Caja; Facturacion; Produccion manual |

Permisos relevantes por fase:

- Post R8-A: `inventory.view`, `recipes.view`, `production.manage`, `audit.view`.
- Post R8-B: permisos reales por rol operativo, sin elevar permisos para pasar QA.
- Post R8-C: `production.manage`, `production.authorize_variance`, `audit.view`.
- Post R8-D: `products.manage`, `recipes.manage`, `production.manage`.
- Post R8-E: `products.manage`, `inventory.manage`, `sales.create`, `routes.manage`.

---

## 4. Post R8-A - Reportes de produccion y rendimiento

**Estado:** Pendiente.  
**Prioridad:** Alta.  

### Objetivo

Agregar reportes operativos sobre la informacion que ya existe: lotes, recetas, ingredientes reales, movimientos de inventario y rendimiento.

### Alcance backend

- Endpoint de resumen de produccion por periodo.
- Filtros por organizacion, sucursal, receta, producto de salida y rango de fechas.
- Indicadores:
  - lotes cerrados
  - cantidad producida
  - consumo esperado
  - consumo real
  - variacion de consumo
  - rendimiento promedio
  - merma estimada
  - lotes con motivo de variacion
  - lotes con autorizacion de variacion alta
- Reutilizar `ProductionBatch`, `ProductionBatchIngredient` e `InventoryMovement`.
- No agregar nuevas tablas si los datos pueden calcularse desde el modelo actual.
- Respetar scope por organizacion y sucursal.
- Usar movimientos auditables como fuente de conciliacion, no calculos aislados del frontend.

### Alcance frontend

- Vista de reportes de produccion para manager.
- Tabla filtrable por periodo/sucursal/receta.
- Detalle por lote con insumos esperados vs reales.
- Estados visuales para variacion normal, variacion con motivo y variacion autorizada.
- Enlace desde produccion o inventario, no desde POS.
- Exportacion CSV solo si el costo es bajo y no introduce dependencia pesada.

### Fuera de alcance

- BI avanzado.
- Graficas complejas.
- Predicciones.
- Cambios a cierre de lote.
- Cambios a POS/reparto.

### Definition of Done

- Manager puede consultar rendimiento por periodo.
- Manager puede identificar lotes con desviacion.
- Los reportes cuadran contra movimientos auditables.
- Los reportes respetan `inventory.view`, `recipes.view`, `production.manage` o `audit.view` segun el endpoint usado.
- Pruebas backend cubren filtros y calculos principales.
- E2E cubre al menos consulta de reporte con un lote cerrado por receta.
- Documentacion actualizada.

---

## 5. Post R8-B - Piloto operativo controlado

**Estado:** Pendiente.  
**Prioridad:** Alta despues de reportes base.  

### Objetivo

Validar el flujo completo en condiciones reales antes de agregar reglas mas complejas.

### Alcance

- Checklist operativo para tortilleria piloto.
- Datos semilla realistas:
  - insumos
  - conversiones
  - recetas
  - productos vendibles
  - usuarios y roles
- Pruebas en dispositivos externos usando frontend en modo server.
- Registro de hallazgos de usabilidad.
- Validacion de permisos por rol real:
  - duenio
  - gerente
  - encargado de produccion
  - cajero
  - repartidor
- Validacion de flujos transversales de la fuente de verdad:
  - venta mostrador
  - produccion por receta
  - ruta
  - credito
  - facturacion

### Definition of Done

- Flujo probado de punta a punta en LAN o entorno staging.
- POS, caja, rutas, credito, facturacion y produccion por receta siguen operando dentro de sus reglas funcionales.
- Se registran hallazgos con prioridad.
- No hay bloqueantes para operar una jornada simulada.
- La deuda del piloto queda registrada antes de iniciar cambios funcionales nuevos.

---

## 6. Post R8-C - Tolerancias configurables

**Estado:** Pendiente.  
**Prioridad:** Media, salvo que piloto lo eleve.  
**Deuda asociada:** `INV-REC-DEBT-011`.

### Objetivo

Permitir que cada organizacion configure umbrales de variacion de produccion en vez de usar la regla fija V1.

### Alcance

- Modelo de configuracion por organizacion.
- Defaults compatibles con V1:
  - motivo desde 3%
  - autorizacion arriba de 10%
- Validaciones de rango.
- Auditoria de cambios de configuracion.
- UI minima en configuracion operativa.
- Pruebas de cierre de lote con configuracion custom.
- Validar que el autorizador conserve permiso `production.authorize_variance`.

### Definition of Done

- Organizacion sin configuracion conserva regla V1.
- Organizacion con configuracion usa sus propios umbrales.
- Cierre de lote sigue exigiendo motivo/autorizacion segun regla aplicable.
- No se rompe el historico de lotes ya cerrados.
- Todo cambio de umbral queda auditable.

---

## 7. Post R8-D - Flujo formal masa -> tortilla

**Estado:** Pendiente.  
**Prioridad:** Media, depende del piloto.  
**Deuda asociada:** `INV-REC-DEBT-013`.

### Objetivo

Soportar dos procesos de produccion conectados cuando la operacion real separe la produccion de masa y la produccion de tortilla.

### Alcance

- Definir si el segundo paso consume `masa` como ingrediente de receta.
- Permitir recetas de salida `masa` y recetas de salida `tortilla`.
- Reporte que conecte rendimiento de masa y rendimiento de tortilla.
- Validar que POS siga vendiendo solo productos vendibles.
- Validar que `masa` solo sea vendible si el negocio la marca como tal.
- Validar que el consumo de `masa` en el segundo paso use ledger y quede como `production_input_out`.

### Fuera de alcance

- Automatizar produccion de tortilla al cerrar masa.
- Forzar doble paso a clientes que no lo operan asi.
- Cambiar precios o modos de venta de POS.

### Definition of Done

- Cliente puede operar masa y tortilla como lotes separados.
- El inventario descuenta masa al producir tortilla.
- Los reportes distinguen ambos procesos.
- El flujo actual de una sola receta sigue funcionando.
- POS y rutas no exponen productos no vendibles por error.

---

## 8. Post R8-E - Empaques y agua avanzados

**Estado:** Pendiente.  
**Prioridad:** Baja/Media, solo con evidencia de piloto.  
**Deuda asociada:** `INV-REC-DEBT-012`, `INV-REC-DEBT-014`.

### Objetivo

Resolver si agua y empaques requieren control inventariable adicional.

### Agua

- Mantener agua como dato informativo si no hay control real.
- Modelar agua como insumo inventariable solo si el cliente mide entradas/salidas.
- Evitar capturas falsas que contaminen costos y merma.

### Empaques

- Mantener descuento en produccion si son ingrediente de receta.
- Evaluar descuento en venta cuando el empaque dependa del ticket, presentacion o canal.
- No duplicar consumo si un empaque ya fue descontado en produccion.
- Si el empaque se descuenta en venta, debe pasar por ledger y no romper paquetes que ya descuentan producto base.

### Definition of Done

- Decision documentada con datos del piloto.
- Si se implementa, hay reglas claras para evitar doble descuento.
- POS y reparto mantienen comportamiento estable.
- Facturacion y recibos no cambian salvo que se defina una regla fiscal/comercial explicita.

---

## 9. Orden recomendado

1. Post R8-A: reportes de produccion y rendimiento.
2. Post R8-B: piloto operativo controlado.
3. Repriorizar con hallazgos reales.
4. Post R8-C si la tolerancia fija no alcanza.
5. Post R8-D si el cliente opera masa y tortilla como pasos separados.
6. Post R8-E solo si agua/empaques generan control real de inventario.

---

## 10. Gates de calidad

### Gate P-A - Antes de piloto

- Reporte base permite auditar lotes cerrados.
- E2E de cierre de lote sigue pasando.
- Smoke de POS, caja, ruta y facturacion sigue pasando.
- No hay deuda critica o alta abierta.

### Gate P-B - Antes de reglas configurables

- Piloto confirma que la regla fija no basta.
- Se define quien puede cambiar umbrales.
- Se define auditoria de cambios.

### Gate P-C - Antes de masa -> tortilla

- El piloto confirma operacion en dos pasos.
- Recetas actuales no se rompen.
- Productos vendibles/no vendibles quedan revisados.

### Gate P-D - Antes de empaques/agua avanzados

- Existe evidencia del piloto.
- Se define si el movimiento ocurre en produccion o venta.
- Se descarta doble descuento contra `package` y recetas existentes.
- Se confirma impacto en rutas y POS.

---

## 11. Riesgos

- Construir reportes que no cuadren con movimientos auditables.
- Configurar tolerancias sin auditoria.
- Duplicar descuento de empaques entre produccion y venta.
- Forzar `masa -> tortilla` a negocios que operan en un solo paso.
- Convertir agua en inventario sin medicion real.

---

## 12. Estado actual

- R0-R8 cerrado.
- Sin deuda critica o alta abierta.
- `docs/system-modules-and-flows-source-of-truth-v0.1.md` es la referencia funcional para permisos, modulos y flujos transversales.
- Deuda aceptada temporalmente pendiente de reevaluacion:
  - `INV-REC-DEBT-011`: tolerancias configurables.
  - `INV-REC-DEBT-012`: agua inventariable.
  - `INV-REC-DEBT-013`: flujo formal `masa -> tortilla`.
  - `INV-REC-DEBT-014`: descuento de empaques en venta.
- Siguiente avance recomendado: Post R8-A.
