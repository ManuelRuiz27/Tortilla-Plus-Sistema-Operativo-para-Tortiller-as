# Tortilla Plus — Mercado Pago POS Operational Corrections V0.2

Fecha: 2026-06-01  
Producto: Tortilla Plus — V1 Operativa Comercial  
Modulo: Mercado Pago Point integrado al POS  
Estado: documento de correccion operativa para implementar en repo.

---

## 1. Decision tecnica

El modulo Mercado Pago Point ya tiene base funcional:

- OAuth Mercado Pago.
- Conexion cifrada en `payment_provider_connections`.
- Sincronizacion de terminales.
- Binding terminal-POS.
- Ordenes de terminal.
- Checkout bloqueado hasta pago aprobado.

Pero todavia no esta cerrado para operacion real porque el flujo no amarra con suficiente precision:

```txt
Sucursal activa -> POS fisico/caja -> terminal asignada -> orden Mercado Pago -> checkout
```

El problema actual detectado es operativo:

```txt
Manager ve terminal asignada a Caja principal.
POS muestra Tarjeta Mercado Pago: Sin terminal asignada.
```

Esto indica ruptura probable entre:

- `branchId` activo del POS.
- `posDeviceId` asignado en Settings.
- `paymentTerminalId` sincronizado.
- `pos_payment_terminal_bindings.status`.
- cache/query del frontend.

Este documento define los cambios necesarios para cerrar el modulo.

---

## 2. Alcance de esta correccion

Incluye:

1. Identidad explicita del POS/caja en frontend.
2. Binding terminal-POS estricto.
3. Eliminacion de fallback peligroso a ultimo POS activo en cobros reales.
4. Persistencia y exposicion de `operatingMode` de Mercado Pago.
5. Validacion de modo `PDV` antes de cobrar.
6. Sincronizacion coherente entre Settings y POS.
7. Recuperacion de ordenes pendientes tras refresh.
8. Mensajes operativos por codigo de error.
9. Casos de uso de Manager/Owner y Cajero.
10. Pruebas funcionales obligatorias.

No incluye:

- Redisenar OAuth.
- Cambiar proveedor de pagos.
- Integrar Clip.
- Reembolsos automaticos.
- Facturacion.
- Despliegue en hosting.

---

## 3. Estado actual del repo

### 3.1 OAuth y conexion

El repo ya usa:

```txt
MERCADOPAGO_CLIENT_ID
MERCADOPAGO_CLIENT_SECRET
MERCADOPAGO_REDIRECT_URI
MERCADOPAGO_PLATFORM_ID
MERCADOPAGO_INTEGRATOR_ID
PAYMENT_SECRET_ENCRYPTION_KEY
```

La conexion queda guardada en:

```txt
payment_provider_connections
```

con:

```txt
accessTokenCiphertext
refreshTokenCiphertext
tokenExpiresAt
mpUserId
status
```

### 3.2 Sincronizacion de terminales

El repo sincroniza terminales desde Mercado Pago y guarda:

```txt
payment_terminals
```

con:

```txt
terminalId
terminalName
externalStoreId
externalPosId
status
branchId
providerConnectionId
```

### 3.3 Binding actual

El repo permite asignar terminal a POS mediante:

```txt
POST /api/v1/pos-devices/:posDeviceId/terminal-bindings
```

Esto crea registros en:

```txt
pos_payment_terminal_bindings
```

### 3.4 POS actual

El POS obtiene terminales por sucursal:

```txt
GET /api/v1/integrations/mercadopago/terminals?branchId=:branchId
```

Luego toma la primera terminal con `binding.status = active`.

Problema: el POS no tiene identidad explicita de `posDeviceId`; por lo tanto no puede garantizar que la terminal asignada sea la terminal de esa caja fisica.

---

## 4. Problemas detectados

## P0-01 — POS sin identidad de caja

### Problema

El cajero opera desde una pantalla POS ligada a `branchId`, pero no a un `posDeviceId` explicito.

Esto rompe la integracion porque Mercado Pago Point es fisico: una caja debe cobrar en su terminal asignada, no en cualquier terminal activa de la sucursal.

### Riesgo

Con mas de una caja:

```txt
Caja A puede enviar cobro a terminal de Caja B.
Caja B puede aparecer como sin terminal aunque tenga una asignacion en Settings.
El sistema puede resolver el POS equivocado en backend.
```

### Cambio requerido

Crear identidad explicita del POS/caja en frontend:

```txt
activePosDeviceId
```

Debe estar disponible en el modulo POS antes de cobrar.

Opciones aceptables para MVP:

1. Selector de caja al abrir POS.
2. Guardar caja activa en localStorage por equipo.
3. Resolver desde URL/query param para pruebas locales.
4. Resolver desde sesion de dispositivo si ya existe flujo de activacion.

Para V0.2, se acepta selector manual + persistencia local.

---

## P0-02 — Frontend no envia `posDeviceId` al crear orden

### Problema

`createTerminalOrderRequest` desde POS envia:

```txt
branchId
amount
saleDraft
payments
authorizationPin
```

pero no envia:

```txt
posDeviceId
```

### Cambio requerido

Actualizar request de POS:

```ts
createTerminalOrderRequest({
  branchId,
  posDeviceId: activePosDeviceId,
  amount,
  saleDraft,
  payments,
  authorizationPin
})
```

### Criterio

No se puede enviar cobro Mercado Pago si:

```txt
activePosDeviceId == null
```

Mensaje:

```txt
Selecciona la caja/POS antes de cobrar con Mercado Pago.
```

---

## P0-03 — Backend adivina POS si no recibe `posDeviceId`

### Problema

`resolveActiveBinding` permite `posDeviceId` opcional y, si no llega, busca el ultimo POS activo de la sucursal.

Esto no es aceptable para cobros reales.

### Cambio requerido

En `createTerminalOrder`:

- Si `PHYSICAL_INTEGRATIONS_MODE=real`, `posDeviceId` debe ser obligatorio.
- El backend debe rechazar la orden si no llega `posDeviceId`.

Error:

```txt
409 POS_DEVICE_REQUIRED
Cobro Mercado Pago requiere caja/POS identificada.
```

### Regla

No usar fallback a ultimo POS activo para cobros reales.

El fallback solo podria mantenerse para `mock` si se desea, pero no para `real`.

---

## P0-04 — POS detecta cualquier terminal activa de la sucursal

### Problema

El POS usa:

```ts
terminals.find((terminal) => terminal.binding?.status === "active")
```

Eso no valida que el binding corresponda a la caja actual.

### Cambio requerido

Usar:

```ts
const assignedTerminal = terminalsQuery.data?.find(
  (terminal) =>
    terminal.binding?.status === "active" &&
    terminal.binding.posDeviceId === activePosDeviceId
) ?? null;
```

### Criterio

- Terminal asignada a Caja A solo aparece en Caja A.
- Caja B no puede cobrar con terminal de Caja A.

---

## P0-05 — `operating_mode` de Mercado Pago se pierde

### Problema

Mercado Pago devuelve `operating_mode`, pero el repo no lo persiste.

El adapter recibe:

```txt
operating_mode
```

pero `payment_terminals` no tiene columna `operating_mode`.

### Cambio requerido

Agregar a Prisma:

```prisma
model PaymentTerminal {
  operatingMode String? @map("operating_mode") @db.VarChar(40)
}
```

Actualizar migracion SQL.

Actualizar sync:

```ts
operatingMode: terminal.operatingMode
```

Actualizar serializer:

```ts
operatingMode: terminal.operatingMode
```

Actualizar tipos frontend:

```ts
operatingMode?: string | null;
```

### Regla operativa

Si `operatingMode` existe y es distinto de `PDV`, bloquear cobro:

```txt
409 TERMINAL_NOT_PDV
La terminal Mercado Pago no esta en modo PDV.
```

### UI requerida

En Settings > Terminales mostrar:

```txt
Modo: PDV
Modo: No PDV
Modo: desconocido
```

En POS mostrar advertencia si terminal no esta en PDV.

---

## P0-06 — Settings y POS tienen cache/query separadas

### Problema

Settings usa una query key y POS otra distinta para terminales.

Cuando se asigna terminal desde Settings, el POS puede seguir mostrando estado viejo.

### Cambio requerido

Unificar query keys o invalidar ambas:

```ts
queryClient.invalidateQueries({ queryKey: ["mercadopago-terminals"] });
queryClient.invalidateQueries({ queryKey: ["mercadopago-terminals-pos"] });
```

Mejor opcion:

```txt
Usar una sola query key base para terminales Mercado Pago.
```

Criterio:

Despues de asignar terminal, el POS debe ver el cambio sin logout.

---

## P0-07 — Wizard de Settings valida demasiado poco

### Problema

Settings marca como listo:

```txt
Asignar terminal a POS
```

si cualquier terminal tiene binding, no si el POS seleccionado tiene binding activo.

### Cambio requerido

Validar contra el POS seleccionado:

```ts
const selectedPosHasTerminal = terminals.some(
  terminal =>
    terminal.binding?.status === "active" &&
    terminal.binding.posDeviceId === selectedPosDeviceId
);
```

Si no hay `selectedPosDeviceId`, mostrar pendiente.

### Criterio

El wizard no debe decir "Cobrar desde POS listo" si:

```txt
No hay caja seleccionada.
La caja seleccionada no tiene terminal activa.
La terminal no esta en PDV.
```

---

## P1-01 — Orden pendiente no se recupera tras refresh

### Problema

`terminalOrder` vive en estado local React. Si se refresca la pagina durante una orden pendiente, el POS pierde el seguimiento.

### Cambio requerido

Agregar endpoint:

```txt
GET /api/v1/pos/terminal-orders/open?branchId=:branchId&posDeviceId=:posDeviceId
```

Debe regresar la orden pendiente mas reciente con status:

```txt
created
sent_to_terminal
pending
```

No debe regresar status terminales:

```txt
approved
rejected
expired
canceled
failed
refunded
```

### Frontend

Al montar POS:

```txt
si branchId && activePosDeviceId:
  consultar orden abierta
  si existe, reabrir modal de espera
```

### Criterio

Si el cajero refresca la pagina con una orden pendiente, el POS recupera el estado y permite continuar, cancelar o cerrar si ya fue aprobada.

---

## P1-02 — Mensajes de error poco accionables

### Problema

El POS muestra errores genericos.

### Cambio requerido

Mapear codigos de error a mensajes operativos:

```txt
POS_DEVICE_REQUIRED:
Selecciona la caja/POS antes de cobrar con Mercado Pago.

TERMINAL_NOT_ASSIGNED:
Esta caja no tiene terminal Mercado Pago asignada.

TERMINAL_NOT_PDV:
La terminal no esta en modo PDV. Configurala en Mercado Pago Point antes de cobrar.

MERCADOPAGO_NOT_CONNECTED:
Mercado Pago no esta conectado para esta organizacion.

MERCADOPAGO_CONNECTION_INACTIVE:
La conexion de Mercado Pago no esta activa.

TERMINAL_PAYMENT_NOT_APPROVED:
El pago aun no esta aprobado en la terminal.

TERMINAL_ORDER_ALREADY_CHECKED_OUT:
Esta orden ya fue usada en una venta.

TERMINAL_PAYMENT_AMOUNT_MISMATCH:
El monto aprobado en terminal no coincide con la venta.

MERCADOPAGO_POINT_CREATE_FAILED:
Mercado Pago rechazo la orden. Revisa terminal, modo PDV y cuenta vinculada.
```

---

## P1-03 — Autoconfirmacion de venta dificulta QA

### Problema

Cuando polling detecta `approved`, el POS confirma venta automaticamente.

Esto puede estar bien en operacion rapida, pero reduce visibilidad durante pruebas.

### Cambio requerido

Agregar bandera de configuracion:

```txt
VITE_POS_AUTO_CONFIRM_TERMINAL_PAYMENT=true|false
```

Para QA local:

```txt
false
```

Para operacion futura:

```txt
true
```

### Criterio

Si auto-confirm esta apagado:

```txt
approved -> mostrar boton Confirmar venta
```

Si auto-confirm esta encendido:

```txt
approved -> ejecutar confirm-and-checkout
```

---

# 5. Casos de uso por usuario

## 5.1 Manager / Owner

### UC-MP-01 — Conectar Mercado Pago

Actor: Manager/Owner  
Permiso: `integrations.manage`

Flujo:

1. Entra a Settings > Integraciones o Terminales.
2. Presiona Conectar Mercado Pago.
3. Sistema genera OAuth start.
4. Usuario autoriza cuenta Mercado Pago.
5. Callback guarda tokens cifrados.
6. Sistema muestra conexion `active`.

Criterios:

- No se muestran tokens al frontend.
- `payment_provider_connections.status = active`.
- `mpUserId` visible en UI tecnica o debug.

---

### UC-MP-02 — Sincronizar terminales

Actor: Manager/Owner  
Permiso: `integrations.manage`

Flujo:

1. Usuario selecciona sucursal activa.
2. Presiona Sincronizar terminales.
3. Backend usa conexion activa.
4. Backend consulta terminales Mercado Pago.
5. Backend guarda o actualiza `payment_terminals`.
6. UI muestra terminales.

Criterios:

- Cada terminal muestra:
  - `terminalId`.
  - nombre.
  - sucursal.
  - status.
  - modo PDV/no PDV/desconocido.
  - binding activo si existe.

---

### UC-MP-03 — Asignar terminal a caja/POS

Actor: Manager/Owner  
Permiso: `integrations.manage`

Flujo:

1. Usuario selecciona sucursal.
2. Usuario selecciona caja/POS.
3. Usuario selecciona terminal.
4. Sistema desactiva bindings previos de esa caja y de esa terminal.
5. Sistema crea nuevo binding activo.
6. UI confirma:

```txt
Terminal NEWLAND... asignada a Caja principal en Sucursal X.
```

Criterios:

- Una terminal no puede quedar activa en dos cajas.
- Una caja no puede tener dos terminales activas del mismo proveedor.
- El wizard valida el binding del POS seleccionado.

---

### UC-MP-04 — Diagnosticar terminal

Actor: Manager/Owner  
Permiso: `integrations.view`

Flujo:

1. Usuario ve terminal sincronizada.
2. Sistema muestra estado:

```txt
Asignada / Sin asignar
PDV / No PDV / Desconocido
Sucursal
Caja vinculada
Ultima sincronizacion
```

Criterios:

- Si no esta PDV, UI advierte antes de intentar cobro.
- Si no tiene binding, UI lo indica.

---

## 5.2 Cajero

### UC-POS-MP-01 — Seleccionar caja activa

Actor: Cajero  
Permiso: acceso POS

Flujo:

1. Cajero abre POS.
2. Sistema valida `branchId` activo.
3. Sistema solicita o recupera `activePosDeviceId`.
4. Sistema muestra caja activa.

Criterios:

- Sin caja activa, no se permite cobrar Mercado Pago.
- Caja activa se persiste localmente por equipo.

---

### UC-POS-MP-02 — Cobrar con terminal asignada

Actor: Cajero  
Permiso: `payments.create`

Flujo:

1. Cajero arma carrito.
2. Abre cobro.
3. Selecciona Tarjeta Mercado Pago.
4. Sistema valida:

```txt
branchId activo
activePosDeviceId activo
terminal asignada a ese POS
terminal en PDV si dato disponible
```

5. Cajero presiona Enviar cobro a terminal.
6. Backend crea `payment_terminal_orders`.
7. Mercado Pago recibe orden Point.
8. Terminal muestra cobro.
9. POS hace polling.
10. Si aprobado, confirma venta.

Criterios:

- La orden se crea solo con POS identificado.
- El pago no cierra si no esta aprobado.
- La venta queda ligada a `payment_terminal_orders.saleId` y `salePaymentId`.

---

### UC-POS-MP-03 — Pago rechazado/expirado/cancelado

Actor: Cajero

Flujo:

1. Orden queda en `rejected`, `expired` o `canceled`.
2. POS no cierra venta.
3. POS permite:

```txt
Reintentar
Cambiar metodo de pago
Cancelar venta
```

Criterios:

- No hay `Sale.completed`.
- No se crea `SalePayment.completed` para tarjeta Mercado Pago.

---

### UC-POS-MP-04 — Recuperar orden pendiente

Actor: Cajero

Flujo:

1. Cajero crea orden.
2. Se refresca pagina o se cierra navegador.
3. Cajero vuelve al POS.
4. Sistema consulta orden abierta por `branchId + posDeviceId`.
5. Sistema reabre modal de espera.

Criterios:

- No se pierde seguimiento.
- Si ya fue aprobada, permite confirmar venta.
- Si expiro, marca expirada y permite reintentar.

---

# 6. Cambios tecnicos requeridos

## Backend

### Prisma

Agregar campo:

```prisma
model PaymentTerminal {
  operatingMode String? @map("operating_mode") @db.VarChar(40)
}
```

Crear migracion.

### payment-terminal-service.ts

Actualizar `syncMercadoPagoTerminals`:

```ts
operatingMode: terminal.operatingMode
```

Actualizar `serializeTerminal`:

```ts
operatingMode: terminal.operatingMode
```

### payment-terminal-order-service.ts

En `createTerminalOrder`:

1. `posDeviceId` obligatorio en modo real.
2. Validar terminal asignada al `posDeviceId` exacto.
3. Validar `operatingMode === "PDV"` si el campo existe.
4. Error si no PDV.

Agregar endpoint:

```txt
GET /api/v1/pos/terminal-orders/open?branchId=:branchId&posDeviceId=:posDeviceId
```

### server.ts

Agregar ruta para orden abierta.

### Errores

Agregar codigos:

```txt
POS_DEVICE_REQUIRED
TERMINAL_NOT_PDV
OPEN_TERMINAL_ORDER_NOT_FOUND
```

---

## Frontend

### Store POS Device

Crear:

```txt
apps/web/src/shared/stores/pos-device.store.ts
```

Debe persistir:

```ts
activePosDeviceId: string | null
activePosDeviceName: string | null
setActivePosDevice(...)
clearActivePosDevice()
```

### SettingsPage

1. Al asignar terminal, invalidar queries compartidas.
2. Wizard debe validar el POS seleccionado.
3. Mostrar `operatingMode`.
4. Advertir si no PDV.

### SalePage

1. Cargar `activePosDeviceId`.
2. Si no existe, mostrar selector de caja.
3. Filtrar terminal asignada por `binding.posDeviceId === activePosDeviceId`.
4. Enviar `posDeviceId` al crear orden.
5. Recuperar orden pendiente al montar.
6. Mostrar errores por codigo.

### PaymentModal

1. Si no hay POS activo:

```txt
Selecciona caja/POS antes de cobrar.
```

2. Si hay POS pero no terminal:

```txt
Esta caja no tiene terminal Mercado Pago asignada.
```

3. Si terminal no PDV:

```txt
Terminal no esta en modo PDV.
```

---

# 7. Pruebas obligatorias

## Unitarias backend

1. `createTerminalOrder` rechaza modo real sin `posDeviceId`.
2. `createTerminalOrder` rechaza POS sin binding.
3. `createTerminalOrder` rechaza terminal no PDV.
4. `createTerminalOrder` acepta terminal PDV asignada al POS correcto.
5. Orden aprobada no puede reutilizarse.
6. Monto distinto bloquea checkout.

## Integracion backend

1. Sync guarda `operatingMode`.
2. Binding de terminal a POS A no habilita POS B.
3. Endpoint open order devuelve orden pendiente.
4. Endpoint open order no devuelve orden terminal.
5. Confirm checkout solo si status `approved`.

## E2E frontend

1. Manager conecta Mercado Pago.
2. Manager sincroniza terminales.
3. Manager ve modo PDV/no PDV.
4. Manager asigna terminal a Caja principal.
5. POS Caja principal ve terminal.
6. Otro POS no ve esa terminal.
7. POS sin caja activa bloquea cobro.
8. POS con terminal no PDV bloquea cobro.
9. Refresh con orden pendiente recupera modal.
10. Pago aprobado cierra venta.

---

# 8. Criterios de aceptacion

El modulo queda corregido cuando:

1. El POS siempre opera con `activePosDeviceId`.
2. El backend no adivina POS en cobros reales.
3. El POS solo muestra terminal asignada a su caja.
4. Settings muestra terminal, sucursal, caja, status y modo.
5. Se bloquea cobro si terminal no esta en PDV.
6. Se recuperan ordenes pendientes tras refresh.
7. El wizard valida el POS seleccionado, no cualquier binding.
8. Settings y POS no quedan con cache divergente.
9. Errores son accionables por cajero/manager.
10. Pruebas unitarias, integracion y E2E pasan.

---

# 9. Prompt para Codex

```txt
Implementa Mercado Pago POS Operational Corrections V0.2 en Tortilla Plus.

Contexto:
El modulo Mercado Pago Point ya tiene OAuth, conexiones cifradas, terminal sync, terminal binding, terminal orders y checkout aprobado. El problema actual es operativo: Manager ve terminal asignada a Caja principal, pero POS muestra "Sin terminal asignada". El flujo no amarra correctamente branchId, posDeviceId, terminal asignada y orden.

Objetivo:
Cerrar el flujo operativo real para Manager/Owner y Cajero.

Cambios requeridos:
1. Crear identidad explicita de POS/caja en frontend con store persistente activePosDeviceId.
2. En POS, exigir caja activa antes de cobrar con Mercado Pago.
3. En SalePage, filtrar assignedTerminal por binding.status active y binding.posDeviceId === activePosDeviceId.
4. En createTerminalOrderRequest enviar posDeviceId.
5. En backend createTerminalOrder exigir posDeviceId si PHYSICAL_INTEGRATIONS_MODE=real.
6. Eliminar fallback a ultimo POS activo para cobros reales.
7. Agregar operatingMode a PaymentTerminal en Prisma, migracion, sync, serializer y tipos frontend.
8. Guardar operatingMode desde Mercado Pago terminals list.
9. Bloquear cobro si operatingMode existe y no es PDV.
10. Ajustar Settings wizard para validar binding activo del POS seleccionado.
11. Unificar o invalidar queries de terminales entre Settings y POS.
12. Agregar endpoint GET /api/v1/pos/terminal-orders/open?branchId=&posDeviceId=.
13. En POS, recuperar orden pendiente al montar.
14. Mapear errores operativos a mensajes accionables.
15. Agregar pruebas unitarias, integracion y E2E descritas en el documento.

Restricciones:
- No cambiar OAuth existente.
- No usar MERCADOPAGO_ACCESS_TOKEN ni MERCADOPAGO_TERMINAL_ID globales.
- No romper checkout efectivo, transferencia, tarjeta manual ni fiado.
- Mantener checkout Mercado Pago bloqueado hasta PaymentTerminalOrder approved.
- No agregar reembolsos automaticos.

Criterio de cierre:
Manager asigna terminal NEWLAND... a Caja principal y el POS de Caja principal la muestra como lista. Otro POS no puede usarla. Si la terminal no esta en PDV, el POS bloquea cobro con mensaje claro. Si hay orden pendiente y se refresca la pagina, el POS la recupera.
```
