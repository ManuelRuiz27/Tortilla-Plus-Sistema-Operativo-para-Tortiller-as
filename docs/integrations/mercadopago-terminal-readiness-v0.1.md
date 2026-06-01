# Tortilla Plus — Módulo Mercado Pago Terminal Readiness V0.1

Fecha: 2026-06-01  
Producto: Tortilla Plus — V1 Operativa Comercial  
Módulo: Integración de terminales Mercado Pago Point por cliente/sucursal/POS  
Estado: Especificación lista para implementación. No liberar a producción hasta cumplir criterios de cierre.

---

## 1. Decisión ejecutiva

El sistema no debe integrar Mercado Pago Point en producción mientras las credenciales sigan resueltas por variables globales de entorno.

La integración debe construirse como módulo SaaS multi-tenant:

```txt
Organization -> PaymentProviderConnection -> Branch -> PosDevice -> PaymentTerminalBinding -> PaymentTerminalOrder
```

La venta POS con tarjeta solo debe completarse cuando Mercado Pago confirme el pago como aprobado/procesado. Capturar folio manual debe quedar como fallback operativo separado y auditado, no como flujo principal de terminal integrada.

---

## 2. Estado actual detectado

### 2.1 Base existente aprovechable

El backend ya tiene ruta operacional para crear pagos con terminal:

```txt
POST /api/v1/integrations/terminals/mercadopago/payments
GET  /api/v1/integrations/terminals/mercadopago/payments/:reference
```

El POS ya puede cerrar ventas por `POST /api/v1/sales/checkout` con `Idempotency-Key`, lo cual reduce riesgo frente al flujo legado de crear venta, agregar items y completar venta por separado.

El backend ya exige referencia para pagos con tarjeta y transferencia.

Existe estructura inicial para:

```txt
PaymentProvider
PaymentTerminalReference
ReconciliationBatch
ReconciliationItem
PosDevice
SalePayment
```

### 2.2 Bloqueos actuales

1. `MERCADOPAGO_ACCESS_TOKEN` y `MERCADOPAGO_TERMINAL_ID` viven en `.env` global. Eso no sirve para SaaS con clientes distintos.
2. `PaymentProvider` no modela credenciales por cliente, OAuth, expiración, refresh token, `mp_user_id`, scopes ni estado de conexión.
3. `PosDevice` no está vinculado a una terminal física de Mercado Pago.
4. El endpoint de status real está pendiente; en modo real responde con error operativo.
5. El frontend POS todavía captura folio manual de terminal y usa `provider: "terminal-demo"`.
6. La venta puede completarse con referencia manual sin comprobación real del proveedor.
7. No existe tabla de órdenes de terminal con estados `created`, `sent_to_terminal`, `approved`, `rejected`, `expired`, `canceled`, `failed`.
8. No existe circuito robusto de conciliación contra pagos reales de Mercado Pago.

---

## 3. Fuentes oficiales y restricciones Mercado Pago

La integración real de Mercado Pago Point debe crear órdenes `point` en:

```txt
POST https://api.mercadopago.com/v1/orders
```

con:

```txt
Authorization: Bearer ACCESS_TOKEN
X-Idempotency-Key: UUID
Body.type = point
Body.external_reference = referencia única sin PII
Body.transactions.payments[].amount = monto con dos decimales
Body.config.point.terminal_id = terminal_id exacto retornado por Mercado Pago
```

Notas obligatorias:

1. Para integraciones de terceros, usar OAuth y token del vendedor/cliente, no credenciales globales de Tortilla Plus.
2. `external_reference` no debe contener PII y debe ser único por orden.
3. El `terminal_id` debe guardarse por POS/sucursal y enviarse exactamente como lo retorna Mercado Pago.
4. Usar `X-Idempotency-Key` en creación, cancelación y reembolso de orden.
5. La orden tiene expiración; si expira, debe generarse una nueva orden y la venta no debe cerrarse.
6. Access Token OAuth requiere almacenamiento seguro y renovación; si se refresca el token, también debe persistirse el nuevo refresh token.

Referencias oficiales revisadas:

- Mercado Pago Point — Payment processing: `https://www.mercadopago.com.mx/developers/en/docs/mp-point/payment-processing`
- Mercado Pago OAuth: `https://www.mercadopago.com.mx/developers/en/docs/security/oauth`
- Mercado Pago OAuth — Get Access Token: `https://www.mercadopago.com.mx/developers/en/docs/security/oauth/creation`
- Mercado Pago OAuth — Renew Access Token: `https://www.mercadopago.com.mx/developers/en/docs/security/oauth/renewal`

---

## 4. Objetivo del módulo

Permitir que cada cliente de Tortilla Plus conecte su propia cuenta de Mercado Pago, asigne terminales a sus POS/sucursales y cobre ventas presenciales desde el POS sin cerrar ventas hasta tener confirmación real del proveedor.

---

## 5. Fuera de alcance

No incluir en esta fase:

1. Clip real.
2. BBVA.
3. MSI/configuración avanzada de cuotas.
4. Marketplace/split payments.
5. Facturación automática basada en metadata fiscal de Mercado Pago.
6. Reembolsos automáticos sin autorización administrativa.
7. Operación offline de terminal integrada.

---

## 6. Modelo de datos requerido

### 6.1 `payment_provider_connections`

Una conexión representa la cuenta Mercado Pago de un cliente.

Campos mínimos:

```txt
id
organization_id
provider = mercadopago
connection_name
status = pending|active|expired|revoked|error
mp_user_id
access_token_ciphertext
refresh_token_ciphertext
token_expires_at
scopes
connected_by_user_id
connected_at
last_health_check_at
last_error_code
last_error_message
created_at
updated_at
```

Reglas:

- Nunca guardar access tokens en texto plano.
- Nunca regresar tokens al frontend.
- Permitir una o varias conexiones por organización.
- `status=active` requiere token válido o renovable.

### 6.2 `payment_terminals`

Representa una terminal Mercado Pago descubierta o registrada manualmente.

Campos mínimos:

```txt
id
organization_id
branch_id
provider_connection_id
provider = mercadopago
terminal_id
terminal_name
external_store_id
external_pos_id
status = active|inactive|unassigned|error
last_seen_at
created_at
updated_at
```

Reglas:

- `terminal_id` debe ser único por conexión.
- Una terminal puede existir sin branch asignada, pero no puede operar sin binding activo a POS.

### 6.3 `pos_payment_terminal_bindings`

Vincula una terminal con un POS de Tortilla Plus.

Campos mínimos:

```txt
id
organization_id
branch_id
pos_device_id
payment_terminal_id
provider = mercadopago
status = active|inactive
created_by_user_id
created_at
updated_at
```

Reglas:

- Un POS solo puede tener una terminal Mercado Pago activa.
- Cambiar terminal debe desactivar binding anterior y auditar el cambio.

### 6.4 `payment_terminal_orders`

Registro canónico de cada intento de cobro en terminal.

Campos mínimos:

```txt
id
organization_id
branch_id
pos_device_id
sale_id
sale_payment_id
payment_terminal_id
provider_connection_id
provider = mercadopago
external_order_id
external_payment_id
external_reference
idempotency_key
amount
currency = MXN
status
status_detail
expires_at
approved_at
rejected_at
canceled_at
raw_create_response
raw_last_status_response
created_by_user_id
created_at
updated_at
```

Estados internos permitidos:

```txt
created
sent_to_terminal
pending
approved
rejected
expired
canceled
failed
refunded
```

Reglas:

- `external_reference` único por organización/proveedor.
- `idempotency_key` único por organización/proveedor.
- Una orden aprobada solo puede cerrar una venta.
- Una venta no puede cerrarse con orden expirada, cancelada o rechazada.

### 6.5 `payment_terminal_events`

Bitácora de eventos/polling/webhooks del proveedor.

Campos mínimos:

```txt
id
organization_id
branch_id
terminal_order_id
provider
external_event_id
event_type
event_status
payload
received_at
```

Reglas:

- Eventos idempotentes por `external_event_id` cuando exista.
- Si el proveedor no envía ID estable, usar hash de payload + tipo + orden.

---

## 7. Backend requerido

Crear o ajustar servicios:

```txt
apps/api/src/services/payment-provider-connection-service.ts
apps/api/src/services/mercadopago-oauth-service.ts
apps/api/src/services/mercadopago-point-adapter.ts
apps/api/src/services/payment-terminal-service.ts
apps/api/src/services/payment-terminal-order-service.ts
```

### 7.1 `mercadopago-oauth-service.ts`

Responsabilidades:

- Generar URL de autorización con `state` único.
- Recibir callback OAuth.
- Intercambiar `code` por credenciales de acceso.
- Cifrar secretos antes de guardar.
- Renovar credenciales antes de expiración.
- Invalidar conexión si refresh falla.
- Auditar conexión, renovación, error y revocación.

### 7.2 `mercadopago-point-adapter.ts`

Métodos mínimos:

```ts
createPointOrder(input): Promise<MercadoPagoPointOrderResult>
getOrder(orderId): Promise<MercadoPagoPointOrderStatus>
cancelOrder(orderId, idempotencyKey): Promise<MercadoPagoPointOrderStatus>
refundOrder(orderId, idempotencyKey): Promise<MercadoPagoPointOrderStatus>
listTerminals(connectionId): Promise<MercadoPagoTerminal[]>
```

No debe conocer reglas POS. Solo traduce Tortilla Plus <-> Mercado Pago.

### 7.3 `payment-terminal-order-service.ts`

Responsabilidades:

- Crear orden local.
- Crear orden remota Mercado Pago.
- Consultar status.
- Resolver transición de estado.
- Completar venta POS solo cuando `approved`.
- Cancelar orden si el cajero cancela antes de aprobar.
- Expirar orden local si Mercado Pago reporta expiración o si se excede TTL interno.

---

## 8. Endpoints requeridos

### 8.1 Conexiones Mercado Pago

```txt
GET  /api/v1/integrations/mercadopago/connection
POST /api/v1/integrations/mercadopago/oauth/start
GET  /api/v1/integrations/mercadopago/oauth/callback
POST /api/v1/integrations/mercadopago/disconnect
POST /api/v1/integrations/mercadopago/health-check
```

Permisos:

```txt
integrations.manage
integrations.view
```

### 8.2 Terminales

```txt
GET  /api/v1/integrations/mercadopago/terminals?branchId=:branchId
POST /api/v1/integrations/mercadopago/terminals/sync
POST /api/v1/pos-devices/:posDeviceId/terminal-bindings
DELETE /api/v1/pos-devices/:posDeviceId/terminal-bindings/:bindingId
```

### 8.3 Cobros desde POS

```txt
POST /api/v1/pos/terminal-orders
GET  /api/v1/pos/terminal-orders/:id
POST /api/v1/pos/terminal-orders/:id/cancel
POST /api/v1/pos/terminal-orders/:id/confirm-and-checkout
```

Payload de creación:

```json
{
  "branchId": "uuid",
  "posDeviceId": "uuid",
  "amount": "24.00",
  "saleDraft": {
    "customerId": "uuid|null",
    "items": [
      {
        "productId": "uuid",
        "saleMode": "by_kg|by_amount|by_package|unit",
        "quantity": "1.000"
      }
    ]
  }
}
```

Respuesta:

```json
{
  "data": {
    "id": "uuid-local-order",
    "provider": "mercadopago",
    "externalOrderId": "ORD...",
    "externalReference": "TP_...",
    "status": "created",
    "amount": "24.00",
    "terminalId": "NEWLAND_N950__...",
    "expiresAt": "2026-06-01T20:00:00.000Z"
  }
}
```

Confirmación:

```txt
POST /api/v1/pos/terminal-orders/:id/confirm-and-checkout
```

Regla: si el estado no es `approved`, responder `409 TERMINAL_PAYMENT_NOT_APPROVED` y no crear venta completada.

---

## 9. Flujo POS requerido

### 9.1 Tarjeta con terminal integrada

```txt
1. Cajero arma carrito.
2. Cajero selecciona "Tarjeta Mercado Pago".
3. POS valida que hay caja abierta, sucursal activa y terminal asignada.
4. Backend crea PaymentTerminalOrder local.
5. Backend crea orden Mercado Pago type=point.
6. POS muestra pantalla "Esperando pago en terminal".
7. POS consulta status cada 2-3 segundos o recibe evento.
8. Si Mercado Pago aprueba:
   8.1 Backend marca orden approved.
   8.2 Backend ejecuta checkout atómico.
   8.3 SalePayment queda con provider=mercadopago, reference=externalPaymentId/orderId.
   8.4 PaymentTerminalReference queda ligado a SalePayment.
9. Si Mercado Pago rechaza/expira/cancela:
   9.1 No se completa venta.
   9.2 POS permite reintentar, cambiar método de pago o cancelar.
```

### 9.2 Venta mixta

Reglas:

- Efectivo + Mercado Pago + fiado se permite solo si la suma total coincide.
- La parte Mercado Pago debe estar aprobada antes de completar venta.
- Si la tarjeta falla, no se deben registrar los demás pagos como venta completada.
- El checkout final debe ser una sola transacción backend.

### 9.3 Fallback manual

Debe quedar separado:

```txt
Método: Tarjeta manual
Permiso: payments.manual_card_reference
Requiere folio obligatorio
Auditoría: manual_card_reference_used
No debe usar adapter Mercado Pago
No debe mostrarse como "Mercado Pago integrado"
```

---

## 10. Seguridad

1. Secretos cifrados en base de datos con llave gestionada por entorno seguro.
2. Nunca loggear credenciales ni payloads con secretos.
3. OAuth `state` debe ser único, expirable y ligado a organización/usuario.
4. `external_reference` no debe contener nombre, teléfono, email, RFC ni datos personales.
5. RBAC mínimo:
   - `integrations.manage`: conectar/desconectar cuenta, asignar terminales.
   - `integrations.view`: ver estado de conexión/terminales.
   - `payments.create`: cobrar en terminal.
   - `payments.cancel_terminal_order`: cancelar orden pendiente.
   - `payments.manual_card_reference`: usar fallback manual.
6. Auditar:
   - conexión OAuth iniciada
   - conexión OAuth completada
   - credencial renovada
   - terminal sincronizada
   - terminal asignada a POS
   - orden creada
   - orden aprobada/rechazada/expirada/cancelada
   - checkout completado por terminal
   - fallback manual usado
7. Idempotencia obligatoria en crear orden, cancelar, reembolsar y checkout.
8. Webhooks/eventos deben ser idempotentes por `externalEventId` o hash de payload cuando el proveedor no envíe ID estable.

---

## 11. UI/UX requerida

### 11.1 Manager / Owner

Pantallas:

```txt
Configuración > Integraciones > Mercado Pago
Configuración > POS > Terminales
Sucursal > POS Devices > Asignar terminal
```

Estados visibles:

```txt
No conectado
Conectado
Credencial por vencer
Credencial expirada
Terminal sin asignar
Terminal asignada
Terminal inactiva/error
```

Acciones:

```txt
Conectar cuenta Mercado Pago
Desconectar cuenta
Sincronizar terminales
Asignar terminal a POS
Cambiar terminal asignada
Probar conexión
```

### 11.2 POS Cajero

Cambiar modal de pago:

```txt
Efectivo
Tarjeta Mercado Pago
Tarjeta manual
Transferencia
Fiado
Mixto
```

Para Tarjeta Mercado Pago:

- No pedir folio manual.
- Mostrar terminal asignada.
- Botón: "Enviar cobro a terminal".
- Estado: "Esperando pago".
- Acciones: reintentar, cancelar orden, cambiar método.
- Al aprobar, cerrar venta automáticamente.

---

## 12. Cambios sobre código actual

### 12.1 `env.ts`

Mantener solo variables de aplicación/plataforma:

```txt
MERCADOPAGO_CLIENT_ID
MERCADOPAGO_CLIENT_SECRET
MERCADOPAGO_REDIRECT_URI
MERCADOPAGO_PLATFORM_ID
MERCADOPAGO_INTEGRATOR_ID
PAYMENT_SECRET_ENCRYPTION_KEY
```

Eliminar dependencia operacional de:

```txt
MERCADOPAGO_ACCESS_TOKEN
MERCADOPAGO_TERMINAL_ID
```

Estas dos variables pueden conservarse solo para modo dev local, nunca como fuente de producción multi-cliente.

### 12.2 `physical-integration-service.ts`

No debe resolver credenciales/terminal desde `env`. Debe delegar a:

```txt
payment-terminal-order-service.ts
mercadopago-point-adapter.ts
```

### 12.3 `payment-modal.tsx`

Separar:

```txt
card_integrated_mercadopago
card_manual_reference
```

`card_integrated_mercadopago` no acepta folio manual.

### 12.4 `sale-service.ts`

Mantener `checkoutSale` como cierre atómico, pero agregar modo donde el `SalePayment` de tarjeta integrada solo se acepte si existe `PaymentTerminalOrder.approved` por el monto exacto y misma organización/sucursal.

---

## 13. Reglas de negocio

1. Una venta no se cierra por tarjeta integrada si la orden no está aprobada.
2. No se puede reutilizar una orden Mercado Pago para dos ventas.
3. No se puede aprobar una orden con monto distinto al total/trozo de pago tarjeta.
4. Si la caja se cierra, no debe haber órdenes terminal pendientes ligadas a esa caja.
5. Si una orden expira, se bloquea el checkout con esa referencia.
6. Si el cajero cancela la venta mientras la orden está pendiente, se debe intentar cancelar la orden remota.
7. Si la orden fue aprobada pero el checkout falla, debe quedar como incidencia crítica de conciliación: `approved_without_sale`.
8. Si la venta se cancela después de pago aprobado, no hacer refund automático en MVP; registrar pendiente administrativo.
9. El POS debe impedir doble clic creando orden duplicada mediante idempotencia cliente + servidor.
10. En piloto, el fallback manual debe seguir disponible, pero con permiso separado y auditoría.

---

## 14. QA requerido

### 14.1 Pruebas unitarias backend

- OAuth state único y expiración.
- Credenciales se cifran y no se devuelven al frontend.
- Refresh actualiza credenciales persistidas.
- `external_reference` no acepta PII ni longitud mayor a 64.
- Monto siempre con 2 decimales.
- Orden no aprobada no permite checkout.
- Orden aprobada permite checkout una sola vez.
- Idempotencia evita órdenes duplicadas.

### 14.2 Pruebas de integración backend

Escenarios:

```txt
crear orden mock -> approved -> checkout completed
crear orden mock -> rejected -> checkout bloqueado
crear orden mock -> expired -> checkout bloqueado
crear orden -> cancelar pendiente -> status canceled
orden approved sin sale -> incidencia conciliacion
venta mixta efectivo + MP approved -> completed
venta mixta efectivo + MP rejected -> no completed
usuario sin branch access -> 403
usuario sin payments.create -> 403
terminal no asignada -> 409
conexion expirada -> 409/503 operativo
```

### 14.3 Pruebas E2E frontend

- Manager conecta cuenta en modo mock OAuth.
- Manager sincroniza terminales.
- Manager asigna terminal a POS.
- Cajero cobra con tarjeta integrada.
- Cajero cancela orden pendiente.
- Cajero reintenta tras rechazo.
- Cajero usa fallback manual con permiso.
- Cajero sin permiso no ve fallback manual.
- Doble click en "Enviar cobro" no duplica orden.
- Recarga de pantalla conserva orden pendiente consultable.

### 14.4 Pruebas manuales de piloto real

Antes de liberar a clientes:

```txt
1. Cuenta Mercado Pago sandbox/test conectada.
2. Terminal real asociada a cuenta autorizada.
3. Cobro aprobado.
4. Cobro rechazado.
5. Orden expirada.
6. Cancelación desde POS.
7. Desconexión de internet durante espera.
8. Reinicio de POS con orden pendiente.
9. Cierre de caja con orden pendiente.
10. Conciliación contra panel Mercado Pago.
```

---

## 15. Criterios de cierre

El módulo se considera cubierto cuando:

1. No hay dependencia productiva de `MERCADOPAGO_ACCESS_TOKEN` ni `MERCADOPAGO_TERMINAL_ID` globales.
2. Cada organización puede conectar su cuenta Mercado Pago.
3. Las credenciales se almacenan cifradas.
4. Se pueden sincronizar/registrar terminales por conexión.
5. Se puede asignar una terminal a un POS.
6. El POS puede crear orden de cobro en terminal.
7. El POS no completa venta hasta `approved`.
8. Estados `rejected`, `expired`, `canceled`, `failed` bloquean checkout.
9. Venta mixta con Mercado Pago funciona sin estados intermedios corruptos.
10. El fallback manual existe con permiso y auditoría separados.
11. La conciliación puede detectar:
    - venta POS sin pago proveedor
    - pago proveedor sin venta POS
    - monto distinto
    - pago duplicado
12. Tests unitarios, integración y E2E pasan.
13. Documentación OpenAPI queda actualizada.
14. Auditoría registra eventos críticos.
15. Piloto real aprobado en una sucursal controlada.

---

## 16. Roadmap de implementación

### Sprint MP-01 — Data model y seguridad

- Crear migraciones Prisma/SQL.
- Crear servicio de cifrado de secretos.
- Agregar permisos RBAC.
- Agregar auditoría base.

### Sprint MP-02 — OAuth y conexiones

- Implementar OAuth start/callback.
- Guardar credenciales cifradas.
- Implementar refresh.
- Health-check de conexión.

### Sprint MP-03 — Terminales y bindings

- Sincronizar/listar terminales.
- Crear asignación terminal-POS.
- Validar una terminal activa por POS.

### Sprint MP-04 — Órdenes Point

- Implementar adapter Mercado Pago Point.
- Crear orden con `type=point`.
- Consultar status.
- Cancelar orden.
- Registrar eventos.

### Sprint MP-05 — POS integrado

- Cambiar modal de pago.
- Agregar pantalla de espera.
- Confirmar checkout solo tras approval.
- Soportar venta mixta.

### Sprint MP-06 — Conciliación y piloto

- Reporte de incidencias.
- Tests E2E.
- Prueba con terminal real.
- Checklist de liberación.

---

## 17. Prompt sugerido para Codex

```txt
Trabaja en el repositorio Tortilla Plus. Implementa el módulo Mercado Pago Terminal Readiness siguiendo docs/integrations/mercadopago-terminal-readiness-v0.1.md.

Restricciones:
- No uses MERCADOPAGO_ACCESS_TOKEN ni MERCADOPAGO_TERMINAL_ID como fuente productiva multi-cliente.
- Implementa modelo multi-tenant por organizationId.
- Las credenciales del proveedor deben guardarse cifradas y nunca retornarse al frontend.
- El POS no debe completar ventas con tarjeta integrada hasta que PaymentTerminalOrder esté approved.
- Mantén fallback manual separado con permiso payments.manual_card_reference y auditoría.
- No rompas el flujo actual de checkout efectivo/transferencia/fiado.
- Agrega pruebas unitarias, integración y E2E según la sección QA.
- Actualiza OpenAPI y documentación.

Entrega en PR incremental por sprint MP-01 a MP-06.
```
