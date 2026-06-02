# Tortilla Plus — Módulo Platform Owner V0.1

## Estado

Documento de implementación previa al primer despliegue.

Este archivo define el alcance mínimo para integrar el rol de plataforma del SaaS y eliminar el rol `platform_admin` para evitar deuda funcional antes del primer deploy.

## Decisión principal

Para V1 solo existirá un rol de plataforma:

```txt
platform_owner = Dueño de Plataforma / Director de Plataforma / Superadmin SaaS
```

Se elimina temporalmente:

```txt
platform_admin
```

Motivo: en V1 no existe equipo interno de soporte ni operación que justifique separar permisos de plataforma. Mantener `platform_admin` sin uso genera ambigüedad, seed incompleto, labels faltantes y rutas potencialmente mal protegidas.

## Objetivo del módulo

Permitir que el dueño del SaaS administre la operación comercial y técnica mínima de Tortilla Plus antes del primer despliegue:

- Organizaciones/clientes.
- Suscripciones y planes.
- POS/licencias activas.
- Pagos SaaS manuales.
- Auditoría global.
- Soporte controlado.

Este módulo no reemplaza los módulos internos de cada tortillería. `platform_owner` administra el SaaS, no opera una sucursal como cajero o gerente.

## Roles finales para V1

```txt
platform_owner       scope: platform
organization_owner   scope: organization
manager              scope: organization
supervisor           scope: branch
cashier              scope: branch
```

No debe existir `platform_admin` en seeds, mocks, labels, guards, navegación ni documentación activa de V1.

## Reglas de identidad

### Usuario de plataforma

Un usuario `platform_owner` debe cumplir:

```txt
users.organization_id = null
role.code = platform_owner
role.scope = platform
```

### Usuario de organización

Usuarios como `organization_owner`, `manager`, `supervisor` y `cashier` deben cumplir:

```txt
users.organization_id != null
role.scope IN ('organization', 'branch')
```

## Reglas de acceso

Para acceder a cualquier ruta `/platform/*`, el backend debe validar:

```txt
role.code = platform_owner
role.scope = platform
```

No basta con validar permisos sueltos como `users.manage`, `audit.view` o `reports.advanced.view`, porque esos permisos también pueden existir en contexto de organización.

El frontend también debe ocultar navegación, pero la protección real debe estar en backend.

## Cambios obligatorios en base de datos / seed

### 1. Eliminar `platform_admin`

Quitar del seed:

```sql
('platform_admin', 'Administrador de Plataforma', 'platform')
```

No deben quedar referencias activas a `platform_admin`.

### 2. Mantener `platform_owner`

Debe existir:

```sql
('platform_owner', 'Dueño de Plataforma', 'platform')
```

### 3. Agregar usuario seed de plataforma

Crear un usuario de plataforma inicial para desarrollo/demo:

```txt
name: Dueño Plataforma
email: admin@tortillaplus.mx
organization_id: null
role: platform_owner
status: active
```

Notas:

- No usar este password real en producción.
- El hash debe ser reemplazable por variable o seed seguro.
- El usuario debe poder iniciar sesión sin organización asignada.

### 4. Permisos mínimos de plataforma

Agregar permisos específicos de plataforma, aunque `platform_owner` pueda recibir todos por seed:

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

No crear permisos para `platform_admin`.

## Cambios obligatorios en backend

### 1. Guard de plataforma

Crear o ajustar un guard/middleware para rutas de plataforma:

```txt
requirePlatformOwner
```

Debe validar:

- Usuario autenticado.
- Token vigente.
- Rol `platform_owner`.
- Scope `platform`.
- `organization_id = null` para el usuario de plataforma.

Debe rechazar:

- `organization_owner`.
- `manager`.
- `supervisor`.
- `cashier`.
- Cualquier usuario con `organization_id != null` intentando acceder a `/platform/*`.

### 2. Auth/Login

El login debe soportar usuarios con `organization_id = null`.

Respuesta esperada para `platform_owner`:

```json
{
  "user": {
    "id": "uuid",
    "organizationId": null,
    "email": "admin@tortillaplus.mx",
    "fullName": "Dueño Plataforma",
    "roles": ["platform_owner"],
    "permissions": ["platform.dashboard.view"],
    "branches": []
  }
}
```

El frontend no debe intentar seleccionar sucursal para `platform_owner`.

### 3. Endpoints mínimos de plataforma

Implementar o dejar preparados con controlador/servicio real, no mocks permanentes.

```txt
GET    /platform/dashboard
GET    /platform/organizations
POST   /platform/organizations
GET    /platform/organizations/:id
PATCH  /platform/organizations/:id
PATCH  /platform/organizations/:id/status

GET    /platform/organizations/:id/subscription
PATCH  /platform/organizations/:id/subscription

GET    /platform/organizations/:id/pos-devices
PATCH  /platform/pos-devices/:id/status
PATCH  /platform/pos-devices/:id/license

GET    /platform/payments
POST   /platform/payments/manual

GET    /platform/audit-log
POST   /platform/support/impersonation/start
POST   /platform/support/impersonation/end
```

### 4. Dashboard SaaS

`GET /platform/dashboard` debe devolver al menos:

```json
{
  "organizationsTotal": 0,
  "organizationsActive": 0,
  "organizationsSuspended": 0,
  "branchesActive": 0,
  "posDevicesActive": 0,
  "posDevicesLicensed": 0,
  "subscriptionsActive": 0,
  "subscriptionsTrial": 0,
  "subscriptionsPastDue": 0,
  "monthlyRecurringRevenue": 0,
  "paymentsCurrentMonth": 0,
  "alerts": []
}
```

### 5. Gestión de organizaciones

Debe permitir:

- Crear organización.
- Editar nombre, razón social, RFC/tax ID, contacto.
- Activar/desactivar/suspender.
- Ver sucursales vinculadas.
- Ver usuarios vinculados.
- Ver suscripción actual.
- Ver POS asociados.

No borrar organizaciones físicamente en V1. Usar status.

### 6. Gestión de suscripciones

Debe permitir:

- Asignar plan `free` o `paid`.
- Cambiar estado de suscripción.
- Configurar periodo mensual.
- Registrar inicio y fin de periodo actual.
- Registrar gracia o suspensión.
- Consultar `subscription_items`.

Regla V1:

```txt
paid = cuota base mensual + costo por POS activo/licenciado
```

### 7. Gestión de POS/licencias

Debe permitir:

- Ver POS por organización y sucursal.
- Activar/desactivar POS.
- Marcar POS como licenciado/no licenciado.
- Bloquear uso de POS si no tiene licencia activa o la organización está suspendida.

Regla crítica:

```txt
Un POS no licenciado no debe poder operar ventas reales.
```

### 8. Pagos SaaS manuales

Para V1 se permite registro manual:

- Organización.
- Suscripción.
- Monto.
- Moneda.
- Fecha de pago.
- Método/proveedor: `manual`.
- Nota opcional.

No implementar pasarela SaaS avanzada antes del primer deploy salvo que ya exista base funcional.

### 9. Auditoría global

Auditar obligatoriamente:

- Creación/edición/suspensión de organizaciones.
- Cambio de plan/suscripción.
- Activación/desactivación/licencia de POS.
- Registro manual de pagos SaaS.
- Inicio/fin de impersonación.
- Cambios de usuarios de plataforma.

## Cambios obligatorios en frontend

### 1. Labels

Agregar:

```ts
platform_owner: "Dueño de Plataforma"
```

Eliminar cualquier label o referencia activa a:

```ts
platform_admin
```

### 2. Redirect posterior a login

Regla:

```txt
if user.roles includes platform_owner => redirect /platform
else if manager/organization_owner => redirect /manager o dashboard correspondiente
else if cashier => redirect /pos
```

`platform_owner` no debe pasar por selección de sucursal.

### 3. Layout de plataforma

Crear layout separado:

```txt
/platform
```

No mezclar con layout de gerente, owner de organización ni POS.

Navegación mínima:

```txt
Dashboard
Organizaciones
Suscripciones
POS / Licencias
Pagos SaaS
Auditoría
Soporte
```

### 4. Pantallas mínimas

#### `/platform`

Dashboard SaaS con KPIs básicos y alertas.

#### `/platform/organizations`

Listado con:

- Nombre.
- Estado.
- Plan.
- Sucursales.
- POS activos/licenciados.
- Último pago.
- Acción: ver detalle.

#### `/platform/organizations/:id`

Detalle con tabs o secciones:

- Datos generales.
- Sucursales.
- Usuarios.
- Suscripción.
- POS.
- Pagos.
- Auditoría.

#### `/platform/pos-devices`

Vista global opcional de POS:

- Organización.
- Sucursal.
- Nombre del POS.
- Estado.
- Licenciado.
- Última conexión.

#### `/platform/payments`

Listado de pagos SaaS y botón para registrar pago manual.

#### `/platform/audit`

Bitácora global filtrable por organización, usuario, acción y fecha.

## Impersonación / soporte

La impersonación debe ser opcional en V1. Si se implementa, debe cumplir:

- Solo `platform_owner` puede iniciar.
- Debe crear registro de auditoría.
- Debe mostrar visualmente que el usuario está en modo soporte.
- Debe existir acción explícita para terminar impersonación.
- No debe permitir acciones destructivas sin auditoría.

Si no se implementa antes del primer deploy, dejar botón oculto o deshabilitado. No dejar endpoint abierto sin UI o sin auditoría.

## Casos de prueba obligatorios

### Auth/RBAC

- `platform_owner` puede iniciar sesión con `organization_id = null`.
- `platform_owner` entra a `/platform`.
- `platform_owner` no requiere sucursal.
- `organization_owner` no puede acceder a `/platform`.
- `manager` no puede acceder a `/platform`.
- `cashier` no puede acceder a `/platform`.
- Usuario sin rol no puede acceder a `/platform`.

### Seed

- Existe rol `platform_owner`.
- No existe rol `platform_admin`.
- Existe usuario seed `admin@tortillaplus.mx` con `organization_id = null`.
- El usuario seed tiene rol `platform_owner`.

### Organizaciones

- Se puede crear organización desde plataforma.
- Se puede editar organización.
- Se puede suspender organización.
- Una organización suspendida no debe permitir operación normal de POS.

### Suscripciones

- Se puede asignar plan free.
- Se puede asignar plan paid.
- Se puede registrar pago manual.
- Se puede consultar estado de suscripción.

### POS/licencias

- Se puede activar/desactivar POS.
- Se puede licenciar/deslicenciar POS.
- POS no licenciado no puede operar ventas reales.
- POS de organización suspendida no puede operar ventas reales.

### Auditoría

- Cambio de plan genera log.
- Suspensión de organización genera log.
- Cambio de licencia POS genera log.
- Registro manual de pago genera log.

## Fuera de alcance para V1

No implementar en este módulo todavía:

- Equipo completo de soporte interno.
- Rol `platform_admin`.
- Matriz avanzada de permisos por usuario interno.
- Pasarela automática de cobro SaaS.
- Facturación fiscal del cobro SaaS.
- Borrado físico de organizaciones.
- Reportería financiera avanzada.

## Criterios de aceptación

El módulo se considera listo para primer deploy si:

- `platform_admin` fue eliminado de seeds, mocks, labels y navegación.
- Existe `platform_owner` funcional.
- El login redirige correctamente a `/platform`.
- Las rutas `/platform/*` están protegidas por backend.
- Se pueden administrar organizaciones.
- Se pueden administrar suscripciones básicas.
- Se pueden administrar licencias POS.
- Se pueden registrar pagos SaaS manuales.
- Los cambios críticos quedan auditados.
- Los usuarios de organización no pueden acceder al panel de plataforma.

## Nota de arquitectura

No usar `platform_owner` para operar ventas, caja o inventario. Aunque el seed actual pueda asignarle todos los permisos, las interfaces y rutas deben mantener separación de contexto:

```txt
/plataforma SaaS     => platform_owner
/operación negocio   => organization_owner / manager / supervisor / cashier
```

Esto evita que el superadmin termine mezclado con flujos operativos de tortillería y reduce riesgo de errores antes del primer despliegue.
