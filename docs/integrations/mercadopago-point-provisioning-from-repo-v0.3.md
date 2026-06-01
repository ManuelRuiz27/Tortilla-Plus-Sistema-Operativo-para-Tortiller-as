# Tortilla Plus — Mercado Pago Point Provisioning desde el repo V0.3

Fecha: 2026-06-01  
Producto: Tortilla Plus — V1 Operativa Comercial  
Modulo: Mercado Pago Point integrado al POS  
Estado: correccion de alcance; la configuracion final de terminal debe hacerse desde Tortilla Plus.

---

## 1. Decision corregida

El usuario final no debe configurar manualmente la terminal fuera del sistema, salvo el alta fisica inicial inevitable que exige Mercado Pago para asociar la terminal a la cuenta.

Tortilla Plus debe cubrir desde el panel Manager/Owner:

```txt
1. Conectar Mercado Pago por OAuth.
2. Crear o vincular Store de Mercado Pago.
3. Crear o vincular POS externo de Mercado Pago.
4. Sincronizar terminales vinculadas a la cuenta.
5. Asociar terminal con sucursal y caja de Tortilla Plus.
6. Activar modo PDV desde backend.
7. Verificar operating_mode=PDV.
8. Bloquear cobro si no esta en PDV.
9. Permitir reintento desde UI.
```

La pantalla fisica de la terminal no debe ser parte del flujo operativo normal del usuario.

---

## 2. Correccion de alcance

El documento anterior `mercadopago-pos-operational-corrections-v0.2.md` cubre POS identity, binding, operatingMode y ordenes pendientes.

Este documento agrega la pieza faltante:

```txt
Provisioning Mercado Pago Point desde el repo
```

Sin esto, el modulo sigue incompleto porque el Manager puede ver una terminal sincronizada, pero no puede llevarla al estado operacional requerido (`PDV`) desde Tortilla Plus.

---

## 3. Base oficial Mercado Pago usada para el diseño

Mercado Pago define que para operar una terminal Point integrada via API primero se debe configurar terminal en modo integrado. El flujo oficial indica:

```txt
1. Crear store.
2. Crear point of sale.
3. Asociar terminal al store/POS.
4. Activar operating_mode=PDV.
```

Mercado Pago tambien indica:

```txt
PDV = modo integrado via API.
STANDALONE = modo default/manual de la terminal.
UNDEFINED = modo no reconocido.
```

La activacion PDV se realiza con:

```txt
PATCH https://api.mercadopago.com/terminals/v1/setup
```

Body:

```json
{
  "terminals": [
    {
      "id": "NEWLAND_N950__SERIAL",
      "operating_mode": "PDV"
    }
  ]
}
```

En integraciones de terceros, el token usado debe venir de OAuth, no de un access token manual.

---

## 4. Flujo objetivo Manager/Owner

### UC-MP-PROV-01 — Preparar sucursal Mercado Pago

Actor: Manager/Owner  
Permiso: `integrations.manage`

Flujo:

1. Manager abre Settings > Terminales.
2. Sistema muestra conexion Mercado Pago activa.
3. Manager selecciona sucursal Tortilla Plus.
4. Sistema valida si existe configuracion Mercado Pago para esa sucursal.
5. Si no existe, muestra boton:

```txt
Preparar sucursal en Mercado Pago
```

6. Backend crea Store en Mercado Pago usando access token OAuth.
7. Backend guarda IDs externos en Tortilla Plus.
8. UI muestra Store creada/vinculada.

Criterio:

```txt
Cada Branch de Tortilla Plus puede tener un Store de Mercado Pago vinculado.
```

---

### UC-MP-PROV-02 — Preparar caja/POS Mercado Pago

Actor: Manager/Owner  
Permiso: `integrations.manage`

Flujo:

1. Manager selecciona una caja Tortilla Plus (`posDeviceId`).
2. Sistema valida si existe POS Mercado Pago asociado.
3. Si no existe, muestra:

```txt
Crear POS Mercado Pago para esta caja
```

4. Backend crea POS externo en Mercado Pago ligado al Store de la sucursal.
5. Backend guarda `externalPosId`, `mpPosId`, `mpStoreId`.
6. UI muestra caja preparada.

Criterio:

```txt
Cada caja Tortilla Plus debe tener un POS Mercado Pago propio.
```

Regla:

```txt
Una terminal en PDV solo debe asociarse a una caja/POS.
```

---

### UC-MP-PROV-03 — Sincronizar y asignar terminal

Actor: Manager/Owner  
Permiso: `integrations.manage`

Flujo:

1. Manager presiona Sincronizar terminales.
2. Backend lista terminales Mercado Pago usando OAuth.
3. Backend guarda:

```txt
terminalId
terminalName
mpStoreId/store_id
mpPosId/pos_id
externalPosId
operatingMode
status
```

4. Manager selecciona terminal.
5. Manager asigna terminal a caja Tortilla Plus.
6. Backend valida compatibilidad:

```txt
terminal.store_id coincide con Store de la sucursal
terminal.pos_id coincide con POS Mercado Pago de la caja
```

7. Si no coincide, UI muestra error accionable.

Criterio:

```txt
La terminal solo queda asignada si pertenece al Store/POS esperado o si el sistema puede completar la vinculacion requerida.
```

---

### UC-MP-PROV-04 — Activar PDV desde Tortilla Plus

Actor: Manager/Owner  
Permiso: `integrations.manage`

Flujo:

1. Manager ve terminal en Settings.
2. Si `operatingMode !== PDV`, sistema muestra boton:

```txt
Activar modo PDV
```

3. Manager presiona el boton.
4. Backend ejecuta:

```txt
PATCH /terminals/v1/setup
```

con:

```json
{
  "terminals": [
    {
      "id": "terminalId",
      "operating_mode": "PDV"
    }
  ]
}
```

5. Backend guarda evento de auditoria.
6. Backend sincroniza terminales nuevamente.
7. UI muestra:

```txt
Modo: PDV
```

8. Si Mercado Pago solicita reinicio fisico, UI muestra:

```txt
Reinicia la terminal y vuelve a sincronizar.
```

Criterio:

```txt
El usuario no debe ejecutar curl ni entrar al panel de Mercado Pago para activar PDV.
```

---

## 5. Cambios de modelo de datos

### 5.1 Branch Mercado Pago config

Agregar tabla:

```prisma
model MercadoPagoBranchConfig {
  id                   String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId       String   @map("organization_id") @db.Uuid
  branchId             String   @map("branch_id") @db.Uuid
  providerConnectionId String   @map("provider_connection_id") @db.Uuid

  mpStoreId            String?  @map("mp_store_id") @db.VarChar(180)
  externalStoreId      String   @map("external_store_id") @db.VarChar(80)
  storeName            String   @map("store_name") @db.VarChar(160)
  status               String   @default("pending") @db.VarChar(40)

  createdAt            DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt            DateTime @default(now()) @map("updated_at") @db.Timestamptz(6)

  @@unique([organizationId, branchId], map: "uq_mp_branch_config_org_branch")
  @@unique([providerConnectionId, externalStoreId], map: "uq_mp_branch_config_connection_external_store")
  @@map("mercadopago_branch_configs")
}
```

### 5.2 POS Mercado Pago config

Agregar tabla:

```prisma
model MercadoPagoPosConfig {
  id                   String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  organizationId       String   @map("organization_id") @db.Uuid
  branchId             String   @map("branch_id") @db.Uuid
  posDeviceId          String   @map("pos_device_id") @db.Uuid
  providerConnectionId String   @map("provider_connection_id") @db.Uuid
  mpBranchConfigId     String   @map("mp_branch_config_id") @db.Uuid

  mpPosId              String?  @map("mp_pos_id") @db.VarChar(180)
  externalPosId        String   @map("external_pos_id") @db.VarChar(80)
  posName              String   @map("pos_name") @db.VarChar(160)
  status               String   @default("pending") @db.VarChar(40)

  createdAt            DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt            DateTime @default(now()) @map("updated_at") @db.Timestamptz(6)

  @@unique([organizationId, posDeviceId], map: "uq_mp_pos_config_org_pos_device")
  @@unique([providerConnectionId, externalPosId], map: "uq_mp_pos_config_connection_external_pos")
  @@map("mercadopago_pos_configs")
}
```

### 5.3 PaymentTerminal extendida

Agregar a `PaymentTerminal`:

```prisma
mpStoreId     String? @map("mp_store_id") @db.VarChar(180)
mpPosId       String? @map("mp_pos_id") @db.VarChar(180)
operatingMode String? @map("operating_mode") @db.VarChar(40)
```

Mapear desde Mercado Pago:

```txt
store_id -> mpStoreId
pos_id -> mpPosId
operating_mode -> operatingMode
```

---

## 6. Backend requerido

### 6.1 mercadopago-point-provisioning-service.ts

Crear:

```txt
apps/api/src/services/mercadopago-point-provisioning-service.ts
```

Responsabilidades:

```txt
createOrSyncStoreForBranch
createOrSyncExternalPosForPosDevice
syncTerminalsWithOperatingMode
activateTerminalPdvMode
validateTerminalReadyForPosDevice
```

### 6.2 Adapter Mercado Pago

Extender `mercadopago-point-adapter.ts` con:

```ts
createStore(input): Promise<MercadoPagoStoreResult>
createExternalPos(input): Promise<MercadoPagoPosResult>
setupTerminalOperatingMode(input): Promise<MercadoPagoTerminalSetupResult>
```

Endpoints externos:

```txt
POST /users/:user_id/stores
POST /pos
PATCH /terminals/v1/setup
GET /terminals/v1/list
```

Todos deben usar:

```txt
Authorization: Bearer <OAuth access token>
Content-Type: application/json
```

Para operaciones mutantes, usar idempotencia propia del sistema cuando aplique.

### 6.3 Endpoints internos nuevos

Agregar:

```txt
POST /api/v1/integrations/mercadopago/branches/:branchId/provision-store
POST /api/v1/integrations/mercadopago/pos-devices/:posDeviceId/provision-pos
POST /api/v1/integrations/mercadopago/terminals/:paymentTerminalId/activate-pdv
POST /api/v1/integrations/mercadopago/terminals/:paymentTerminalId/validate-ready
```

Permiso:

```txt
integrations.manage
```

### 6.4 Validacion antes de crear orden

Antes de `createPointOrder`, backend debe validar:

```txt
1. posDeviceId existe.
2. posDeviceId pertenece a branchId.
3. existe MercadoPagoPosConfig para posDeviceId.
4. existe terminal binding activo para posDeviceId.
5. terminal.mpStoreId coincide con branch config.
6. terminal.mpPosId coincide con POS config, si Mercado Pago lo devuelve.
7. terminal.operatingMode === PDV.
```

Errores:

```txt
MP_STORE_NOT_CONFIGURED
MP_POS_NOT_CONFIGURED
TERMINAL_NOT_ASSIGNED
TERMINAL_STORE_MISMATCH
TERMINAL_POS_MISMATCH
TERMINAL_NOT_PDV
```

---

## 7. Frontend requerido

### Settings > Terminales

Agregar bloque por sucursal:

```txt
Preparacion Mercado Pago
- Conexion OAuth: activa/inactiva
- Store Mercado Pago: creado/pendiente
- POS Mercado Pago para caja: creado/pendiente
- Terminal: sincronizada/asignada
- Modo PDV: activo/pendiente
```

### Acciones UI

Agregar botones:

```txt
Preparar sucursal en Mercado Pago
Preparar caja en Mercado Pago
Sincronizar terminales
Asignar terminal a caja
Activar modo PDV
Validar terminal lista
```

### Estados de terminal

Mostrar:

```txt
Terminal ID
Store ID Mercado Pago
POS ID Mercado Pago
External POS ID
Operating mode
Binding Tortilla Plus
Estado listo/no listo
```

### Bloqueo de cobro

En POS, si terminal no esta lista:

```txt
No permitir Enviar cobro a terminal.
Mostrar causa exacta.
```

Ejemplos:

```txt
La caja no tiene POS Mercado Pago configurado.
La terminal no esta asignada a esta caja.
La terminal no esta en modo PDV.
La terminal esta asociada a otro POS Mercado Pago.
```

---

## 8. Flujo operacional final

### Manager

```txt
1. Conectar Mercado Pago.
2. Seleccionar sucursal.
3. Preparar sucursal en Mercado Pago.
4. Seleccionar caja.
5. Preparar caja en Mercado Pago.
6. Sincronizar terminales.
7. Asignar terminal a caja.
8. Activar modo PDV.
9. Validar terminal lista.
```

### Cajero

```txt
1. Seleccionar caja activa.
2. Armar venta.
3. Elegir Tarjeta Mercado Pago.
4. Sistema valida terminal lista.
5. Enviar cobro.
6. Esperar aprobacion.
7. Cerrar venta.
```

---

## 9. Criterios de aceptacion

El modulo queda completo cuando:

1. Manager puede preparar Store Mercado Pago desde Tortilla Plus.
2. Manager puede preparar POS Mercado Pago desde Tortilla Plus.
3. Manager puede sincronizar terminales con `store_id`, `pos_id` y `operating_mode`.
4. Manager puede activar PDV desde Tortilla Plus.
5. Manager no necesita ejecutar curl ni entrar al panel Mercado Pago para terminar configuracion operativa.
6. POS bloquea cobro si Store/POS/terminal/PDV no estan listos.
7. POS solo cobra con terminal asignada a su caja.
8. Errores explican la accion correctiva.
9. Todo queda auditado.
10. Pruebas unitarias, integracion y E2E pasan.

---

## 10. Pruebas obligatorias

### Backend

1. Provision store crea `MercadoPagoBranchConfig`.
2. Provision POS crea `MercadoPagoPosConfig`.
3. Sync terminal guarda `mpStoreId`, `mpPosId`, `operatingMode`.
4. Activate PDV llama `PATCH /terminals/v1/setup`.
5. Activate PDV actualiza terminal local a `PDV` tras sync.
6. Cobro bloquea terminal no PDV.
7. Cobro bloquea terminal de otro POS.
8. Cobro bloquea branch sin store config.
9. Cobro bloquea POS sin external POS config.

### Frontend

1. Manager ve pasos pendientes.
2. Manager prepara sucursal.
3. Manager prepara caja.
4. Manager activa PDV.
5. Manager valida terminal lista.
6. POS muestra terminal lista solo cuando todos los requisitos pasan.
7. POS muestra causa exacta si algo falta.

---

## 11. Prompt para Codex

```txt
Implementa Mercado Pago Point Provisioning desde el repo V0.3.

Contexto:
El modulo Mercado Pago Point ya tiene OAuth, terminal sync, binding POS-terminal y terminal orders. Falta cerrar provisioning operativo desde Tortilla Plus. El usuario final no debe activar PDV ni configurar store/POS manualmente fuera del sistema.

Objetivo:
Permitir que Manager/Owner prepare una sucursal y caja para Mercado Pago Point desde Settings, incluyendo creacion/vinculacion de Store, creacion/vinculacion de POS externo, sincronizacion de terminales, asignacion a caja y activacion PDV desde backend.

Requisitos:
1. Crear tablas mercadopago_branch_configs y mercadopago_pos_configs.
2. Extender PaymentTerminal con mpStoreId, mpPosId y operatingMode.
3. Extender mercadopago-point-adapter.ts con:
   - createStore
   - createExternalPos
   - setupTerminalOperatingMode
4. Crear mercadopago-point-provisioning-service.ts.
5. Agregar endpoints:
   - POST /api/v1/integrations/mercadopago/branches/:branchId/provision-store
   - POST /api/v1/integrations/mercadopago/pos-devices/:posDeviceId/provision-pos
   - POST /api/v1/integrations/mercadopago/terminals/:paymentTerminalId/activate-pdv
   - POST /api/v1/integrations/mercadopago/terminals/:paymentTerminalId/validate-ready
6. Usar access token OAuth existente mediante getActiveAccessToken.
7. No usar access token manual en .env.
8. Guardar store_id, pos_id y operating_mode al sincronizar terminales.
9. Bloquear createTerminalOrder si Store/POS/terminal/PDV no estan listos.
10. Agregar UI en Settings > Terminales para ejecutar los pasos.
11. Mostrar estado listo/no listo por caja.
12. Agregar auditoria para provisioning, binding y activacion PDV.
13. Agregar pruebas unitarias, integracion y E2E.

Restricciones:
- No romper OAuth existente.
- No romper checkout actual.
- No crear reembolsos automaticos.
- No usar MERCADOPAGO_ACCESS_TOKEN ni MERCADOPAGO_TERMINAL_ID globales.
- No dejar pasos operativos finales fuera del repo.

Criterio de cierre:
Un Manager puede, desde Tortilla Plus, preparar una sucursal, preparar una caja, sincronizar la terminal NEWLAND, asignarla a Caja principal, activar PDV, validar terminal lista y luego el cajero puede cobrar desde POS sin configurar manualmente Mercado Pago fuera del sistema.
```
