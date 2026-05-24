# Tortilla Plus — Sprint de Auditoría de Estabilidad Operativa V0.2

**Producto:** Tortilla Plus — V1 Operativa Comercial  
**Documento:** Sprint de auditoría para estabilización de flujos  
**Fecha:** 2026-05-24  
**Repositorio objetivo:** `ManuelRuiz27/Tortilla-Plus-Sistema-Operativo-para-Tortiller-as`  
**Ruta sugerida:** `docs/audits/tortilla-plus-operational-stability-audit-v0.2.md`  

---

## 1. Objetivo

Estabilizar Tortilla Plus mediante una auditoría técnica y funcional del monorepo real, contrastando lo que existe en `apps/api` y `apps/web` contra los flujos operativos necesarios para una tortillería.

El sprint no busca agregar módulos nuevos. Busca demostrar que los flujos centrales funcionan con backend real, datos reales y mocks apagados.

Flujos objetivo:

```txt
POS -> cliente -> precio especial -> pago -> caja -> inventario

Cliente -> crédito/fiado -> saldo -> cobro

Ruta -> clientes -> pedido -> carga -> entrega -> cobro -> liquidación

Owner -> navegación operativa, no pantallas técnicas sueltas
```

---

## 2. Alcance de la auditoría

### 2.1 Archivos y áreas revisadas

```txt
package.json
package-lock.json
apps/api/package.json
apps/web/package.json
apps/web/.env.example
apps/web/src/app/router.tsx
apps/web/src/api/http-client.ts
apps/web/src/api/mock-data.ts
apps/web/src/api/sales.api.ts
apps/web/src/api/manager.api.ts
apps/web/src/modules/pos/pages/sale-page.tsx
apps/web/src/modules/pos/pages/pos-router-page.tsx
apps/web/src/modules/pos/components/customer-selector.tsx
apps/web/src/modules/pos/components/payment-modal.tsx
apps/web/src/modules/pos/stores/pos-cart.store.ts
apps/web/src/modules/manager/pages/customers-page.tsx
apps/web/src/modules/manager/pages/route-detail-page.tsx
apps/web/src/modules/manager/pages/billing-page.tsx
apps/web/src/shared/layouts/manager-layout.tsx
apps/web/src/shared/guards/role-guard.tsx
apps/web/src/shared/components/permission-button.tsx
apps/api/src/server.ts
apps/api/src/services/sale-service.ts
apps/api/src/services/delivery-service.ts
apps/api/src/services/inventory-service.ts
apps/api/src/services/cash-service.ts
apps/api/src/services/customer-service.ts
apps/api/prisma/schema.prisma
```

### 2.2 Limitación de auditoría

Esta auditoría es estática. No se ejecutó `build`, `test`, migraciones, seeds ni flujos E2E contra una base de datos viva. Por eso, las conclusiones se clasifican en:

```txt
Confirmado en código
Parcialmente confirmado
Pendiente de prueba runtime
Pendiente de implementación
```

### 2.3 Actualizacion de cierre P0/P1

Fecha de actualizacion: 2026-05-24.

Despues de ejecutar el sprint de estabilidad, la auditoria ya no es solo estatica para los flujos P0/P1. Se agregaron validaciones runtime con backend real y PostgreSQL local.

Scripts agregados:

```txt
npm run audit:stability
npm run test:integration
npm run audit:stability:integration
```

Validacion ejecutada:

```txt
lint -> OK
build -> OK
unit tests -> OK, 18/18
integration tests backend + DB -> OK, 3/3
```

Cobertura agregada:

```txt
P0-01 Entorno audit sin mocks -> cubierto
P0-02 Script audit:stability -> cubierto
P0-03 Seed minimo de auditoria -> cubierto y ampliado
P0-04 POS con cliente/precio especial/pago mixto/caja/inventario -> cubierto por integracion backend + DB
P0-05 Inventario negativo -> cubierto por integracion backend + DB
P0-06 Ruta completa -> cubierto por integracion backend + DB
P0-07 Modulos demo bloqueados o etiquetados en modo real -> cubierto por bloqueo de API demo con VITE_USE_MOCKS=false
P1-01 RouteDetailPage separado en tabs -> cubierto
P1-02 Cobro de ruta con contexto de credito -> cubierto
P1-03 Invalidaciones tras credito/ruta -> cubierto
P1-04 Cobrar saldo en clientes -> cubierto
P1-05 Navegacion owner operativa -> cubierta con menu actual
```

Limitacion vigente:

```txt
La validacion runtime actual cubre backend real + DB real.
Todavia falta una prueba E2E minima de la PWA con navegador usando Playwright y VITE_USE_MOCKS=false.
```

---

## 3. Estado real del monorepo

El proyecto sí tiene backend y frontend.

```txt
apps/api -> API Node/TypeScript + Prisma
apps/web -> PWA React/Vite
```

El `package.json` raíz declara workspaces:

```txt
apps/*
packages/*
```

En la auditoría se verificó el uso de `apps/api` y `apps/web`. No se debe afirmar ausencia física de `packages/` sin listar árbol completo del repo.

La PWA contiene rutas reales para:

```txt
/login
/app/select-branch
/app/pos
/app/pos/cash/open
/app/pos/sale
/app/manager/dashboard
/app/manager/cash
/app/manager/withdrawals
/app/manager/inventory
/app/manager/inventory/products
/app/manager/inventory/prices
/app/manager/inventory/production
/app/manager/customers
/app/manager/customers/:customerId
/app/manager/routes
/app/manager/routes/:routeId
/app/manager/billing
/app/manager/reports
/app/manager/settings
```

---

## 4. Diagnóstico ejecutivo

Tortilla Plus no está en etapa de “sólo backend”. Ya existe una PWA y un backend con varios flujos reales.

El problema principal es este:

```txt
El sistema mezcla flujos reales con mocks, pantallas demo y módulos parcialmente conectados.
```

Riesgos principales:

```txt
1. VITE_USE_MOCKS=true por default.
2. Algunas pantallas parecen listas pero devuelven datos demo.
3. No hay evidencia suficiente de E2E real.
4. Rutas funciona, pero la UX está cargada.
5. Facturación existe en UI, pero no está estable como backend real.
6. Owner navega módulos, no necesariamente flujos.
```

El sprint debe enfocarse en validar operación real.

---

## 5. Hallazgo P0: mocks activos por default

En `apps/web/src/api/mock-data.ts` se define:

```ts
export const useMocks = import.meta.env.VITE_USE_MOCKS !== "false";
```

En `apps/web/.env.example` se define:

```txt
VITE_USE_MOCKS=true
```

Impacto:

```txt
Si no se configura explícitamente VITE_USE_MOCKS=false,
la PWA puede operar con datos demo.
```

Esto invalida cualquier QA operativo si no se controla.

### Acción obligatoria

Crear configuración de auditoría:

```txt
apps/web/.env.audit.example
```

Contenido sugerido:

```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_APP_NAME=Tortilla Plus
VITE_APP_ENV=audit
VITE_USE_MOCKS=false
```

Criterio:

```txt
Ningún flujo crítico se valida con mocks.
```

---

## 6. Auditoría por flujo

---

# 6.1 POS / venta en mostrador

## Estado

```txt
Confirmado en código: funcional parcial
Pendiente: E2E real
```

## Lo que ya existe

La API expone rutas reales para venta:

```txt
POST /api/v1/sales
POST /api/v1/sales/quote
GET  /api/v1/sales
GET  /api/v1/sales/:id
POST /api/v1/sales/:id/items
POST /api/v1/sales/:id/complete
POST /api/v1/sales/:id/cancel-draft
POST /api/v1/sales/:id/cancel-paid
POST /api/v1/sales/:id/returns
```

El servicio de venta soporta:

```txt
Crear venta draft
Cotizar venta
Agregar items
Completar venta
Cancelar draft
Cancelar venta pagada
Devoluciones
Pagos múltiples
Crédito/fiado
Inventario
Auditoría
```

El frontend POS tiene:

```txt
Selector de cliente
Venta con customerId
Cotización
Carrito
Pago efectivo
Pago tarjeta
Pago transferencia
Pago mixto
Pago crédito
PIN para crédito excedido
```

## Reglas confirmadas

La cotización usa:

```txt
branchId
customerId
items
saleMode
priceSource
```

`by_amount` se resuelve tomando precio base de kg. Esto es correcto para “N pesos de tortilla”.

El inventario se descuenta al completar venta, no al cotizar.

El pago con crédito exige cliente.

El pago con tarjeta genera referencia de terminal en backend cuando aplica.

## Pendientes

```txt
1. Probar venta completa con VITE_USE_MOCKS=false.
2. Probar venta con cliente y precio especial.
3. Probar venta por monto.
4. Probar paquete 800g.
5. Probar pago mixto.
6. Probar crédito dentro de límite.
7. Probar crédito excedido con PIN.
8. Probar cancelación de draft.
9. Probar error al fallar un item.
10. Probar consistencia caja/inventario/saldo.
```

## Riesgo

El frontend crea venta draft, luego agrega items, luego completa. Si falla el agregado de un item o la venta queda interrumpida, puede quedar draft abierto. Backend tiene cancelación de draft, pero la UX debe controlar este caso.

## Acción

Agregar manejo explícito:

```txt
Si falla completar venta:
- mostrar error claro;
- permitir cancelar draft;
- permitir reintentar;
- no dejar al cajero sin salida.
```

---

# 6.2 Clientes, precios especiales y crédito

## Estado

```txt
Confirmado en código: funcional parcial
Pendiente: UX de cobro y pruebas
```

## Lo que ya existe

Frontend de clientes permite:

```txt
Crear cliente
Definir tipo
Activar crédito
Definir límite
Ver saldo
Asignar a ruta
Vender desde cliente
Ver detalle
```

La acción `Vender` dirige a:

```txt
/app/pos/sale?customerId={id}
```

El backend soporta:

```txt
Crear cliente
Actualizar cliente
Configurar crédito
Consultar balance
Registrar pago
Definir precio especial
Listar precios de cliente
```

## Pendientes

```txt
1. Agregar acción clara “Cobrar saldo”.
2. Agregar modal de pago de saldo.
3. Mostrar historial de movimientos con mejor UX.
4. Invalidar queries tras pagos a crédito en ruta.
5. Confirmar que precio especial se aplica en POS y ruta.
6. Confirmar que precio especial global y por sucursal respetan prioridad.
```

## Riesgo

El flujo comercial del cliente todavía se siente administrativo. El owner necesita acciones directas:

```txt
Vender
Cobrar saldo
Asignar precio
Asignar ruta
Ver deuda
```

No sólo CRUD.

---

# 6.3 Caja

## Estado

```txt
Backend funcional
Frontend parcial
Pendiente: prueba integral
```

## Lo que ya existe

El backend importa y usa funciones para:

```txt
Abrir caja
Consultar caja abierta
Resumen de caja
Cerrar caja
Registrar ingreso
Solicitar retiro
Autorizar retiro
Rechazar retiro
Cancelar retiro
```

Rutas y liquidaciones pueden depositar efectivo a caja mediante el flujo de reparto.

## Pendientes

```txt
1. E2E abrir caja.
2. E2E venta POS -> caja.
3. E2E retiro pendiente.
4. E2E autorizar retiro.
5. E2E bloquear cierre con retiro pendiente.
6. E2E liquidación de ruta -> depósito a caja.
7. E2E cierre con diferencia.
```

## Riesgo

Caja es el centro financiero. Si POS y rutas no se prueban contra caja abierta, el sistema puede vender pero no cerrar operación.

---

# 6.4 Inventario, producción y productos

## Estado

```txt
Backend funcional parcial
Frontend mixto
Pendiente: pruebas cruzadas
```

## Lo que ya existe

El backend tiene soporte para:

```txt
Productos
Precios por sucursal
Inventario por sucursal
Ajustes
Producción
Mermas
Paquetes con producto base
Descuento por venta
Descuento por carga de ruta
```

## Regla confirmada

En venta POS:

```txt
tortilla y masa permiten stock negativo
retail no permite stock negativo
paquete descuenta producto base
stock negativo genera audit log
```

## Pendientes

```txt
1. Probar paquete 800g contra producto base.
2. Probar tortilla sin stock.
3. Probar masa sin stock.
4. Probar retail sin stock.
5. Probar merma.
6. Probar producción.
7. Probar ajuste manual.
8. Revisar producción frontend, porque consulta demo.
```

## Riesgo

Inventario puede quedar técnicamente correcto en backend, pero operativo débil si producción, ventas y rutas no se validan juntas.

---

# 6.5 Rutas, pedidos, entrega, cobro y liquidación

## Estado

```txt
Backend avanzado
Frontend funcional pero pesado
Pendiente: E2E y UX
```

## Lo que ya existe

Backend soporta:

```txt
Crear repartidor
Crear ruta
Asignar cliente
Quitar cliente
Reordenar clientes
Listar pedidos reales
Crear pedido real
Validar cliente asignado
Resolver precio especial
Preparar pedido
Cargar pedido
Descontar inventario al cargar
Marcar en ruta
Entregar pedido
Registrar devolución por entrega parcial
Registrar pago
Bloquear sobrepago
Exigir referencia para tarjeta/transferencia
Registrar crédito en saldo de cliente
Crear liquidación
Listar liquidaciones
Cerrar liquidación
Depositar liquidación a caja
Bloquear depósito duplicado
```

Frontend consume:

```txt
deliveryRoutesRequest
assignCustomerToRouteRequest
removeCustomerFromRouteRequest
reorderRouteCustomersRequest
deliveryOrdersRequest
createDeliveryOrderRequest
deliveryOrderActionRequest
deliverDeliveryOrderRequest
recordDeliveryPaymentRequest
createDeliverySettlementRequest
deliverySettlementsRequest
closeDeliverySettlementRequest
depositDeliverySettlementRequest
```

## Pendientes

```txt
1. Separar RouteDetailPage en tabs.
2. Mostrar crédito disponible al cobrar.
3. Bloquear depositar si liquidación no está cerrada.
4. Bloquear depositar si ya fue depositada.
5. Invalidar manager-customers tras pago a crédito.
6. Invalidar customer-balance tras pago a crédito.
7. Crear vista “Pedidos de hoy”.
8. Crear vista “Liquidaciones pendientes”.
9. Probar ruta completa con backend real.
10. Probar devolución parcial.
```

## Riesgo UX

`RouteDetailPage` concentra demasiadas responsabilidades:

```txt
Clientes de ruta
Nuevo pedido
Cobro
Estados de pedido
Entrega
Liquidación
Depósito
```

Funciona como pantalla técnica. Para operación real debe dividirse en flujo.

## Propuesta UX mínima

```txt
Tab 1: Clientes
Tab 2: Pedidos
Tab 3: Carga / Entrega
Tab 4: Cobros
Tab 5: Liquidación
```

---

# 6.6 Facturación

## Estado

```txt
UI existe
Frontend tiene funciones
Backend no está confirmado en server.ts
Estado operativo: demo/no estable
```

## Lo que existe

Ruta frontend:

```txt
/app/manager/billing
```

Protegida por:

```txt
FeatureGuard feature="billing_cfdi"
```

Funciones frontend:

```txt
billingSummaryRequest
createIndividualInvoiceRequest
createGlobalDailyInvoiceRequest
```

## Problema

`billingSummaryRequest` devuelve demo data siempre.

Las acciones intentan llamar:

```txt
/billing/invoices/individual
/billing/invoices/global-daily
```

En el `server.ts` auditado no se confirmaron esas rutas.

## Decisión

Facturación queda fuera del sprint de estabilidad operativa.

## Pendiente posterior

```txt
GET  /billing/summary
POST /billing/invoices/individual
POST /billing/invoices/global-daily
Portal de autofactura
CFDI
Timbrado
Cancelación fiscal
Factura global diaria por sucursal
```

---

# 6.7 Dashboard, reportes y settings

## Estado

```txt
UI existente
Datos demo parciales
No estable como fuente operativa
```

## Funciones con demo confirmado

```txt
managerDashboardRequest
pendingWithdrawalsRequest
productionBatchesRequest
billingSummaryRequest
reportsSummaryRequest
settingsSummaryRequest
```

## Riesgo

El owner puede ver datos que aparentan ser reales.

## Acción

Cuando `VITE_USE_MOCKS=false`, estas secciones deben:

```txt
usar backend real
o mostrar etiqueta “demo/no operativo”
o bloquearse temporalmente
```

---

## 7. Requerimientos inexistentes

Estos requerimientos no están confirmados como flujo real estable en el repo auditado:

```txt
Facturación global diaria real desde backend
Facturación individual real desde backend
Portal público de autofactura
Conciliación bancaria
Reportes reales consolidados
Dashboard owner con métricas reales
Integración con báscula
Integración con terminal Mercado Pago
Integración con Clip
Integración con BBVA
Lectura de código de barras
Gestión avanzada de permisos por pantalla
Pruebas E2E completas
Script de auditoría operativa
Env específico para auditoría sin mocks
```

---

## 8. Requerimientos existentes pero incompletos

```txt
POS con cliente y crédito:
Existe, falta prueba integral.

Clientes:
Existe, falta flujo directo de cobro.

Caja:
Existe, falta E2E de corte completo.

Inventario:
Existe, falta prueba cruzada POS/ruta/producción.

Rutas:
Existe, falta UX operativa y E2E.

Producción:
Existe parcialmente, pero consulta frontend todavía usa demo.

Dashboard:
Existe UI, faltan datos reales.

Reportes:
Existe UI, faltan datos reales.

Facturación:
Existe UI, falta backend real expuesto.

Permisos:
Existen guards y botones por permiso, falta auditoría completa por rol.
```

---

## 9. Requerimientos con detalles faltantes

```txt
Cómo se recupera una venta draft fallida.
Cómo se cancela una venta interrumpida desde POS.
Cómo se muestra el origen del precio al cajero.
Cómo se audita stock negativo en UI.
Cómo se ve el depósito de ruta dentro del corte.
Cómo se corrige una devolución parcial de ruta.
Cómo se revisan devoluciones pendientes.
Cómo se consultan pedidos por día.
Cómo se consulta historial real de producción.
Cómo se separan clientes comerciales y frecuentes.
Cómo se controla caja cuando hay varios POS.
Cómo se bloquea UI por permisos finos.
Cómo se muestran módulos demo en modo real.
```

---

## 10. Lista de cosas por hacer

---

# P0 — Estabilidad obligatoria

## P0-01 — Crear entorno de auditoría sin mocks

Crear:

```txt
apps/web/.env.audit.example
```

Con:

```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_APP_NAME=Tortilla Plus
VITE_APP_ENV=audit
VITE_USE_MOCKS=false
```

Criterio:

```txt
Todo QA operativo usa VITE_USE_MOCKS=false.
```

---

## P0-02 — Crear script de auditoría

Agregar en raíz:

```json
{
  "audit:stability": "npm run lint && npm run build && npm run test"
}
```

Si se agregan E2E:

```json
{
  "audit:stability": "npm run lint && npm run build && npm run test && npm run test:e2e"
}
```

---

## P0-03 — Crear seed mínimo de auditoría

Debe crear:

```txt
Organización demo
Sucursal demo
Usuario owner
Usuario manager
Usuario cashier
Caja inicial
Productos tortilla/masa/paquete/retail
Producto base para paquete 800g
Precios por sucursal
Cliente con crédito
Cliente con precio especial
Repartidor
Ruta
Cliente asignado a ruta
Inventario inicial
```

---

## P0-04 — Prueba E2E POS con cliente

Flujo obligatorio:

```txt
Login cashier
Seleccionar sucursal
Abrir caja
Crear cliente
Configurar crédito
Asignar precio especial
Entrar a POS con customerId
Agregar tortilla por kg
Agregar paquete 800g
Cotizar
Pagar mixto efectivo + crédito
Completar venta
Verificar caja
Verificar inventario
Verificar saldo cliente
```

---

## P0-05 — Prueba E2E POS con stock negativo

Casos:

```txt
Tortilla sin stock -> permite venta
Masa sin stock -> permite venta
Retail sin stock -> bloquea venta
Stock negativo -> crea audit log
```

---

## P0-06 — Prueba E2E ruta completa

Flujo obligatorio:

```txt
Login manager
Crear ruta
Crear repartidor
Asignar cliente a ruta
Crear pedido
Preparar pedido
Cargar pedido
Validar inventario descontado
Marcar en ruta
Entregar parcial
Crear devolución pendiente
Cobrar efectivo
Crear liquidación
Cerrar liquidación
Depositar a caja
Verificar caja
Bloquear doble depósito
```

---

## P0-07 — Bloquear o etiquetar módulos demo

Aplicar a:

```txt
Dashboard
Reportes
Billing
Settings summary
Producción histórico
Retiros pendientes si siguen demo
```

Regla:

```txt
Si VITE_USE_MOCKS=false y no hay backend real,
mostrar “Módulo demo / pendiente de backend”.
```

---

# P1 — UX operativa

## P1-01 — Separar RouteDetailPage

Nueva estructura:

```txt
Clientes
Pedidos
Carga / Entrega
Cobros
Liquidación
```

No hacer rediseño visual completo.

---

## P1-02 — Mejorar cobro de ruta

Al seleccionar pedido, mostrar:

```txt
Cliente
Saldo actual
Límite de crédito
Disponible
Pendiente pedido
Método de pago
Referencia si aplica
PIN si excede
```

---

## P1-03 — Corregir invalidaciones tras crédito

Después de pago en ruta con crédito, invalidar:

```txt
delivery-orders
manager-customers
customer-balance
delivery-settlements
```

---

## P1-04 — Agregar “Cobrar saldo” en clientes

Desde listado y detalle:

```txt
Botón Cobrar saldo
Modal de pago
Método efectivo/tarjeta/transferencia
Referencia obligatoria si aplica
Actualización de balance
```

---

## P1-05 — Mejorar navegación owner

Menú operativo sugerido:

```txt
Inicio
Ventas
Clientes
Reparto
Inventario
Caja
Reportes
Configuración
```

El menú actual ya está cerca. El pendiente es que las acciones internas sean flujos, no formularios acumulados.

---

# P2 — Después de estabilidad

```txt
Facturación global real
Facturación individual real
Autofactura pública
Conciliación bancaria
Dashboard real
Reportes reales
Exportaciones
Terminal Mercado Pago
Terminal Clip
Báscula
Código de barras
Permisos avanzados
```

---

## 11. Roadmap

### Fase 1 — Corrección de auditoría

```txt
Documento V0.2
Estado real apps/api + apps/web
Flujos confirmados
Mocks identificados
Módulos demo identificados
```

### Fase 2 — QA sin mocks

```txt
Env audit
Seed audit
Script audit
POS E2E
Ruta E2E
Caja E2E
Inventario E2E
```

### Fase 3 — UX operativa

```txt
Tabs en rutas
Cobrar saldo
Vista pedidos de hoy
Liquidaciones pendientes
Alertas reales
```

### Fase 4 — Hardening

```txt
Errores claros
Permisos por rol
Logs de auditoría visibles
Pruebas regresivas
Smoke test
Build obligatorio
```

### Fase 5 — Módulos fiscales e integraciones

```txt
Facturación
Autofactura
Reportes reales
Conciliación
Terminales
Báscula
Código de barras
```

---

## 12. Checklist de aceptación

### POS

```txt
[ ] Corre con VITE_USE_MOCKS=false.
[ ] Requiere caja abierta.
[ ] Venta pública funciona.
[ ] Venta con cliente funciona.
[ ] Cliente por query param funciona.
[ ] Precio especial se aplica.
[ ] Tortilla por kg funciona.
[ ] Tortilla por monto funciona.
[ ] Masa por kg funciona.
[ ] Masa por monto funciona.
[ ] Paquete 800g funciona.
[ ] Retail funciona.
[ ] Pago efectivo funciona.
[ ] Pago tarjeta exige referencia.
[ ] Pago transferencia exige referencia.
[ ] Pago mixto funciona.
[ ] Crédito funciona.
[ ] Crédito sin cliente se bloquea.
[ ] Crédito excedido exige PIN.
[ ] Inventario se descuenta.
[ ] Caja refleja venta.
[ ] Saldo cliente se actualiza.
[ ] Draft fallido se puede cancelar.
```

### Clientes

```txt
[ ] Crear cliente.
[ ] Editar cliente.
[ ] Activar crédito.
[ ] Definir límite.
[ ] Asignar precio especial.
[ ] Vender desde cliente.
[ ] Cobrar saldo.
[ ] Ver movimientos.
[ ] Asignar a ruta.
[ ] Consultar saldo actualizado.
```

### Caja

```txt
[ ] Abrir caja.
[ ] Consultar caja abierta.
[ ] Registrar venta.
[ ] Registrar ingreso.
[ ] Solicitar retiro.
[ ] Autorizar retiro.
[ ] Rechazar retiro.
[ ] Bloquear cierre con retiro pendiente.
[ ] Depositar liquidación.
[ ] Cerrar caja.
[ ] Mostrar diferencia.
```

### Inventario

```txt
[ ] Crear producto.
[ ] Definir precio.
[ ] Ajustar inventario.
[ ] Producir tortilla.
[ ] Producir masa.
[ ] Registrar merma.
[ ] Tortilla sin stock permite venta.
[ ] Masa sin stock permite venta.
[ ] Retail sin stock se bloquea.
[ ] Paquete 800g descuenta base.
[ ] Stock negativo genera auditoría.
```

### Rutas

```txt
[ ] Crear repartidor.
[ ] Crear ruta.
[ ] Asignar cliente.
[ ] Reordenar cliente.
[ ] Crear pedido.
[ ] Pedido usa precio especial.
[ ] Preparar pedido.
[ ] Cargar pedido.
[ ] Carga descuenta inventario.
[ ] Marcar en ruta.
[ ] Entregar completo.
[ ] Entregar parcial.
[ ] Generar devolución.
[ ] Cobrar efectivo.
[ ] Cobrar tarjeta con referencia.
[ ] Cobrar transferencia con referencia.
[ ] Cobrar crédito.
[ ] Crédito actualiza saldo.
[ ] Crear liquidación.
[ ] Cerrar liquidación.
[ ] Depositar a caja.
[ ] Bloquear doble depósito.
```

### Demo/mocks

```txt
[ ] QA no usa VITE_USE_MOCKS=true.
[ ] Dashboard demo etiquetado.
[ ] Reportes demo etiquetados.
[ ] Billing demo bloqueado o etiquetado.
[ ] Producción demo identificada.
[ ] Settings demo identificado.
```

---

## 13. Prompt para Codex

```md
Trabaja sobre Tortilla Plus — V1 Operativa Comercial.

Objetivo:
Cerrar el Sprint de Auditoría — Estabilidad Operativa V0.2.

Contexto:
El monorepo ya contiene apps/api y apps/web. No asumas que falta frontend. La PWA existe. El problema es estabilizar flujos reales con mocks apagados.

Reglas:
- No rediseñar toda la app.
- No implementar facturación avanzada todavía.
- No implementar terminales de pago.
- No implementar báscula.
- No implementar código de barras.
- No validar flujos críticos con mocks.
- Usar VITE_USE_MOCKS=false.
- Mantener rutas existentes.
- No romper POS.
- No romper clientes.
- No romper caja.
- No romper inventario.
- No romper rutas.

Prioridades:
1. Crear apps/web/.env.audit.example con VITE_USE_MOCKS=false.
2. Agregar script audit:stability.
3. Crear seed mínimo de auditoría.
4. Agregar pruebas para POS:
   - abrir caja;
   - crear cliente;
   - asignar precio especial;
   - vender con customerId;
   - pagar mixto efectivo + crédito;
   - validar caja;
   - validar inventario;
   - validar saldo.
5. Agregar pruebas para inventario:
   - tortilla permite negativo;
   - masa permite negativo;
   - retail bloquea negativo;
   - paquete 800g descuenta base.
6. Agregar pruebas para ruta:
   - crear ruta;
   - asignar cliente;
   - crear pedido;
   - preparar;
   - cargar;
   - descontar inventario;
   - entregar parcial;
   - crear devolución;
   - cobrar;
   - crear liquidación;
   - cerrar liquidación;
   - depositar a caja.
7. Corregir invalidación de queries tras pagos con crédito.
8. Bloquear o etiquetar módulos demo si VITE_USE_MOCKS=false.
9. Separar RouteDetailPage en tabs operativos.
10. Agregar acción Cobrar saldo en clientes.

Criterio de aceptación:
Con mocks apagados debe poder demostrarse una venta POS real con cliente, precio especial, crédito, caja e inventario; y una ruta real completa desde pedido hasta liquidación depositada a caja.
```

---

## 14. Conclusión

El sprint no debe reconstruir Tortilla Plus.

Debe estabilizar lo que ya existe:

```txt
1. Apagar mocks.
2. Probar flujos reales.
3. Corregir desconexiones FE/API.
4. Reducir UX pesada.
5. Bloquear pantallas demo.
6. Agregar pruebas regresivas.
```

Una vez cerrado este sprint, el proyecto queda listo para decidir entre:

```txt
Facturación
Terminales
Báscula
Código de barras
Reportes avanzados
```

Orden recomendado:

```txt
1. Estabilidad operativa
2. Reportes reales
3. Facturación
4. Terminales
5. Báscula
6. Código de barras
