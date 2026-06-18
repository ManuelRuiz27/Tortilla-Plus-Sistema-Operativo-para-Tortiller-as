# Tortilla Plus — Fuente de Verdad de Módulos y Flujos V0.1

**Producto:** Tortilla Plus — Sistema Operativo para Tortillerías  
**Tipo:** Fuente de verdad funcional del producto  
**Estado:** Oficial V0.1  
**Ruta sugerida:** `docs/project/system-modules-and-flows-source-of-truth-v0.1.md`

---

## 1. Propósito

Este documento consolida los módulos funcionales definidos para Tortilla Plus y los flujos operativos que corresponden a cada uno.

Debe usarse como referencia base para:

```txt
- roadmap
- frontend
- QA
- documentación
- definición de permisos
- priorización de desarrollo
- revisión de alcance
```

---

## 2. Resumen general

El sistema está definido en **17 módulos funcionales**.

### Módulos críticos de operación

```txt
1. Productos
2. Precios
3. Inventario / Ledger
4. Insumos y conversiones
5. Recetas
6. Producción manual
7. Producción por receta
8. POS
9. Caja
10. Clientes / crédito
11. Rutas / reparto
12. Facturación
```

### Módulos estructurales o de soporte

```txt
13. Plataforma / SaaS
14. Autenticación / Usuarios / RBAC
15. Organización, sucursales y dispositivos POS
16. Liquidación / conciliación operativa
17. Reportes, auditoría y hardening
```

---

## 3. Estado funcional general

El backend de la V1 Operativa Comercial ya cubre una parte relevante del sistema:

```txt
- SaaS multi-tenant
- POS
- Caja
- Inventario / Ledger
- Producción manual
- Insumos y conversiones
- Recetas versionadas
- Producción por receta
- Clientes y crédito
- Rutas de reparto
- Liquidación
- Facturación / autofactura
- Auditoría
- QA backend principal
```

Estado actualizado del parche de inventario con recetas:

```txt
R7 - Frontend minimo operativo completado.
R8 - Hardening, QA E2E y documentacion operativa completado.
Post R8 - Siguiente fase: reportes de produccion/rendimiento y piloto operativo controlado.
```

---

# 4. Módulos y flujos

## 4.1 Plataforma / SaaS

### Objetivo

Controlar el uso del sistema como producto SaaS multi-tenant.

### Flujo principal

```txt
Crear organización
→ asignar plan
→ habilitar features
→ aplicar límites
→ controlar estado de suscripción
→ suspender o limitar operación si aplica
```

### Incluye

```txt
- planes
- features
- límites por plan
- suscripciones
- estado de organización
- suspensión operativa
- control multi-tenant
```

---

## 4.2 Autenticación / Usuarios / RBAC

### Objetivo

Controlar acceso, permisos y acciones por rol.

### Flujo principal

```txt
Login
→ emitir sesión/token
→ validar usuario actual
→ validar permisos
→ validar acceso a organización/sucursal
→ ejecutar acción autorizada
```

### Incluye

```txt
- login
- logout
- refresh token
- usuario actual
- PIN operativo
- roles
- permisos
- scope por plataforma, organización o sucursal
```

### Permisos relevantes

```txt
sales.create
payments.create
inventory.view
inventory.manage
products.view
products.manage
recipes.view
recipes.manage
production.manage
production.authorize_variance
routes.view
routes.manage
billing.view
billing.manage
audit.view
```

---

## 4.3 Organización, sucursales y dispositivos POS

### Objetivo

Gestionar la estructura operativa de cada tortillería.

### Flujo principal

```txt
Crear organización
→ crear sucursal
→ registrar dispositivo POS
→ licenciar dispositivo
→ asignar permisos y operación por sucursal
```

### Incluye

```txt
- organización
- sucursales
- dispositivos POS
- licencias POS
- control por branch
- restricción operativa por estado de organización
```

---

## 4.4 Productos

### Objetivo

Administrar todos los productos, insumos y conceptos operativos.

### Tipos de producto

```txt
tortilla       Producto terminado vendible.
masa           Producto intermedio y vendible.
package        Producto comercial que descuenta producto base.
retail         Producto externo vendible: salsa, guisos, bebidas, etc.
service        Servicio sin inventario.
raw_material   Insumo de producción: maíz, cal, harina, etc.
packaging      Empaque o material de soporte: bolsa, papel, etc.
```

### Flujo principal

```txt
Crear producto
→ asignar tipo
→ definir unidad base
→ definir si es vendible
→ definir si controla stock
→ definir si puede ser ingrediente de receta
→ activar/inactivar producto
```

### Reglas clave

```txt
raw_material:
  - no se vende en POS
  - controla stock
  - puede ser ingrediente de receta

packaging:
  - no se vende en POS
  - puede controlar stock
  - puede ser ingrediente si se descuenta en producción

tortilla / masa:
  - se venden en POS
  - controlan stock
  - pueden ser salida de producción

package:
  - se vende en POS
  - descuenta producto base
  - ejemplo: paquete 800 g

retail:
  - se vende en POS
  - controla stock si aplica
```

---

## 4.5 Precios

### Objetivo

Controlar precios por sucursal, cliente, producto y modo de venta.

### Modos de venta

```txt
by_kg       Venta por kilo.
by_amount   Venta por monto: N pesos de tortilla/masa.
by_package  Venta por paquete.
by_unit     Venta por unidad/pieza.
```

### Flujo principal

```txt
Crear producto vendible
→ definir precio por sucursal
→ opcionalmente definir precio especial por cliente
→ usar precio en POS o ruta
→ respetar vigencia activa
```

---

## 4.6 Inventario / Ledger

### Objetivo

Centralizar todo movimiento de stock en un solo punto confiable.

### Flujo principal

```txt
Crear movimiento
→ validar producto stockeable
→ validar política de negativo
→ crear InventoryMovement
→ actualizar InventoryStock
→ auditar referencia
```

### Tipos de movimiento

```txt
production_in            Entrada por producción.
production_input_out     Consumo de insumo por producción.
sale_out                 Salida por venta POS.
route_load_out           Salida por carga de ruta.
route_return_in          Entrada por devolución de ruta.
waste_out                Salida por merma.
manual_adjustment_in     Ajuste manual de entrada.
manual_adjustment_out    Ajuste manual de salida.
return_in                Entrada por devolución vendible.
return_waste             Devolución no vendible.
```

### Reglas clave

```txt
- No se debe actualizar stock fuera del ledger.
- El ledger protege duplicados por referencia.
- Retail no permite negativo.
- Ruta no permite negativo.
- POS puede permitir negativo para tortilla/masa según política actual.
- Raw materials y packaging no permiten negativo en V1.
```

---

## 4.7 Insumos y conversiones

### Objetivo

Administrar materias primas y unidades operativas usadas en recetas.

### Flujo principal

```txt
Crear insumo
→ definir unidad base
→ marcar como ingrediente de receta
→ configurar conversión
→ usar en receta
→ consumir en producción
```

### Ejemplo

```txt
Producto: Maíz
Unidad base: kg
Conversión: 1 cubeta estándar = 25 kg
Conversión: 1 costal = 50 kg
```

---

## 4.8 Recetas

### Objetivo

Definir fórmulas de producción versionadas sin alterar históricos.

### Flujo principal

```txt
Crear receta
→ elegir producto de salida: masa o tortilla
→ capturar ingredientes autorizados
→ guardar versión inicial
→ activar versión
→ crear nueva versión si cambia la fórmula
→ conservar histórico
```

### Reglas clave

```txt
- La receta puede producir masa o tortilla.
- El producto de salida debe ser stockeable.
- Los ingredientes deben estar marcados como isRecipeIngredient=true.
- Las cantidades se normalizan a la unidad base del producto.
- Si se usa unidad distinta, debe existir conversión activa.
- Una receta usada históricamente no se edita directamente; se versiona.
```

### Ejemplo

```txt
Receta: Masa estándar
Salida esperada: 33 kg de masa

Ingredientes:
- Maíz: 25 kg
- Harina de maíz: 8 kg
- Cal: 0.100 kg
- Harina de trigo: 0.500 kg
```

---

## 4.9 Producción manual

### Objetivo

Mantener un flujo simple de producción sin receta para compatibilidad operativa.

### Flujo principal

```txt
Crear lote manual
→ capturar kg producidos de tortilla o masa
→ cerrar lote
→ ingresar producción al inventario
→ auditar movimiento
```

---

## 4.10 Producción por receta

### Objetivo

Controlar producción real mediante consumo de insumos, salida producida y rendimiento.

### Flujo principal

```txt
Crear insumos
→ configurar conversiones
→ crear receta
→ activar versión
→ crear lote desde receta
→ sistema calcula insumos esperados
→ encargado captura insumos reales
→ encargado captura salida real
→ sistema calcula rendimiento
→ si variación 3%-10%, pide motivo
→ si variación >10%, pide autorización
→ cerrar lote
→ descontar insumos
→ ingresar masa/tortilla producida
→ registrar movimientos y auditoría
```

### Reglas de rendimiento V1

```txt
Variación menor a 3%:
  - permite cerrar sin motivo.

Variación de 3% a 10%:
  - requiere motivo.

Variación mayor a 10%:
  - requiere motivo.
  - requiere usuario autorizador con permiso production.authorize_variance.
```

### Movimientos generados

```txt
Por cada ingrediente:
  production_input_out

Por producto producido:
  production_in
```

---

## 4.11 POS / Ventas de mostrador

### Objetivo

Vender productos de mostrador de forma rápida y controlada.

### Flujo principal

```txt
Abrir caja
→ seleccionar productos vendibles
→ calcular precio
→ agregar items
→ cobrar
→ completar venta
→ descontar inventario
→ generar recibo
→ cerrar caja
```

### Casos de venta

```txt
Tortilla por kilo.
Tortilla por N pesos.
Paquete de tortilla.
Masa por kilo.
Masa por N pesos.
Retail: salsa, guisos, bebidas, etc.
```

### Reglas clave

```txt
- POS no debe mostrar raw_material.
- POS no debe mostrar packaging.
- POS no debe vender productos con isSellable=false.
- Paquete descuenta producto base.
- Venta puede ser anónima o con cliente.
- Venta puede usar precio especial de cliente.
- Venta puede pagarse con efectivo, tarjeta, transferencia o crédito.
```

---

## 4.12 Caja

### Objetivo

Controlar efectivo, movimientos y cierre operativo de la sucursal.

### Flujo principal

```txt
Abrir caja
→ registrar ventas
→ registrar ingresos
→ solicitar retiro
→ autorizar/rechazar retiro
→ consultar resumen
→ cerrar caja
→ registrar diferencia
```

---

## 4.13 Clientes / Crédito / Precios especiales

### Objetivo

Gestionar clientes recurrentes, crédito y condiciones comerciales especiales.

### Flujo principal

```txt
Crear cliente
→ habilitar crédito
→ definir límite
→ configurar precio especial
→ vender a crédito
→ aumentar saldo
→ registrar abono
→ consultar balance
```

---

## 4.14 Rutas / Reparto

### Objetivo

Operar venta y entrega a puntos de venta externos como tiendas, puestos y clientes recurrentes.

### Flujo principal

```txt
Crear chofer
→ crear ruta
→ asignar clientes
→ ordenar clientes en ruta
→ crear orden de reparto
→ preparar pedido
→ cargar producto
→ descontar inventario
→ marcar en ruta
→ entregar
→ registrar pago o devolución
→ revisar devolución
→ liquidar ruta
```

### Reglas clave

```txt
- Ruta no carga raw_material.
- Ruta no carga packaging.
- Ruta solo usa productos vendibles.
- Paquete descuenta producto base.
- Ruta no permite stock negativo.
- Devolución vendible regresa a inventario.
- Devolución no vendible registra merma si aplica.
```

---

## 4.15 Liquidación / Conciliación operativa

### Objetivo

Cerrar operación de ruta y asegurar que pagos físicos coincidan con caja.

### Flujo principal

```txt
Ruta entrega pedidos
→ registra pagos
→ registra devoluciones
→ crea liquidación
→ calcula esperado
→ cierra liquidación
→ deposita efectivo a caja
→ bloquea duplicados
```

---

## 4.16 Facturación / Autofactura

### Objetivo

Generar comprobantes fiscales o recibos facturables a partir de ventas.

### Flujo principal

```txt
Venta genera recibo
→ cliente solicita factura
→ generar factura individual
→ o incluir venta en factura global diaria
→ emitir documento
→ consultar estado
→ cancelar si aplica
```

### Incluye

```txt
- recibo de venta
- factura individual
- factura global diaria
- documentos de factura
- autofactura pública
- consulta de estado
- cancelación
- integración PAC real pendiente/externa según fase
```

---

## 4.17 Reportes, auditoría y hardening

### Objetivo

Dar trazabilidad, control y preparación para reportabilidad operativa.

### Flujo principal

```txt
Acción crítica ocurre
→ se registra audit log
→ movimiento de inventario queda trazable
→ se consulta historial
→ se preparan reportes operativos
→ se valida QA E2E
```

### Reportes futuros preparados

```txt
- Rendimiento por lote
- Consumo diario de maíz
- Consumo diario de harina
- Consumo diario de cal
- Producción esperada vs real
- Merma por receta
- Stock bajo de insumos
```

---

# 5. Flujos operativos transversales

## 5.1 Venta mostrador

```txt
Abrir caja
→ seleccionar producto vendible
→ aplicar precio sucursal o precio cliente
→ agregar item
→ cobrar con uno o varios métodos
→ completar venta
→ generar movimiento sale_out
→ actualizar stock
→ generar recibo
→ cerrar caja
```

## 5.2 Producción por receta

```txt
Crear insumos
→ configurar conversiones
→ crear receta
→ activar versión
→ crear lote desde receta
→ capturar reales
→ cerrar lote
→ descontar insumos
→ ingresar producto producido
→ auditar lote y movimientos
```

## 5.3 Ruta

```txt
Crear ruta
→ asignar clientes
→ crear pedido
→ preparar pedido
→ cargar inventario
→ entregar
→ registrar pago/devolución
→ revisar devolución
→ liquidar ruta
→ depositar a caja
```

## 5.4 Crédito

```txt
Crear cliente
→ habilitar crédito
→ configurar límite
→ vender a crédito
→ actualizar saldo
→ registrar pago
→ consultar balance
```

## 5.5 Facturación

```txt
Venta completada
→ generar recibo
→ cliente solicita factura
→ validar datos fiscales
→ emitir factura individual o global
→ consultar/cancelar documento
```

---

# 6. Estado de desarrollo por módulo

| Módulo | Backend | Frontend | Observación |
|---|---:|---:|---|
| Plataforma / SaaS | Avanzado | Parcial/Pendiente | Base multi-tenant y planes definidos. |
| Autenticación / RBAC | Avanzado | Parcial/Pendiente | Permisos base definidos. |
| Organización / Sucursales / POS Devices | Avanzado | Parcial/Pendiente | Requiere revisión UX final. |
| Productos | Avanzado | Avanzado | Insumos/vendibles separados para el alcance R7; requiere UX final en piloto. |
| Precios | Avanzado | Parcial/Pendiente | Requiere UX operativa. |
| Inventario / Ledger | Avanzado | Parcial/Avanzado | Movimientos disponibles; reportes avanzados quedan post R8. |
| Insumos y conversiones | Avanzado | Avanzado | Pantalla minima operativa completada en R7. |
| Recetas | Avanzado | Avanzado | Pantalla minima operativa completada en R7. |
| Producción manual | Avanzado | Parcial/Pendiente | Mantener compatibilidad. |
| Producción por receta | Avanzado | Avanzado | Lote/cierre minimo operativo completado en R7. |
| POS | Avanzado | Parcial/Avanzado | Backend bloquea no vendibles; frontend oculta insumos en alcance actual. |
| Caja | Avanzado | Parcial/Pendiente | Requiere QA E2E. |
| Clientes / Crédito | Avanzado | Parcial/Pendiente | Requiere QA E2E. |
| Rutas / Reparto | Avanzado | Parcial/Avanzado | Backend bloquea insumos; UX final queda a validar en piloto. |
| Liquidación / Conciliación | Avanzado | Parcial/Pendiente | Requiere QA E2E. |
| Facturación / Autofactura | Parcial/Avanzado | Parcial/Pendiente | PAC real queda como integración externa según fase. |
| Reportes / Auditoría / Hardening | Parcial/Avanzado | Parcial | R8 completado; reportes avanzados quedan post R8. |

---

# 7. Siguiente fase post R8

## 7.1 Reportes de produccion y rendimiento

```txt
- Rendimiento por lote.
- Consumo diario de maiz, harina, cal y otros insumos.
- Produccion esperada vs real.
- Merma por receta.
- Lotes con variacion y autorizacion.
- Stock bajo de insumos.
```

## 7.2 Piloto operativo controlado

```txt
- Validar flujo completo desde dispositivos reales.
- Validar roles reales: duenio, gerente, produccion, cajero y repartidor.
- Validar POS, caja, rutas, credito, facturacion y produccion por receta.
- Registrar hallazgos de UX y operacion.
- Convertir hallazgos bloqueantes en deuda tecnica o funcional.
```

## 7.3 Deudas funcionales aceptadas temporalmente

```txt
- Tolerancia configurable por organización.
- Agua como insumo inventariable.
- Flujo formal masa -> tortilla como segundo paso obligatorio.
- Descuento de empaques en venta.
```

---

# 8. Regla de gobierno del documento

Este documento debe actualizarse cuando ocurra cualquiera de estos cambios:

```txt
- Se agregue un nuevo módulo funcional.
- Se divida un módulo existente.
- Se elimine o reprograme un flujo.
- Se agregue una regla de negocio transversal.
- Se cierre una deuda funcional aceptada temporalmente.
- Se modifique el alcance de la fase post R8.
```

Toda decisión técnica o funcional nueva debe poder mapearse a uno de estos módulos. Si no cabe en ningún módulo, debe evaluarse si:

```txt
1. Es realmente una funcionalidad del producto.
2. Pertenece a un módulo existente.
3. Requiere crear un nuevo módulo.
4. Debe quedar fuera del alcance actual.
```

---

# 9. Resumen ejecutivo

Tortilla Plus está definido como un sistema operativo para tortillerías compuesto por **17 módulos funcionales**.

La operación principal gira alrededor de:

```txt
Productos
→ Precios
→ Inventario / Ledger
→ Insumos
→ Recetas
→ Producción
→ POS
→ Caja
→ Clientes
→ Rutas
→ Facturación
→ Auditoría / Reportes
```

El backend ya tiene una base operativa avanzada y el parche R7/R8 de inventario con recetas quedo cerrado para piloto. El siguiente foco de desarrollo debe ser convertir la auditoria y los movimientos existentes en **reportes operativos de produccion/rendimiento**, ejecutar un **piloto controlado**, y despues decidir si conviene implementar tolerancias configurables, flujo formal `masa -> tortilla`, agua inventariable o descuento de empaques en venta.
