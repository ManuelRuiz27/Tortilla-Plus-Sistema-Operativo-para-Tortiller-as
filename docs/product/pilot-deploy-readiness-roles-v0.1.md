# Tortilla Plus — Readiness de Roles para Deploy Piloto V0.1

## Estado

Documento de ejecución previa al deploy piloto.

Este archivo convierte la auditoría de roles en una lista de cambios implementables para dejar el repositorio en estado apto para una fase piloto controlada.

## Objetivo

Preparar Tortilla Plus para un deploy piloto con roles funcionales, rutas protegidas, RBAC consistente, flujos críticos operables y módulos incompletos ocultos o bloqueados de forma explícita.

El piloto no debe demostrar todo el producto final. Debe demostrar operación estable de:

- Director / Dueño de Plataforma.
- Owner / Dueño del negocio.
- Gerente de sucursal.
- Cajero.

El rol Supervisor solo debe entrar al piloto si queda convertido en autorizador real. El Repartidor no debe entrar como usuario en esta fase; debe mantenerse como entidad operativa dentro del módulo de rutas.

## Roles objetivo para piloto

```txt
platform_owner       scope: platform      estado piloto: requerido
organization_owner   scope: organization  estado piloto: requerido
manager              scope: organization  estado piloto: requerido
supervisor           scope: branch         estado piloto: condicionado
cashier              scope: branch         estado piloto: requerido
delivery_driver      no es UserRole        estado piloto: fuera de alcance
```

## Decisión de alcance

### Entran al piloto

```txt
platform_owner
organization_owner
manager
cashier
```

### Entra solo si se corrige

```txt
supervisor
```

Condición: debe tener flujo propio de autorizaciones o quedar limitado como autorizador mediante PIN dentro de flujos de gerente/cajero.

### No entra como usuario

```txt
repartidor / delivery_driver
```

Debe permanecer como entidad operativa administrada por gerente.

---

# P0 — Bloqueadores de piloto

Los siguientes puntos deben completarse antes de considerar el repo listo para deploy piloto.

## P0.1 Corregir RBAC contaminado

### Problema

Actualmente `organization_owner` y `manager` reciben permisos de plataforma si el seed ejecutable les asigna todos los permisos existentes.

Esto contamina el modelo de seguridad aunque `/platform/*` valide `platform_owner` en backend.

### Regla obligatoria

Ningún usuario con `organization_id != null` puede tener permisos `platform.*`.

### Matriz correcta de permisos

#### `platform_owner`

Debe recibir solo permisos de plataforma:

```txt
platform.dashboard.view
platform.organizations.view
platform.organizations.manage
platform.organizations.suspend
platform.subscriptions.view
platform.subscriptions.manage
platform.payments.view
platform.payments.manage
platform.pos_devices.view
platform.pos_devices.manage
platform.pos_devices.license
platform.audit.view
platform.support.access
platform.impersonation.start
platform.impersonation.end
```

No debe recibir permisos operativos de tortillería como `sales.create`, `cash.open`, `products.manage`, etc.

#### `organization_owner`

Debe recibir permisos organizacionales y operativos, pero nunca `platform.*`.

Permisos sugeridos para piloto:

```txt
organization.view
organization.update
branches.view
branches.manage
users.view
users.manage
sales.view
cash.movements.view
inventory.view
inventory.manage
production.manage
products.view
products.manage
prices.manage
customers.view
customers.manage
customers.credit.manage
routes.view
routes.manage
billing.view
billing.manage
reports.basic.view
reports.advanced.view
audit.view
integrations.view
integrations.manage
```

Debe poder configurar el negocio, no administrar el SaaS completo.

#### `manager`

Debe recibir permisos operativos de sucursal, pero nunca `platform.*`.

Permisos sugeridos para piloto:

```txt
branches.view
sales.create
sales.view
sales.cancel_before_payment
sales.cancel_after_payment
payments.create
payments.cancel_terminal_order
payments.manual_card_reference
cash.open
cash.close
cash.movements.view
cash.withdraw.request
cash.withdraw.authorize
cash.adjust
inventory.view
inventory.manage
production.manage
products.view
products.manage
prices.manage
customers.view
customers.manage
customers.credit.manage
routes.view
routes.manage
reports.basic.view
reports.advanced.view
integrations.view
integrations.manage
```

Notas:

- Si Mercado Pago debe ser configurado solo por Owner, retirar `integrations.manage` del gerente.
- Si cancelación post-pago debe requerir autorización, retirar `sales.cancel_after_payment` del gerente.

#### `supervisor`

Permisos sugeridos si entra al piloto:

```txt
branches.view
sales.create
sales.view
sales.cancel_before_payment
payments.create
payments.cancel_terminal_order
cash.open
cash.close
cash.movements.view
cash.withdraw.request
cash.withdraw.authorize
inventory.view
inventory.manage
production.manage
products.view
prices.manage
customers.view
reports.basic.view
```

No debe tener:

```txt
platform.*
users.manage
branches.manage
billing.manage
integrations.manage
reports.advanced.view
```

#### `cashier`

Permisos sugeridos para piloto:

```txt
sales.create
sales.view
sales.cancel_before_payment
payments.create
cash.open
cash.close
cash.movements.view
cash.withdraw.request
inventory.view
products.view
customers.view
```

Decisión pendiente:

```txt
payments.cancel_terminal_order
```

Debe definirse si el cajero puede cancelar una orden de terminal Mercado Pago o si requiere Supervisor/Gerente.

### Archivos a tocar

```txt
apps/api/prisma/seed.ts
apps/api/src/services/permission-service.ts
apps/api/src/services/platform-service.ts
apps/web/src/shared/types/session.types.ts
apps/web/src/shared/guards/role-guard.tsx
```

### Criterios de aceptación

- `platform_owner` no tiene permisos operativos de sucursal.
- `organization_owner` no tiene ningún permiso `platform.*`.
- `manager` no tiene ningún permiso `platform.*`.
- `supervisor` no tiene ningún permiso `platform.*`.
- `cashier` no tiene ningún permiso `platform.*`.
- `/api/v1/platform/*` rechaza cualquier usuario que no sea `platform_owner` con `organization_id = null`.
- `/app/manager/*` rechaza `platform_owner`.
- `/app/pos/*` rechaza `platform_owner`.

---

## P0.2 Actualizar seed documental antiguo

### Problema

El archivo documental `docs/database/05-seed` puede seguir mencionando `platform_admin` o permisos obsoletos.

### Regla

No debe existir `platform_admin` en documentación activa, seed ejecutable, mocks, labels, guards ni navegación.

### Archivos a tocar

```txt
docs/database/05-seed
apps/api/prisma/seed.ts
apps/web/src/shared/utils/labels.ts
```

### Criterios de aceptación

- Búsqueda global de `platform_admin` no debe devolver referencias activas.
- Si se conserva una referencia histórica, debe estar dentro de una sección explícita `deprecated` o `fase futura`, no en seeds ejecutables.
- El seed ejecutable crea únicamente estos roles:

```txt
platform_owner
organization_owner
manager
supervisor
cashier
```

---

## P0.3 Crear guard frontend específico de plataforma

### Problema

El frontend protege `/platform` solo por rol. Eso no basta para representar correctamente el contexto de plataforma.

### Requisito

Crear `PlatformGuard`.

Validaciones:

```txt
user.roles includes platform_owner
user.organizationId === null
user.branches.length === 0
```

Si falla, mostrar `BlockedState` y no renderizar `PlatformLayout`.

### Archivos a tocar

```txt
apps/web/src/shared/guards/platform-guard.tsx
apps/web/src/app/router.tsx
```

### Ejemplo de uso esperado

```tsx
<AuthGuard>
  <PlatformGuard>
    <PlatformLayout />
  </PlatformGuard>
</AuthGuard>
```

### Criterios de aceptación

- `platform_owner` accede a `/platform`.
- `platform_owner` con `organizationId != null` no accede.
- `organization_owner`, `manager`, `supervisor`, `cashier` no acceden.
- El backend sigue siendo la protección principal.

---

## P0.4 Resolver módulos visibles que fallan sin mocks

### Problema

Hay endpoints/pantallas que en modo real pueden caer en `DEMO_MODULE_DISABLED` o comportamientos incompletos.

### Regla

Cualquier pantalla visible en piloto debe cumplir una de dos condiciones:

1. Funciona contra backend real.
2. Está oculta por feature flag o muestra estado explícito de “no incluido en piloto”.

### Módulos críticos a revisar

```txt
pendingWithdrawalsRequest
productionBatchesRequest
reconciliation create/review/items
```

### Cambios requeridos

#### Opción A — Implementar backend real

Implementar endpoints reales y conectar UI.

#### Opción B — Ocultar en piloto

Ocultar navegación o acciones usando feature flags/permisos.

### Criterios de aceptación

- Con `VITE_USE_MOCKS=false`, ninguna pantalla visible del piloto debe romper por demo module disabled.
- Si Conciliación no entra al piloto, no debe aparecer en navegación.
- Si Producción no entra al piloto, no debe aparecer en navegación.
- Si Retiros pendientes no está cerrado, el Supervisor no debe entrar como rol independiente.

---

## P0.5 Validar bloqueo por suscripción, organización y licencia POS

### Reglas obligatorias

- Organización `suspended_limited` no puede operar ventas reales.
- Organización `cancelled` no puede operar ventas reales.
- POS sin licencia no puede operar ventas reales.
- POS inactivo/bloqueado no puede operar ventas reales.

### Archivos a revisar

```txt
apps/api/src/services/operational-access-service.ts
apps/api/src/services/sale-service.ts
apps/api/src/services/cash-service.ts
apps/api/src/services/payment-terminal-order-service.ts
apps/web/src/modules/pos/pages/sale-page.tsx
apps/web/src/modules/pos/pages/open-cash-page.tsx
```

### Criterios de aceptación

- Intentar vender con organización suspendida devuelve error controlado.
- Intentar vender con POS no licenciado devuelve error controlado.
- Intentar abrir caja con organización suspendida debe bloquearse o mostrar advertencia crítica, según regla definida.
- El mensaje de UI debe ser comprensible para usuario final.

---

# P1 — Necesario para piloto serio

## P1.1 Completar Owner / Dueño del negocio

### Estado objetivo

`organization_owner` debe administrar su organización, no solo operar como gerente.

### Cambios requeridos

Crear sección Owner dentro de `/app/manager/settings` o un módulo dedicado `/app/owner`.

Para piloto puede resolverse con tabs en `SettingsPage`:

```txt
Organización
Usuarios
Sucursales
POS
Integraciones
Plan
Auditoría
```

### Funciones mínimas

#### Organización

- Ver datos generales.
- Editar nombre comercial, razón social, RFC, contacto.
- Ver estado del plan.

#### Usuarios

- Crear usuario.
- Editar usuario.
- Activar/desactivar usuario.
- Asignar rol.
- Asignar sucursal.
- Resetear contraseña/PIN.

#### Sucursales

- Crear sucursal.
- Editar sucursal.
- Activar/desactivar sucursal.
- Ver POS asignados.

#### POS

- Crear POS/dispositivo lógico.
- Asignar POS a sucursal.
- Ver estado y última conexión.
- No debe poder licenciar POS si esa acción pertenece a `platform_owner`.

### Backend mínimo requerido

```txt
GET    /organization/summary
PATCH  /organization
GET    /organization/users
POST   /organization/users
PATCH  /organization/users/:id
PATCH  /organization/users/:id/status
POST   /organization/users/:id/reset-password
POST   /organization/users/:id/reset-pin
GET    /organization/branches
POST   /organization/branches
PATCH  /organization/branches/:id
PATCH  /organization/branches/:id/status
GET    /organization/pos-devices
POST   /organization/pos-devices
PATCH  /organization/pos-devices/:id
```

### Criterios de aceptación

- Owner puede crear gerente, supervisor y cajero.
- Owner puede asignar usuarios a sucursal.
- Owner puede crear una sucursal si su plan lo permite.
- Owner no puede licenciar POS; eso es de plataforma.
- Owner no puede acceder a `/platform`.

---

## P1.2 Separar Gerente de Owner

### Problema

`manager` y `organization_owner` usan el mismo layout y navegación.

### Regla

El gerente opera una sucursal. El Owner administra el negocio.

### Cambios requeridos

- Mantener `/app/manager` para gerente operativo.
- Ocultar del gerente secciones de administración global.
- Agregar navegación por permisos/features, no solo por rol.
- Si `manager` conserva acceso a configuración, limitarla a sucursal activa.

### Permisos UI sugeridos

```txt
products.manage       => Productos
prices.manage         => Precios
inventory.manage      => Inventario
customers.manage      => Clientes
routes.manage         => Rutas
reports.basic.view    => Reportes
integrations.manage   => Terminales / Integraciones
billing.manage        => Facturación
```

### Criterios de aceptación

- Gerente no ve administración global de usuarios/sucursales si no tiene permiso.
- Gerente no ve `/platform`.
- Gerente no puede crear usuarios de plataforma.
- Gerente no puede cambiar plan SaaS.

---

## P1.3 Decidir y corregir Supervisor

### Opción recomendada para piloto

No usar Supervisor como panel completo.

Usarlo como autorizador por PIN dentro de flujos de gerente/cajero.

### Si entra como usuario completo

Crear `/app/supervisor` con:

```txt
Dashboard de autorizaciones
Retiros pendientes
Cancelaciones pendientes
Ajustes de caja pendientes
Excepciones de crédito
Historial de autorizaciones
```

### Cambios mínimos si no se crea panel

- Retirar `supervisor` de `allowedRoles` en `/app/manager`.
- Mantenerlo autorizado para POS si se desea que pueda operar caja.
- Usar sus credenciales/PIN solo para autorizar acciones sensibles.

### Criterios de aceptación

- Supervisor no aparece como “gerente con otro nombre”.
- Si entra a UI, solo ve autorizaciones y operación limitada.
- Toda autorización queda auditada.
- Retiros pendientes funcionan contra backend real o la vista queda oculta.

---

## P1.4 Cerrar flujo de Cajero

### Flujo mínimo para piloto

El cajero debe poder:

- Iniciar sesión.
- Seleccionar sucursal si aplica.
- Abrir caja.
- Vender tortilla por kilo.
- Vender tortilla por monto.
- Vender masa por kilo.
- Vender masa por monto.
- Vender paquete 800g.
- Vender producto retail.
- Seleccionar cliente.
- Cobrar efectivo.
- Cobrar tarjeta con terminal si está configurada.
- Cobrar mixto si la regla lo permite.
- Registrar crédito solo a clientes autorizados.
- Solicitar retiro.
- Cerrar caja.

### Cambios requeridos

- Confirmar si `payments.cancel_terminal_order` pertenece a cajero o supervisor/manager.
- Retirar o marcar explícitamente báscula como futura.
- Mostrar error claro si POS no está licenciado.
- Mostrar error claro si organización está suspendida.
- Validar cierre de caja con retiros pendientes.

### Casos de prueba obligatorios

```txt
POS-01 Login cajero
POS-02 Selección de sucursal
POS-03 Apertura de caja
POS-04 Venta tortilla por kg
POS-05 Venta tortilla por monto
POS-06 Venta masa por kg
POS-07 Venta masa por monto
POS-08 Venta paquete 800g
POS-09 Venta retail
POS-10 Venta con cliente frecuente
POS-11 Venta crédito dentro de límite
POS-12 Venta crédito fuera de límite
POS-13 Pago efectivo
POS-14 Pago tarjeta con terminal
POS-15 Pago mixto
POS-16 POS sin licencia
POS-17 Organización suspendida
POS-18 Caja sin abrir
POS-19 Retiro solicitado
POS-20 Cierre de caja con retiro pendiente
```

---

## P1.5 Mejorar Director / Platform Owner

### Ya existe

- Ruta `/platform`.
- Layout propio.
- Dashboard.
- Organizaciones.
- Detalle de organización.
- Suscripciones.
- POS/licencias.
- Pagos SaaS.
- Auditoría.
- Soporte deshabilitado.

### Cambios requeridos

#### Dashboard

- Agregar links desde alertas hacia tablas filtradas.
- Mostrar organizaciones vencidas/suspendidas.

#### Organizaciones

- Confirmación antes de suspender/cancelar.
- Mensaje claro de impacto: “La organización no podrá operar ventas reales”.

#### Suscripciones

- Agregar acción directa “Abrir detalle”.
- Permitir editar periodo actual y grace period desde detalle si backend ya lo soporta.

#### POS / Licencias

- Confirmación antes de quitar licencia.
- Confirmación antes de desactivar POS.
- Mostrar impacto operativo.

#### Pagos SaaS

- Validar monto mayor a cero.
- Mostrar nota/referencia si existe.
- Bloquear pago si organización no tiene suscripción.

#### Auditoría

- Cambiar filtro manual `Organization ID` por selector de organización.
- Agregar filtros por usuario y acción.

#### Soporte

- Mantener deshabilitado si impersonación no está lista.
- No exponer endpoints funcionales de impersonación sin auditoría completa.

---

# P2 — Puede esperar después del piloto

## Fuera de alcance para piloto

```txt
Repartidor como usuario autenticado
/app/driver
Impersonación real
Reportería financiera avanzada
Conciliación bancaria avanzada
Facturación SaaS automática
Báscula conectada
App móvil de reparto
Roles internos de soporte tipo platform_admin
```

---

# Repartidor / Ruta

## Decisión

No implementar `delivery_driver` como `UserRole` para piloto.

## Estado permitido

El repartidor puede existir como entidad operativa:

```txt
DeliveryDriver
DeliveryRoute
DeliveryOrder
DeliveryPayment
DeliverySettlement
DeliveryReturn
```

## Flujo permitido en piloto

El gerente administra:

- repartidores,
- rutas,
- clientes por ruta,
- pedidos,
- carga,
- entrega,
- cobro,
- liquidación.

## No permitido en piloto

- Login de repartidor.
- Panel móvil de repartidor.
- Confirmación de entrega desde dispositivo del repartidor.
- Geolocalización.
- Evidencia fotográfica.

---

# Checklist técnico para dejar repo listo

## Backend

### Auth/RBAC

- [ ] `AuthenticatedUser.organizationId` representa correctamente usuarios plataforma y organización.
- [ ] `platform_owner` tiene `organization_id = null`.
- [ ] `requirePlatformOwner` valida rol, scope y usuario activo.
- [ ] Ningún rol de organización tiene permisos `platform.*`.
- [ ] `platform_owner` no accede a rutas operativas.
- [ ] Usuarios de organización no acceden a `/api/v1/platform/*`.

### Seeds

- [ ] `apps/api/prisma/seed.ts` crea roles finales.
- [ ] `apps/api/prisma/seed.ts` no crea `platform_admin`.
- [ ] `apps/api/prisma/seed.ts` crea `admin@tortillaplus.mx` con `organizationId = null`.
- [ ] Demo users existen para owner, manager, supervisor y cashier.
- [ ] Demo POS está activo y licenciado.
- [ ] Demo branch tiene productos, precios e inventario.

### Platform

- [ ] `GET /platform/dashboard` funciona.
- [ ] `GET /platform/organizations` funciona.
- [ ] `POST /platform/organizations` funciona.
- [ ] `PATCH /platform/organizations/:id` funciona.
- [ ] `PATCH /platform/organizations/:id/status` audita cambios.
- [ ] `PATCH /platform/organizations/:id/subscription` audita cambios.
- [ ] `PATCH /platform/pos-devices/:id/license` audita cambios.
- [ ] `POST /platform/payments/manual` audita cambios.
- [ ] `GET /platform/audit-log` permite filtros.

### Operación

- [ ] Venta bloquea organización suspendida.
- [ ] Venta bloquea POS no licenciado.
- [ ] Caja no se comporta inconsistentemente si organización está suspendida.
- [ ] Cierre de caja respeta regla de retiros pendientes.
- [ ] Venta mixta con crédito valida cliente y límite.

## Frontend

### Routing

- [ ] `/platform` usa `PlatformGuard`.
- [ ] `/app/manager` no acepta `platform_owner`.
- [ ] `/app/pos` no acepta `platform_owner`.
- [ ] Login redirige correctamente por rol.
- [ ] `platform_owner` no pasa por selección de sucursal.

### Platform UI

- [ ] Dashboard muestra métricas reales.
- [ ] Organizaciones permite crear organización.
- [ ] Detalle permite editar organización.
- [ ] Detalle permite cambiar estado con confirmación.
- [ ] Detalle permite cambiar suscripción.
- [ ] POS/licencias permite licenciar/deslicenciar con confirmación.
- [ ] Pagos permite registrar pago manual.
- [ ] Auditoría usa selector de organización.
- [ ] Soporte indica claramente que impersonación no está disponible.

### Owner UI

- [ ] Owner puede gestionar usuarios.
- [ ] Owner puede gestionar sucursales.
- [ ] Owner puede gestionar POS de organización sin licenciar.
- [ ] Owner puede ver plan/estado, pero no administrar SaaS global.

### Manager UI

- [ ] Navegación filtrada por permisos/features.
- [ ] Módulos no listos están ocultos o bloqueados explícitamente.
- [ ] Configuración de terminales está disponible solo al rol autorizado.
- [ ] Reportes básicos cargan sin mocks.

### Supervisor UI

- [ ] Decisión tomada: panel propio o solo PIN autorizador.
- [ ] Si hay panel, solo muestra autorizaciones.
- [ ] Si no hay panel, no aparece como manager completo.

### Cashier UI

- [ ] Venta completa funciona sin mocks.
- [ ] Caja abierta requerida.
- [ ] Errores operativos se muestran claros.
- [ ] Báscula se oculta o queda marcada como futura.

---

# Pruebas mínimas por rol

## `platform_owner`

```txt
PLAT-01 Login admin@tortillaplus.mx
PLAT-02 Redirección a /platform
PLAT-03 No requiere sucursal
PLAT-04 Dashboard carga
PLAT-05 Crear organización
PLAT-06 Editar organización
PLAT-07 Suspender organización
PLAT-08 Cambiar plan
PLAT-09 Licenciar POS
PLAT-10 Quitar licencia POS
PLAT-11 Registrar pago manual
PLAT-12 Ver auditoría
PLAT-13 Rechazar acceso a /app/manager
PLAT-14 Rechazar acceso a /app/pos
```

## `organization_owner`

```txt
OWN-01 Login owner.demo@tortillaplus.mx
OWN-02 Selección de sucursal si aplica
OWN-03 Acceso a panel negocio
OWN-04 Crear usuario gerente
OWN-05 Crear usuario cajero
OWN-06 Crear sucursal si plan lo permite
OWN-07 Ver POS de organización
OWN-08 No puede licenciar POS
OWN-09 No puede acceder a /platform
OWN-10 No tiene permisos platform.*
```

## `manager`

```txt
MAN-01 Login manager.demo@tortillaplus.mx
MAN-02 Acceso a /app/manager
MAN-03 Ver dashboard sucursal
MAN-04 Gestionar productos
MAN-05 Gestionar precios
MAN-06 Gestionar inventario
MAN-07 Gestionar clientes
MAN-08 Ver reportes básicos
MAN-09 Operar rutas si feature activa
MAN-10 No puede acceder a /platform
MAN-11 No tiene permisos platform.*
```

## `supervisor`

```txt
SUP-01 Login supervisor.demo@tortillaplus.mx
SUP-02 No aparece como gerente completo si no hay panel supervisor
SUP-03 Autorizar retiro
SUP-04 Rechazar retiro
SUP-05 Autorizar excepción configurada
SUP-06 Toda autorización genera audit log
SUP-07 No puede acceder a /platform
SUP-08 No tiene permisos platform.*
```

## `cashier`

```txt
CASH-01 Login cashier.demo@tortillaplus.mx
CASH-02 Selección de sucursal
CASH-03 Abrir caja
CASH-04 Venta tortilla por kilo
CASH-05 Venta tortilla por monto
CASH-06 Venta masa por kilo
CASH-07 Venta masa por monto
CASH-08 Venta paquete 800g
CASH-09 Venta retail
CASH-10 Venta efectivo
CASH-11 Venta tarjeta terminal
CASH-12 Venta mixta
CASH-13 Cliente con crédito dentro de límite
CASH-14 Cliente con crédito fuera de límite
CASH-15 Solicitar retiro
CASH-16 Cerrar caja
CASH-17 Bloqueo por POS sin licencia
CASH-18 Bloqueo por organización suspendida
CASH-19 No puede acceder a /platform
CASH-20 No tiene permisos platform.*
```

---

# Comandos de validación antes del deploy piloto

Ejecutar en local/CI:

```bash
npm install
npm run build
npm run lint
```

Backend:

```bash
cd apps/api
npm run db:validate
npm run build
npm run test
npm run test:integration
```

Frontend:

```bash
cd apps/web
npm run build
npm run lint
```

Base de datos:

```bash
cd apps/api
npm run db:migrate:deploy
npm run db:seed
```

Validaciones manuales:

```txt
VITE_USE_MOCKS=false
VITE_API_BASE_URL=<api-piloto>/api/v1
```

No se considera listo si alguna pantalla visible requiere mocks para funcionar.

---

# Criterios finales de listo para piloto

El repo se considera listo para deploy piloto si cumple todo lo siguiente:

## Seguridad/RBAC

- [ ] `platform_owner` es el único rol con acceso SaaS global.
- [ ] No existe `platform_admin` activo.
- [ ] Ningún usuario de organización tiene permisos `platform.*`.
- [ ] Rutas backend `/api/v1/platform/*` rechazan usuarios no plataforma.
- [ ] Frontend separa contexto plataforma y contexto negocio.

## Operación

- [ ] Cajero puede vender y cobrar sin mocks.
- [ ] Caja abre/cierra sin inconsistencias críticas.
- [ ] POS sin licencia bloquea ventas.
- [ ] Organización suspendida bloquea ventas.
- [ ] Cliente con crédito respeta reglas de límite.

## Administración

- [ ] Director puede crear/suspender organizaciones.
- [ ] Director puede administrar suscripciones básicas.
- [ ] Director puede administrar licencias POS.
- [ ] Director puede registrar pagos SaaS manuales.
- [ ] Owner puede administrar usuarios/sucursales/POS internos.

## UX piloto

- [ ] No hay rutas visibles que no funcionen.
- [ ] No hay botones críticos sin confirmación.
- [ ] Errores operativos son comprensibles.
- [ ] Módulos fuera de alcance están ocultos o claramente deshabilitados.

## QA

- [ ] Casos PLAT completos.
- [ ] Casos OWN completos.
- [ ] Casos MAN completos.
- [ ] Casos CASH completos.
- [ ] Casos SUP completos solo si Supervisor entra al piloto.

---

# Instrucción sugerida para Codex

Usar este prompt para implementar incrementalmente:

```txt
Trabaja sobre el repositorio Tortilla Plus.
Objetivo: dejar el repo listo para deploy piloto siguiendo docs/product/pilot-deploy-readiness-roles-v0.1.md.

Prioridad estricta:
1. Corregir RBAC del seed ejecutable para que organization_owner, manager, supervisor y cashier no tengan permisos platform.*.
2. Actualizar docs/database/05-seed para eliminar platform_admin y alinear roles/permisos con seed.ts.
3. Crear PlatformGuard frontend y usarlo en /platform.
4. Ocultar o resolver módulos visibles que fallan con VITE_USE_MOCKS=false.
5. Completar flujo mínimo de Owner: usuarios, sucursales y POS de organización.
6. Separar Supervisor: panel de autorizaciones o limitarlo como autorizador por PIN.
7. Cerrar pruebas manuales de cajero y validar bloqueo por organización suspendida/POS sin licencia.

No implementar repartidor como usuario.
No implementar impersonación real.
No agregar platform_admin.
No crear roles nuevos sin justificar.

Al terminar:
- npm run build debe pasar.
- apps/api npm run db:validate debe pasar.
- apps/api npm run test debe pasar.
- frontend no debe mostrar rutas visibles que dependan de mocks.
- documentar cualquier módulo que se oculte para piloto.
```

---

# Nota final

Este documento no autoriza agregar funcionalidades fuera de alcance. Su objetivo es reducir riesgo antes del primer piloto, no ampliar el producto.

Si una función no es necesaria para demostrar operación real en una tortillería piloto, debe ocultarse o posponerse.
