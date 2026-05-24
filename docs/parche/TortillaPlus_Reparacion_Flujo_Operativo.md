# Tortilla Plus — Reparación Profesional de Flujo Operativo

**Documento:** Instrucciones para equipo de desarrollo  
**Producto:** Tortilla Plus — V1 Operativa Comercial  
**Área afectada:** POS, Clientes, Precios especiales, Crédito/fiado, Rutas, Pedidos de reparto, UX Owner  
**Prioridad:** Alta  
**Tipo de trabajo:** Corrección funcional + rediseño operativo controlado  
**No es:** rediseño visual general, refactor masivo, cambio de stack, deuda técnica cosmética

---

## 1. Resumen ejecutivo

El sistema actualmente tiene entidades importantes creadas —clientes, precios especiales, rutas, pedidos y crédito— pero no están conectadas en un flujo operativo completo.

El problema principal no es visual. Es funcional:

```txt
Cliente existe → precio especial existe → POS no selecciona cliente → precio especial no se aplica.
Ruta existe → no se asignan clientes desde UI → pedidos usan mock → ruta no opera realmente.
Crédito existe en backend → POS no permite fiado → saldo de cliente no se usa en venta real.
```

La reparación debe enfocarse en cerrar los flujos de operación reales de una tortillería:

1. Vender en mostrador.
2. Vender a cliente frecuente/comercial.
3. Aplicar precios especiales.
4. Permitir fiado/crédito.
5. Configurar rutas con clientes reales.
6. Crear pedidos de ruta reales.
7. Preparar, cargar, entregar, cobrar y liquidar rutas.
8. Simplificar la UX del owner para operar el negocio, no navegar tablas.

---

## 2. Objetivo del proyecto de reparación

Convertir los módulos actuales de **Clientes**, **POS** y **Rutas** en un flujo operativo integrado.

Al finalizar, el sistema debe permitir:

```txt
Cliente comercial → precios especiales → venta POS → pago/fiado → saldo actualizado.
Cliente comercial → asignación a ruta → pedido de reparto → carga → entrega → cobro → liquidación.
```

---

## 3. Alcance funcional

### 3.1 Incluido

Este trabajo incluye:

- Selección de cliente desde POS.
- Venta anónima y venta con cliente.
- Aplicación de precios especiales por cliente.
- Pago con crédito/fiado.
- Pago mixto con efectivo, tarjeta y crédito.
- Validación de límite de crédito.
- Autorización por PIN cuando exceda límite.
- Asignación de clientes a rutas.
- Orden de clientes dentro de ruta.
- Consulta real de pedidos de ruta.
- Eliminación de mocks críticos en pedidos de ruta.
- Creación real de pedidos de reparto.
- Flujo completo de pedido: pendiente, preparado, cargado, en ruta, entregado, pagado/liquidado.
- UX Owner simplificada por flujos de negocio.
- Criterios QA para validar operación end-to-end.

### 3.2 Excluido

No se debe gastar tiempo en:

- Rediseño visual completo.
- Cambio de stack.
- Refactor masivo de carpetas.
- Migración de React Router.
- Reescritura total de API.
- Optimización prematura de estados globales.
- Implementación completa de báscula.
- Implementación completa de lector de código de barras.
- Facturación avanzada fuera del flujo operativo actual.
- Multi-sucursal avanzado fuera de la sucursal activa.

---

## 4. Principios de reparación

### 4.1 Primero flujo, después estética

No mejorar pantallas que siguen sin cerrar operación.

Incorrecto:

```txt
Hacer más bonita la pantalla de rutas sin permitir asignar clientes.
```

Correcto:

```txt
Permitir agregar clientes a ruta, crear pedidos reales y liquidar.
```

### 4.2 No construir CRUDs aislados

Cada pantalla debe responder a una tarea real del negocio.

Ejemplo:

```txt
Clientes no es solo listar clientes.
Clientes debe permitir vender, cobrar saldo, ver historial y asignar a ruta.
```

### 4.3 El POS debe ser rápido

El POS no debe convertirse en panel administrativo.

Debe permitir:

```txt
Venta rápida
Venta a cliente
Cobro
Fiado
Nueva venta
```

Nada más.

### 4.4 Rutas deben operar reparto, no solo mostrar rutas

Una ruta debe contener:

```txt
Clientes
Pedidos del día
Carga
Cobros
Liquidación
```

### 4.5 Owner no debe ver estructura técnica

El owner no piensa en:

```txt
Productos
Precios
Producción
Retiros
Inventario
Rutas
Facturas
Reportes
```

como entidades separadas. Piensa en:

```txt
Vender
Cobrar
Repartir
Producir
Controlar caja
Revisar saldos
```

---

## 5. Estado actual detectado

### 5.1 POS

Problemas:

- `SalePage` no tiene selector de cliente.
- `createSaleRequest` solo envía `branchId`.
- Backend sí acepta `customerId`, pero frontend no lo manda.
- `pos-cart.store` no tiene `selectedCustomer`.
- `PaymentModal` no permite pago `credit`.
- El carrito calcula precios con precios de sucursal; no contempla precios especiales de cliente.
- No existe indicador de origen de precio: sucursal vs cliente.

Impacto:

```txt
Los precios especiales configurados por cliente no se usan en la venta real.
```

---

### 5.2 Clientes

Problemas:

- Se pueden crear clientes.
- Se puede habilitar crédito.
- Se pueden asignar precios especiales.
- Pero desde cliente no hay acción directa “Vender”.
- No hay acceso natural a POS con cliente preseleccionado.
- No hay acción rápida “Cobrar saldo”.
- No hay acción rápida “Asignar a ruta”.

Impacto:

```txt
Clientes funciona como catálogo, no como herramienta operativa.
```

---

### 5.3 Rutas

Problemas:

- Se pueden crear rutas y repartidores.
- Backend tiene asignación de cliente a ruta.
- Frontend no expone UI para asignar clientes a ruta.
- Frontend no tiene request para asignar cliente a ruta.
- `deliveryOrdersRequest` usa datos demo/mock.
- Falta endpoint GET real para listar pedidos de ruta.
- La pantalla de detalle de ruta mezcla demasiadas operaciones en una sola vista plana.
- La ruta no muestra clientes reales ni secuencia de reparto.

Impacto:

```txt
Las rutas solo parecen existir, pero no son funcionales para operación diaria.
```

---

### 5.4 UX Owner

Problemas:

- Menú lateral con demasiados módulos al mismo nivel.
- Navegación orientada a tablas, no a trabajo real.
- El owner debe saber dónde vive cada función.
- No hay accesos operativos directos desde dashboard.
- El flujo entre Clientes, POS y Rutas no es obvio.

Impacto:

```txt
La UX se siente pesada porque obliga al usuario a administrar el sistema, no a operar su tortillería.
```

---

## 6. Flujo operativo objetivo

## 6.1 Flujo A — Venta mostrador anónima

### Usuario

Cajero, supervisor o owner.

### Objetivo

Vender rápido a público general.

### Flujo

```txt
POS
→ Nueva venta
→ Sin cliente seleccionado
→ Capturar tortilla, masa, paquete o producto
→ Cobrar efectivo/tarjeta/mixto
→ Completar venta
→ Nueva venta
```

### Reglas

- No requiere cliente.
- No permite crédito/fiado.
- Usa precios base de sucursal.
- Descuenta inventario según reglas actuales.
- Si producto es tortilla o masa, puede permitir stock negativo con auditoría.
- Si producto retail no tiene stock suficiente, debe bloquear.

### Criterios de aceptación

- Se puede vender sin cliente.
- No aparece opción de crédito si no hay cliente.
- El total se calcula con precio base.
- La venta queda registrada como `saleType = counter`.
- `customerId = null`.

---

## 6.2 Flujo B — Venta POS a cliente

### Usuario

Cajero, supervisor o owner.

### Objetivo

Vender en mostrador a cliente registrado, usando precios especiales y crédito si aplica.

### Flujo

```txt
POS
→ Buscar cliente
→ Seleccionar cliente
→ Sistema muestra nombre, tipo, saldo y crédito disponible
→ Capturar productos
→ Sistema aplica precio especial si existe
→ Cobrar efectivo/tarjeta/mixto/crédito
→ Completar venta
→ Actualizar saldo si hubo crédito
```

### Reglas

- Cliente debe estar activo.
- La venta debe crearse con `customerId`.
- Si hay precio especial activo para cliente, debe usarse.
- Si no hay precio especial, usar precio base de sucursal.
- Si se paga con crédito, el cliente debe tener crédito habilitado.
- Si el crédito excede límite, pedir PIN/autorización.
- El saldo del cliente debe actualizarse al completar venta.

### Criterios de aceptación

- Desde POS puedo seleccionar cliente.
- El POS muestra el cliente activo.
- La venta se crea con `customerId`.
- El precio especial se usa cuando existe.
- Si no existe precio especial, usa precio base.
- Se puede pagar todo con crédito si el cliente tiene límite suficiente.
- Se puede pagar mixto: efectivo + tarjeta + crédito.
- Si no hay cliente, crédito queda bloqueado.
- Si se excede límite, aparece solicitud de PIN.
- Al completar la venta, el saldo del cliente aumenta.

---

## 6.3 Flujo C — Cliente → Vender

### Usuario

Owner, gerente o supervisor.

### Objetivo

Iniciar venta desde el detalle/listado de clientes.

### Flujo

```txt
Clientes
→ Seleccionar cliente
→ Acción: Vender
→ Abrir POS con cliente preseleccionado
→ Capturar venta
→ Cobrar/fiar
```

### Reglas

- El POS debe aceptar `customerId` por query param o por navegación con estado.
- Si el cliente no existe o está inactivo, POS debe mostrar error y limpiar selección.
- El botón debe estar visible en lista y detalle de cliente.

### Ruta sugerida

```txt
/app/pos/sale?customerId={customerId}
```

### Criterios de aceptación

- En la tabla de clientes aparece botón `Vender`.
- En detalle de cliente aparece botón `Vender`.
- Al presionar, abre POS.
- El cliente queda seleccionado automáticamente.
- Los precios especiales se aplican.

---

## 6.4 Flujo D — Configurar ruta

### Usuario

Owner, gerente o supervisor.

### Objetivo

Crear una ruta real con clientes asignados.

### Flujo

```txt
Reparto
→ Rutas
→ Nueva ruta
→ Asignar repartidor
→ Abrir ruta
→ Agregar clientes
→ Ordenar clientes
→ Guardar
```

### Reglas

- Una ruta pertenece a una sucursal.
- Una ruta puede tener repartidor o quedar sin repartidor temporalmente.
- Una ruta debe permitir clientes activos.
- Un cliente no debe duplicarse dentro de la misma ruta.
- El `sortOrder` define el orden de visita.
- La UI debe mostrar total de clientes reales asignados.

### Endpoint existente a usar

```http
POST /delivery-routes/{routeId}/customers
```

### Payload

```json
{
  "customerId": "customer_1",
  "sortOrder": 1
}
```

### Criterios de aceptación

- Puedo crear una ruta.
- Puedo asignar repartidor.
- Puedo agregar clientes existentes.
- No puedo agregar cliente duplicado a la misma ruta.
- Puedo ver el número real de clientes.
- Puedo ordenar clientes por secuencia.
- Al recargar, los clientes siguen ahí.

---

## 6.5 Flujo E — Pedido de ruta

### Usuario

Owner, gerente, supervisor o encargado de reparto.

### Objetivo

Crear pedidos reales para clientes de una ruta.

### Flujo

```txt
Reparto
→ Ruta
→ Pedidos de hoy
→ Seleccionar cliente de la ruta
→ Agregar productos
→ Crear pedido
→ Estado: pendiente
```

### Reglas

- Solo debe sugerir clientes asignados a esa ruta.
- Debe permitir productos vendibles activos.
- Debe aplicar precio correcto:
  - Precio especial del cliente si existe.
  - Precio base si no existe.
- Debe soportar tortilla, masa, paquete y retail.
- Debe crear pedido real en backend.
- Debe aparecer en listado real de pedidos.

### Criterios de aceptación

- El pedido se crea contra `customerId`, `routeId` y `branchId`.
- El pedido aparece en lista tras recargar.
- El total es correcto.
- No usa mock.
- No permite pedido sin cliente.
- No permite pedido sin productos.

---

## 6.6 Flujo F — Preparar, cargar y entregar ruta

### Usuario

Owner, gerente, supervisor o encargado de reparto.

### Objetivo

Operar físicamente la ruta.

### Flujo

```txt
Pedido pendiente
→ Preparar
→ Cargar
→ En ruta
→ Entregar
```

### Reglas

- Solo se puede avanzar por estados válidos.
- Cargar descuenta inventario.
- Entregar permite registrar cantidad entregada y cantidad devuelta.
- Si hay devolución, debe crear devolución de ruta para revisión.
- No debe permitir saltarse estados.

### Estados válidos

```txt
pending → prepared → loaded → in_route → delivered
```

### Criterios de aceptación

- Un pedido pendiente puede prepararse.
- Un pedido preparado puede cargarse.
- Un pedido cargado puede marcarse en ruta.
- Un pedido en ruta puede entregarse.
- Cargar descuenta inventario.
- Si hay retorno parcial, se registra devolución.
- No se puede entregar un pedido que no está en ruta.

---

## 6.7 Flujo G — Cobro de ruta

### Usuario

Owner, gerente, supervisor o repartidor autorizado.

### Objetivo

Registrar pagos de pedidos de reparto.

### Flujo

```txt
Ruta
→ Cobros
→ Seleccionar pedido
→ Registrar pago
→ Actualizar pendiente
```

### Métodos

```txt
Efectivo
Tarjeta
Transferencia
Crédito
```

### Reglas

- Pago no debe exceder saldo pendiente, salvo regla explícita posterior.
- Crédito requiere cliente con crédito habilitado.
- Si crédito excede límite, requiere autorización.
- Efectivo de ruta no entra directo a caja hasta liquidación.
- Tarjeta/transferencia deben poder registrar referencia en versión posterior.
- El pedido queda:
  - `paid` si cubre total.
  - `partially_paid` si queda saldo.

### Criterios de aceptación

- Puedo cobrar un pedido parcialmente.
- Puedo cobrar un pedido completo.
- El saldo pendiente se actualiza.
- Si pago en efectivo, afecta efectivo esperado de ruta.
- Si pago con crédito, aumenta saldo del cliente.
- No se pierde historial del pago.

---

## 6.8 Flujo H — Liquidación de ruta

### Usuario

Owner, gerente o supervisor.

### Objetivo

Cerrar efectivo entregado por repartidor.

### Flujo

```txt
Ruta
→ Liquidación
→ Crear liquidación
→ Sistema calcula efectivo esperado
→ Capturar efectivo entregado
→ Ver diferencia
→ Cerrar
→ Depositar a caja
```

### Reglas

- Solo considerar pagos en efectivo no liquidados.
- La liquidación cerrada puede depositarse a caja.
- Debe existir caja abierta para depositar.
- La diferencia debe quedar registrada.
- No debe duplicar efectivo en caja.

### Criterios de aceptación

- Sistema calcula efectivo esperado.
- Owner captura efectivo recibido.
- Sistema calcula diferencia.
- Se cierra liquidación.
- Se deposita a caja abierta.
- No se puede depositar dos veces la misma liquidación.

---

## 7. Cambios requeridos por módulo

---

# 7.1 Frontend — POS

## Archivos objetivo

```txt
apps/web/src/modules/pos/pages/sale-page.tsx
apps/web/src/modules/pos/stores/pos-cart.store.ts
apps/web/src/modules/pos/components/payment-modal.tsx
apps/web/src/api/sales.api.ts
apps/web/src/api/manager.api.ts
apps/web/src/modules/pos/types/pos.types.ts
```

## Tareas

### POS-FE-01 — Agregar cliente seleccionado al store

Agregar a `pos-cart.store.ts`:

```ts
selectedCustomer: PosSelectedCustomer | null;
setSelectedCustomer: (customer: PosSelectedCustomer | null) => void;
clearSelectedCustomer: () => void;
```

Tipo sugerido:

```ts
export type PosSelectedCustomer = {
  id: string;
  name: string;
  customerType: string;
  phone?: string | null;
  creditEnabled: boolean;
  creditLimit: number;
  currentBalance: number;
  status: "active" | "inactive" | "deleted";
};
```

Reglas:

- `clearCart()` no necesariamente debe limpiar cliente.
- `Nueva venta` debe mantener o limpiar cliente según decisión UX:
  - Recomendado: limpiar cliente para evitar venta accidental.
- `Cancelar ticket` debe limpiar carrito, pero confirmar si conserva cliente.
  - Recomendado: limpiar cliente también.

---

### POS-FE-02 — Crear selector de cliente POS

Crear componente:

```txt
apps/web/src/modules/pos/components/customer-selector.tsx
```

Funciones:

- Buscar cliente por nombre/teléfono.
- Mostrar clientes activos.
- Seleccionar cliente.
- Quitar cliente.
- Mostrar saldo y crédito disponible.

UI mínima profesional:

```txt
Cliente
[Público general] [Buscar cliente]

Cuando hay cliente:
Tienda Lupita
Saldo: $320.00
Crédito disponible: $680.00
[Quitar]
```

Validaciones:

- No permitir cliente inactivo.
- Si falla carga de clientes, POS debe seguir permitiendo venta anónima.

---

### POS-FE-03 — Permitir POS con query param customerId

En `SalePage`:

- Leer `customerId` desde URL.
- Buscar cliente.
- Si existe y está activo, seleccionarlo.
- Si no existe, mostrar alerta y continuar sin cliente.

Ruta:

```txt
/app/pos/sale?customerId={customerId}
```

---

### POS-FE-04 — Modificar `createSaleRequest`

Actualizar payload:

```ts
type CreateSalePayload = {
  branchId: string;
  customerId?: string;
};
```

Al crear venta:

```ts
const draft = await createSaleRequest({
  branchId,
  customerId: selectedCustomer?.id
});
```

---

### POS-FE-05 — Agregar crédito al modal de pago

Actualizar `PaymentMode`:

```ts
type PaymentMode = "cash" | "card" | "mixed" | "credit";
```

Pero para operación real se recomienda evolucionar a lista de pagos:

```ts
payments: Array<{
  paymentMethod: "cash" | "card" | "transfer" | "credit";
  amount: string;
  reference?: string;
  provider?: string;
}>
```

La UI debe permitir:

```txt
Efectivo
Tarjeta
Mixto
Fiado
```

Mixto debe permitir:

```txt
Efectivo
Tarjeta
Crédito
```

Reglas:

- Crédito deshabilitado si no hay cliente.
- Crédito deshabilitado si cliente no tiene crédito habilitado.
- Si crédito excede disponible, pedir PIN.
- Tarjeta requiere referencia.

---

### POS-FE-06 — Mostrar origen del precio

Cada item del carrito debe poder mostrar:

```txt
Precio cliente
Precio sucursal
```

Actualizar tipo `PosCartItem`:

```ts
priceSource?: "branch" | "customer";
priceSourceLabel?: string;
```

---

# 7.2 Backend — Ventas y cotización

## Archivos objetivo

```txt
apps/api/src/server.ts
apps/api/src/services/sale-service.ts
apps/api/prisma/schema.prisma
```

## Estado actual

Backend ya soporta:

- `customerId` en `createSale`.
- Resolución de precio especial en `resolveBranchPrice`.
- Pago `credit`.
- Validación de crédito.
- Movimiento de saldo de cliente.

Pero falta un problema crítico:

```txt
El frontend calcula el carrito antes de enviar al backend.
```

Si el frontend solo conoce precios de sucursal, puede mostrar un total distinto al que backend calcularía con precio especial.

---

## Solución recomendada

Implementar endpoint de cotización.

### API-BE-01 — Crear endpoint `POST /sales/quote`

Ruta:

```http
POST /api/v1/sales/quote
```

Payload:

```json
{
  "branchId": "branch_1",
  "customerId": "customer_1",
  "items": [
    {
      "productId": "product_1",
      "saleMode": "by_kg",
      "quantity": "2.000"
    },
    {
      "productId": "product_2",
      "saleMode": "by_package",
      "quantity": "10.000"
    }
  ]
}
```

Respuesta:

```json
{
  "branchId": "branch_1",
  "customerId": "customer_1",
  "items": [
    {
      "productId": "product_1",
      "productName": "Tortilla",
      "saleMode": "by_kg",
      "quantity": "2.000",
      "unitPrice": "23.00",
      "priceSource": "customer",
      "total": "46.00"
    }
  ],
  "subtotal": "46.00",
  "total": "46.00"
}
```

Reglas:

- Usar misma lógica que `addSaleItem`.
- No crear venta.
- No descontar inventario.
- No crear auditoría de venta.
- Validar branch access.
- Validar cliente si se manda `customerId`.
- Validar producto activo.
- Validar precio existente.
- `by_amount` debe resolver con precio por kg.

Criterios de aceptación:

- Cotiza venta anónima.
- Cotiza venta con cliente.
- Usa precio especial cuando existe.
- Usa precio base cuando no existe especial.
- Devuelve origen del precio.
- Total coincide con venta real posterior.

---

## Alternativa permitida

Si no se implementa quote, agregar:

```http
GET /api/v1/customers/{customerId}/prices?branchId={branchId}
```

Pero la cotización es superior porque centraliza cálculo en backend.

---

# 7.3 Frontend — Clientes

## Archivos objetivo

```txt
apps/web/src/modules/manager/pages/customers-page.tsx
apps/web/src/modules/manager/pages/customer-detail-page.tsx
```

## Tareas

### CLIENT-FE-01 — Agregar acciones operativas

En lista de clientes agregar:

```txt
Vender
Cobrar saldo
Asignar a ruta
Ver detalle
```

En detalle de cliente agregar:

```txt
Vender en POS
Cobrar saldo
Asignar a ruta
Editar precios
```

### CLIENT-FE-02 — Botón vender

Acción:

```ts
navigate(`/app/pos/sale?customerId=${customer.id}`)
```

### CLIENT-FE-03 — Mejorar lectura de saldo

Mostrar:

```txt
Saldo actual
Límite
Disponible
Crédito habilitado/no habilitado
```

Disponible:

```txt
creditLimit - currentBalance
```

### CLIENT-FE-04 — Asignar cliente a ruta desde cliente

Puede ser modal:

```txt
Asignar a ruta
- Seleccionar ruta
- Orden en ruta
- Guardar
```

Debe usar el mismo endpoint de asignación de cliente a ruta.

---

# 7.4 Frontend — Rutas

## Archivos objetivo

```txt
apps/web/src/modules/manager/pages/routes-page.tsx
apps/web/src/modules/manager/pages/route-detail-page.tsx
apps/web/src/api/manager.api.ts
apps/web/src/modules/manager/types/manager.types.ts
```

## Tareas

### ROUTE-FE-01 — Agregar request para asignar cliente a ruta

En `manager.api.ts`:

```ts
export function assignCustomerToRouteRequest(payload: {
  routeId: string;
  customerId: string;
  sortOrder?: number;
}): Promise<void> {
  return httpClient<void>(`/delivery-routes/${payload.routeId}/customers`, {
    method: "POST",
    body: {
      customerId: payload.customerId,
      sortOrder: payload.sortOrder ?? 0
    }
  });
}
```

### ROUTE-FE-02 — Agregar sección Clientes en RouteDetailPage

Estructura sugerida:

```txt
Ruta Norte

Tabs:
[Clientes] [Pedidos de hoy] [Carga] [Cobros] [Liquidación]
```

Si no se implementan tabs, usar secciones plegables.

Sección Clientes:

```txt
Clientes de la ruta
[Agregar cliente]

Orden | Cliente | Tipo | Saldo | Acciones
1     | Tienda Lupita | Tienda | $320.00 | Crear pedido / Quitar
```

### ROUTE-FE-03 — Usar clientes asignados como base de pedidos

En “Nuevo pedido”:

- Mostrar primero clientes asignados a la ruta.
- Permitir buscar cliente externo solo si se decide explícitamente.
- Recomendado: restringir a clientes de la ruta para mantener orden operativo.

### ROUTE-FE-04 — Reemplazar pedidos mock

Actualmente `deliveryOrdersRequest` debe dejar de usar mock para operación real.

Implementar:

```ts
export async function deliveryOrdersRequest(filters: {
  branchId: string;
  routeId?: string;
  status?: string;
}): Promise<DeliveryOrder[]> {
  const params = new URLSearchParams();
  params.set("branchId", filters.branchId);
  if (filters.routeId) params.set("routeId", filters.routeId);
  if (filters.status) params.set("status", filters.status);

  const orders = await httpClient<ApiDeliveryOrder[]>(`/delivery-orders?${params.toString()}`);
  return orders.map(mapDeliveryOrder);
}
```

---

# 7.5 Backend — Rutas y pedidos

## Archivos objetivo

```txt
apps/api/src/server.ts
apps/api/src/services/delivery-service.ts
```

## Tareas

### ROUTE-BE-01 — Agregar GET `/delivery-orders`

Ruta:

```http
GET /api/v1/delivery-orders?branchId={branchId}&routeId={routeId}&status={status}
```

Parámetros:

| Parámetro | Requerido | Descripción |
|---|---:|---|
| `branchId` | Sí | Sucursal activa |
| `routeId` | No | Filtrar por ruta |
| `driverId` | No | Filtrar por repartidor |
| `customerId` | No | Filtrar por cliente |
| `status` | No | Filtrar por estado |
| `date` | No | Pedidos del día |

Respuesta:

```json
[
  {
    "id": "order_1",
    "branchId": "branch_1",
    "routeId": "route_1",
    "driverId": "driver_1",
    "customerId": "customer_1",
    "customer": {
      "id": "customer_1",
      "name": "Tienda Lupita"
    },
    "status": "pending",
    "total": "460.00",
    "amountCollected": "0.00",
    "amountPending": "460.00",
    "items": [
      {
        "id": "item_1",
        "productId": "product_1",
        "productName": "Paquete 800g",
        "quantityLoaded": "20.000",
        "quantityDelivered": "0.000",
        "quantityReturned": "0.000",
        "unitPrice": "23.00",
        "total": "460.00"
      }
    ]
  }
]
```

### ROUTE-BE-02 — Incluir customer en serializeOrder

Actualmente `serializeOrder` devuelve `customerId`, pero frontend necesita nombre.

Agregar include:

```ts
customer: true
```

Y serializar:

```ts
customer: order.customer
  ? { id: order.customer.id, name: order.customer.name }
  : null
```

### ROUTE-BE-03 — Resolver precios especiales en pedidos de ruta

Actualmente `createDeliveryOrder` usa precio base de sucursal.

Debe usar la misma lógica conceptual de venta:

```txt
Si cliente tiene precio especial activo → usarlo.
Si no → precio base de sucursal.
```

Modificar `resolveBranchPrice` de delivery para recibir `customerId`.

Firma sugerida:

```ts
async function resolveDeliveryPrice(
  tx,
  organizationId,
  branchId,
  customerId,
  productId,
  saleMode
)
```

Reglas:

- Para paquete: `by_package`.
- Para kg: `by_kg`.
- Para pieza: `by_unit`.
- Si cliente tiene precio activo para producto/modo/sucursal, usarlo.
- Si no, usar precio base.

### ROUTE-BE-04 — Registrar crédito en pagos de ruta

Actualmente `recordDeliveryPayment` registra pago, pero si `paymentMethod = credit`, debe aumentar saldo del cliente.

Reglas:

- Verificar feature `customer_credit`.
- Verificar cliente con crédito habilitado.
- Validar límite.
- Si excede, requerir autorización.
- Crear `CustomerBalanceMovement` con:
  - `movementType = charge`
  - `referenceType = delivery_order`
  - `referenceId = orderId`

### ROUTE-BE-05 — Evitar pagos excedidos

Agregar validación:

```txt
amount <= amountPending
```

Salvo que se decida permitir sobrepago, lo cual no se recomienda en V1.

---

# 7.6 UX Owner

## Archivo objetivo

```txt
apps/web/src/shared/layouts/manager-layout.tsx
```

## Problema

El menú actual es plano y técnico.

## Nueva estructura

Reorganizar navegación a:

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

## Propuesta de rutas

```txt
/app/manager/dashboard

/app/manager/sales
/app/manager/sales/history
/app/manager/sales/returns

/app/manager/customers
/app/manager/customers/:customerId
/app/manager/customers/balances

/app/manager/delivery/routes
/app/manager/delivery/routes/:routeId
/app/manager/delivery/orders
/app/manager/delivery/settlements

/app/manager/inventory
/app/manager/inventory/products
/app/manager/inventory/prices
/app/manager/inventory/production
/app/manager/inventory/waste

/app/manager/cash
/app/manager/cash/withdrawals
/app/manager/cash/closing

/app/manager/reports
/app/manager/settings
```

Para no romper demasiado, se permite mantener rutas internas existentes y solo cambiar navegación visible en primera fase.

## Dashboard owner

Agregar CTAs operativos:

```txt
Vender en POS
Preparar ruta
Cobrar saldos
Revisar stock
Autorizar retiros
Cerrar caja
```

Criterios:

- El dashboard debe ayudar a operar hoy.
- No debe ser solo métricas.
- Cada alerta debe tener acción.
- Cada acción debe llevar al flujo correcto.

---

## 8. Contratos API requeridos

---

### 8.1 POST `/sales/quote`

```http
POST /api/v1/sales/quote
```

Request:

```json
{
  "branchId": "uuid",
  "customerId": "uuid",
  "items": [
    {
      "productId": "uuid",
      "saleMode": "by_kg",
      "quantity": "2.000"
    }
  ]
}
```

Response:

```json
{
  "branchId": "uuid",
  "customerId": "uuid",
  "items": [
    {
      "productId": "uuid",
      "productName": "Tortilla",
      "saleMode": "by_kg",
      "quantity": "2.000",
      "unit": "kg",
      "unitPrice": "23.00",
      "priceSource": "customer",
      "total": "46.00"
    }
  ],
  "subtotal": "46.00",
  "total": "46.00"
}
```

Errores:

| Código | Mensaje |
|---|---|
| `CUSTOMER_NOT_FOUND` | Cliente no encontrado. |
| `PRODUCT_NOT_FOUND` | Producto no encontrado. |
| `PRICE_NOT_FOUND` | Precio no configurado. |
| `BRANCH_ACCESS_DENIED` | No tienes acceso a esta sucursal. |

---

### 8.2 GET `/delivery-orders`

```http
GET /api/v1/delivery-orders?branchId=uuid&routeId=uuid&status=pending
```

Response:

```json
[
  {
    "id": "uuid",
    "branchId": "uuid",
    "routeId": "uuid",
    "driverId": "uuid",
    "customerId": "uuid",
    "customer": {
      "id": "uuid",
      "name": "Tienda Lupita"
    },
    "status": "pending",
    "total": "460.00",
    "amountCollected": "0.00",
    "amountPending": "460.00",
    "items": []
  }
]
```

---

### 8.3 POST `/delivery-routes/{routeId}/customers`

Ya existe en backend. Frontend debe consumirlo.

Request:

```json
{
  "customerId": "uuid",
  "sortOrder": 1
}
```

Response esperada:

```json
{
  "id": "uuid",
  "routeId": "uuid",
  "customerId": "uuid",
  "sortOrder": 1
}
```

---

### 8.4 POST `/delivery-orders/{orderId}/payments`

Actualizar comportamiento para crédito.

Request:

```json
{
  "amount": "200.00",
  "paymentMethod": "credit",
  "authorizationPin": "1234"
}
```

Response:

```json
{
  "order": {
    "id": "uuid",
    "status": "partially_paid",
    "amountCollected": "200.00",
    "amountPending": "260.00"
  },
  "payment": {
    "id": "uuid",
    "paymentMethod": "credit",
    "amount": "200.00"
  }
}
```

---

## 9. Criterios de aceptación globales

## 9.1 POS

- [ ] POS permite venta sin cliente.
- [ ] POS permite buscar cliente activo.
- [ ] POS permite seleccionar cliente.
- [ ] POS permite quitar cliente.
- [ ] POS muestra saldo del cliente.
- [ ] POS muestra límite y disponible de crédito.
- [ ] POS crea venta con `customerId`.
- [ ] POS aplica precio especial del cliente.
- [ ] POS muestra origen del precio.
- [ ] POS bloquea crédito si no hay cliente.
- [ ] POS bloquea crédito si cliente no tiene crédito habilitado.
- [ ] POS permite efectivo.
- [ ] POS permite tarjeta con referencia.
- [ ] POS permite pago mixto.
- [ ] POS permite crédito.
- [ ] POS pide PIN si excede límite.
- [ ] Saldo del cliente se actualiza con venta fiada.

## 9.2 Clientes

- [ ] Lista de clientes muestra acción `Vender`.
- [ ] Detalle de cliente muestra acción `Vender`.
- [ ] Detalle de cliente muestra saldo, límite y disponible.
- [ ] Cliente puede asignarse a ruta.
- [ ] Cliente muestra precios especiales configurados.
- [ ] Cliente muestra movimientos de saldo.

## 9.3 Rutas

- [ ] Se puede crear ruta.
- [ ] Se puede asignar repartidor.
- [ ] Se puede agregar cliente a ruta.
- [ ] No se duplica cliente dentro de misma ruta.
- [ ] Se puede ordenar cliente por `sortOrder`.
- [ ] Ruta muestra clientes reales.
- [ ] Ruta muestra pedidos reales.
- [ ] No usa mocks en pedidos.
- [ ] Se puede crear pedido para cliente de ruta.
- [ ] Pedido usa precio especial de cliente si existe.
- [ ] Pedido avanza por estados correctos.
- [ ] Cargar pedido descuenta inventario.
- [ ] Entregar registra cantidades.
- [ ] Cobro actualiza pendiente.
- [ ] Crédito en ruta actualiza saldo de cliente.
- [ ] Liquidación calcula efectivo esperado.
- [ ] Liquidación puede depositarse a caja.

## 9.4 UX Owner

- [ ] Menú reducido y orientado a operación.
- [ ] Dashboard tiene acciones operativas.
- [ ] Clientes, POS y Reparto están conectados.
- [ ] No hay pantallas que solo “se vean bien” sin acción real.
- [ ] El owner puede completar una venta comercial sin salir del flujo.
- [ ] El owner puede completar una ruta sin buscar funciones dispersas.

---

## 10. Escenarios QA end-to-end

---

### QA-001 — Venta mostrador anónima

```txt
Dado que tengo caja abierta
Y productos con precio base
Cuando entro al POS sin cliente
Y vendo 2 kg de tortilla
Y cobro en efectivo
Entonces la venta se completa
Y no tiene customerId
Y descuenta inventario
```

---

### QA-002 — Venta con cliente y precio especial

```txt
Dado que existe cliente "Tienda Lupita"
Y tiene precio especial de tortilla a $22/kg
Y el precio base es $25/kg
Cuando selecciono "Tienda Lupita" en POS
Y vendo 10 kg de tortilla
Entonces el total debe ser $220
Y el carrito debe indicar precio de cliente
Y la venta debe tener customerId
```

---

### QA-003 — Venta fiada dentro del límite

```txt
Dado que el cliente tiene crédito habilitado
Y límite de $1,000
Y saldo actual de $200
Cuando vendo $300
Y selecciono pago Crédito
Entonces la venta se completa
Y el saldo del cliente queda en $500
```

---

### QA-004 — Venta fiada excediendo límite

```txt
Dado que el cliente tiene límite de $1,000
Y saldo actual de $900
Cuando intento fiar $200
Entonces el sistema solicita PIN/autorización
Y no completa la venta sin autorización válida
```

---

### QA-005 — Asignar cliente a ruta

```txt
Dado que existe Ruta Norte
Y existe cliente Tienda Lupita
Cuando agrego Tienda Lupita a Ruta Norte
Entonces aparece en clientes de la ruta
Y conserva su orden al recargar
```

---

### QA-006 — Crear pedido real de ruta

```txt
Dado que Ruta Norte tiene Tienda Lupita asignada
Cuando creo pedido de 20 paquetes
Entonces el pedido se guarda en backend
Y aparece en pedidos de Ruta Norte
Y no proviene de mock
```

---

### QA-007 — Cargar pedido de ruta

```txt
Dado que existe pedido preparado
Cuando lo marco como cargado
Entonces descuenta inventario
Y el estado cambia a loaded
```

---

### QA-008 — Entregar pedido de ruta

```txt
Dado que existe pedido en ruta
Cuando entrego cantidades completas
Entonces el pedido queda delivered
Y no genera devolución
```

---

### QA-009 — Entrega parcial con devolución

```txt
Dado que un pedido cargó 20 paquetes
Cuando entrego 18 paquetes
Entonces quedan 2 paquetes como devolución pendiente de revisión
```

---

### QA-010 — Cobro de ruta en efectivo

```txt
Dado que un pedido tiene pendiente $500
Cuando registro pago efectivo de $500
Entonces el pedido queda pagado
Y el efectivo esperado de ruta aumenta
```

---

### QA-011 — Liquidación de ruta

```txt
Dado que una ruta tiene $1,000 cobrados en efectivo
Cuando creo liquidación
Entonces efectivo esperado es $1,000
Cuando capturo $980 entregados
Entonces diferencia es -$20
Cuando cierro y deposito
Entonces se registra ingreso en caja
```

---

## 11. Plan de implementación sugerido

---

## Fase 1 — Reparar POS con clientes

Duración estimada: 1 sprint corto.

Tareas:

1. Agregar `selectedCustomer` al store.
2. Crear selector de cliente.
3. Permitir `customerId` por query param.
4. Enviar `customerId` en `createSaleRequest`.
5. Agregar crédito al modal de pago.
6. Agregar validaciones de crédito.
7. Implementar cotización o carga de precios especiales.

Cierre de fase:

```txt
Puedo venderle a un cliente con precio especial y dejar saldo a crédito.
```

---

## Fase 2 — Reparar rutas funcionales

Tareas:

1. Agregar request de asignación cliente-ruta.
2. Agregar sección clientes en ruta.
3. Agregar GET real de delivery orders.
4. Reemplazar mock de pedidos.
5. Crear pedidos reales para clientes de ruta.
6. Corregir precios especiales en pedidos de ruta.
7. Corregir crédito en pagos de ruta.

Cierre de fase:

```txt
Puedo crear y operar una ruta con clientes reales y pedidos reales.
```

---

## Fase 3 — UX Owner

Tareas:

1. Reorganizar menú.
2. Agregar CTAs al dashboard.
3. Agregar acciones rápidas en clientes.
4. Separar ruta detalle por secciones/tabs.
5. Fusionar visualmente productos/precios bajo Inventario.

Cierre de fase:

```txt
El owner puede operar ventas, clientes y reparto sin navegar módulos técnicos.
```

---

## Fase 4 — Limpieza técnica controlada

Solo después de cerrar flujos.

Tareas posibles:

- Unificar tipos compartidos entre API y frontend.
- Eliminar mocks restantes no explícitamente demo.
- Normalizar errores.
- Mejorar tests.
- Documentar contratos.
- Revisar duplicación de lógica de precios.
- Crear fixtures de QA.

---

## 12. Reglas de implementación

### 12.1 No romper rutas existentes

Si se cambia navegación visible, mantener redirects temporales.

Ejemplo:

```txt
/app/manager/routes
→ redirect a /app/manager/delivery/routes
```

### 12.2 No borrar mocks globales si siguen útiles para demo

Pero sí eliminar mocks de flujos críticos:

```txt
deliveryOrdersRequest no debe usar mock en operación real.
```

### 12.3 No duplicar lógica de precios

La lógica real de precios debe vivir en backend.

Frontend puede mostrar precio, pero backend debe ser fuente final.

### 12.4 No permitir ventas falsas

Si falla cotización, precio o cliente:

```txt
No completar venta silenciosamente.
```

### 12.5 No permitir crédito sin cliente

Regla estricta.

### 12.6 No permitir ruta sin sucursal

Toda ruta y pedido debe estar asociado a `branchId`.

---

## 13. Checklist técnico antes de merge

- [ ] `npm run lint` pasa.
- [ ] `npm run build` pasa.
- [ ] Migraciones Prisma aplicadas si hay cambios.
- [ ] Seed actualizado si se requiere demo.
- [ ] No hay mocks en pedidos reales de ruta.
- [ ] No hay errores TypeScript.
- [ ] Endpoints nuevos documentados.
- [ ] QA manual ejecutado.
- [ ] Se agregaron pruebas unitarias donde aplique.
- [ ] Se agregaron pruebas de servicios para crédito y precios.
- [ ] Se validó venta anónima.
- [ ] Se validó venta con cliente.
- [ ] Se validó ruta completa.

---

## 14. Definition of Done

Este trabajo se considera terminado cuando:

```txt
1. POS puede vender a cliente con precio especial.
2. POS puede registrar crédito/fiado.
3. Clientes pueden iniciar venta directa.
4. Rutas pueden tener clientes reales asignados.
5. Pedidos de ruta son reales y consultables.
6. Rutas pueden operarse de pedido a liquidación.
7. Owner tiene navegación simplificada por flujo operativo.
8. No quedan mocks en el camino crítico.
9. QA end-to-end pasa.
```

---

## 15. Prompt sugerido para Codex

```md
Trabaja sobre el repositorio Tortilla Plus — V1 Operativa Comercial.

Objetivo:
Reparar el flujo operativo Clientes → POS → Crédito → Precios especiales y Clientes → Rutas → Pedidos → Cobros → Liquidación.

No hagas refactor masivo ni rediseño visual completo. Corrige primero el flujo funcional.

Prioridades:
1. POS con cliente seleccionado.
2. Venta con customerId.
3. Pago credit/fiado.
4. Precios especiales aplicados en POS.
5. Asignación de clientes a rutas.
6. Pedidos reales de ruta, sin mocks.
7. Cobro y liquidación de ruta.
8. Navegación owner simplificada.

Implementa los cambios por fases y mantén compatibilidad con rutas existentes.

Criterio principal:
El sistema debe permitir venderle a una tienda con precio especial, dejar saldo a crédito, asignarla a una ruta, crearle pedido de reparto, entregarlo, cobrarlo y liquidar el efectivo.
```

---

## 16. Riesgos y advertencias

### Riesgo 1 — Arreglar UI sin cerrar backend

No sirve. Si la UI muestra clientes pero no manda `customerId`, el flujo sigue roto.

### Riesgo 2 — Calcular precios especiales solo en frontend

Mala idea. Backend debe ser fuente de verdad.

### Riesgo 3 — Mantener pedidos mock

Inaceptable para esta fase. Si pedidos de ruta siguen en mock, reparto no existe.

### Riesgo 4 — Menú bonito pero igual de fragmentado

No basta cambiar labels. Hay que conectar acciones.

### Riesgo 5 — Convertir POS en módulo administrativo

No saturar POS. El POS debe vender rápido.

---

## 17. Prioridad final

Orden obligatorio:

```txt
1. POS con cliente y crédito
2. Precios especiales reales
3. Rutas con clientes
4. Pedidos reales de ruta
5. Cobros y liquidación
6. UX owner
7. Limpieza técnica
```

No invertir este orden.
