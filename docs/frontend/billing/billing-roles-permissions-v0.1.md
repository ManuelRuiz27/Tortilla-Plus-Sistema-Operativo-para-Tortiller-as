# Tortilla Plus — Billing Roles & Permissions V0.1

## 1. Propósito

Este documento define los roles y permisos fiscales visibles en frontend para **Tortilla Plus — V1 Operativa Comercial**.

Cubre:

```txt
roles oficiales V1
permisos POS fiscal
permisos Manager Billing UI
permisos conciliación
permisos cancelación CFDI
permisos configuración fiscal
acciones bloqueadas
reglas UI por rol
QA mínimo
```

Ubicación recomendada:

```txt
docs/frontend/billing/billing-roles-permissions-v0.1.md
```

---

## 2. Regla principal

En V1 solo existen tres roles operativos:

```txt
Cajero
Supervisor
Gerente
```

No agregar roles adicionales en el frontend V1.

No agregar:

```txt
contador
director
dueño
admin fiscal
soporte SaaS
auditor
almacén como rol fiscal
```

Si en el futuro se requieren más roles, deberán definirse en otra versión.

---

## 3. Principio de permisos

El frontend no debe inferir permisos solo por nombre de rol.

Debe consumir permisos efectivos desde backend cuando estén disponibles.

El rol sirve para diseño y control visual, pero la fuente final debe ser backend.

Ejemplo esperado:

```json
{
  "role": "supervisor",
  "permissions": [
    "pos.sale.create",
    "billing.reconciliation.view",
    "billing.reconciliation.resolve_pending_reference"
  ]
}
```

---

## 4. Roles oficiales

## 4.1 Cajero

Rol orientado a operación rápida del POS.

Responsabilidades:

```txt
cobrar ventas
generar tickets
imprimir tickets
buscar tickets recientes
operar caja
```

No debe operar tareas fiscales críticas.

---

## 4.2 Supervisor

Rol orientado a control operativo intermedio.

Responsabilidades:

```txt
apoyar al cajero
revisar incidencias operativas
resolver pending_reference
revisar conciliación
apoyar cierre de caja
```

No debe ejecutar acciones fiscales críticas como cancelar CFDI o timbrar globales.

---

## 4.3 Gerente

Rol con control fiscal completo de la operación.

Responsabilidades:

```txt
configurar facturación
confirmar globales
cancelar CFDI
resolver manual review
exportar información fiscal
consultar histórico completo
gestionar conciliación
```

---

## 5. Matriz general de permisos

| Acción | Cajero | Supervisor | Gerente |
|---|---:|---:|---:|
| Cobrar venta | Sí | Sí | Sí |
| Generar ticket simple | Sí | Sí | Sí |
| Generar ticket QR | Sí | Sí | Sí |
| Buscar ticket reciente | Sí limitado | Sí | Sí |
| Reimprimir ticket reciente | Sí limitado | Sí | Sí |
| Ver histórico completo | No | Limitado | Sí |
| Ver dashboard fiscal | No | Limitado | Sí |
| Ver facturas | No | Limitado | Sí |
| Descargar XML/PDF | No | No | Sí |
| Confirmar global diaria | No | No | Sí |
| Confirmar global rezagados | No | No | Sí |
| Resolver manual review CFDI | No | No | Sí |
| Cancelar CFDI | No | No | Sí |
| Configurar RFC/CSD | No | No | Sí |
| Ver conciliación | No | Sí | Sí |
| Resolver conciliación | No | Sí | Sí |
| Resolver pending_reference | No | Sí | Sí |
| Ignorar incidencia conciliación | No | No | Sí |
| Exportar reportes fiscales | No | No | Sí |

---

## 6. Permisos POS Fiscal

## 6.1 Cajero

Permitido:

```txt
crear venta
cobrar venta
seleccionar método de pago
capturar referencia tarjeta
generar ticket simple
generar ticket QR
buscar tickets recientes
reimprimir tickets recientes
```

Limitaciones:

```txt
misma caja
mismo turno
últimas 24 horas
```

Bloqueado:

```txt
histórico completo
cancelar CFDI
confirmar globales
manual review
configuración fiscal
conciliación
```

---

## 6.2 Supervisor en POS

Permitido:

```txt
todo lo del cajero
buscar tickets con mayor alcance operativo
ver pending_reference
resolver pending_reference si está habilitado
```

Bloqueado:

```txt
cancelar CFDI
confirmar globales
manual review fiscal
configuración fiscal
```

---

## 6.3 Gerente en POS

Permitido:

```txt
todo lo del cajero
buscar histórico completo si entra desde flujo autorizado
reimprimir histórico si aplica
```

Pero las acciones fiscales críticas no deben vivir en POS.

Acciones críticas deben redirigir a Manager:

```txt
cancelar CFDI
confirmar global
resolver manual review
configurar fiscal
```

---

## 7. Permisos Manager Billing UI

## 7.1 Cajero

El Cajero no debe tener acceso a Manager Billing UI.

Si intenta entrar:

```txt
No tienes permiso para acceder a este módulo.
```

---

## 7.2 Supervisor

Acceso limitado.

Puede ver:

```txt
dashboard fiscal limitado
conciliación
incidencias operativas
pending_reference
tickets/ventas relacionados a incidencias
```

Puede resolver:

```txt
pending_reference
match de conciliación
rechazo de match
notas operativas
```

No puede:

```txt
cancelar CFDI
confirmar global diaria
confirmar global rezagados
resolver manual review CFDI
configurar facturación
descargar XML/PDF masivo
editar datos fiscales
```

---

## 7.3 Gerente

Acceso completo a Manager Billing UI.

Puede:

```txt
ver dashboard fiscal completo
consultar facturas
descargar XML/PDF
confirmar global diaria
confirmar global rezagados
resolver manual review
cancelar CFDI
configurar RFC/CSD
validar configuración fiscal
gestionar conciliación
exportar reportes
```

---

## 8. Permisos por módulo

## 8.1 Dashboard Fiscal

| Acción | Cajero | Supervisor | Gerente |
|---|---:|---:|---:|
| Ver dashboard | No | Limitado | Sí |
| Ver cards fiscales | No | Limitado | Sí |
| Abrir facturas | No | Limitado | Sí |
| Abrir manual review | No | No | Sí |
| Abrir globales | No | No | Sí |
| Abrir conciliación | No | Sí | Sí |

---

## 8.2 Facturas

| Acción | Cajero | Supervisor | Gerente |
|---|---:|---:|---:|
| Ver lista | No | Limitado | Sí |
| Ver detalle | No | Limitado | Sí |
| Descargar PDF | No | No | Sí |
| Descargar XML | No | No | Sí |
| Cancelar CFDI | No | No | Sí |
| Ver historial de cancelación | No | No | Sí |

Supervisor puede consultar facturas solo si están relacionadas con una incidencia operativa o conciliación.

---

## 8.3 Global Diaria

| Acción | Cajero | Supervisor | Gerente |
|---|---:|---:|---:|
| Ver global diaria | No | No | Sí |
| Preparar global | No | No | Sí |
| Confirmar timbrado | No | No | Sí |
| Ver resultado | No | No | Sí |
| Descargar XML/PDF | No | No | Sí |

---

## 8.4 Global Rezagados

| Acción | Cajero | Supervisor | Gerente |
|---|---:|---:|---:|
| Ver global rezagados | No | No | Sí |
| Preparar lote | No | No | Sí |
| Confirmar timbrado | No | No | Sí |
| Ver resultado | No | No | Sí |
| Descargar XML/PDF | No | No | Sí |

---

## 8.5 Manual Review

| Acción | Cajero | Supervisor | Gerente |
|---|---:|---:|---:|
| Ver casos | No | No | Sí |
| Ver detalle | No | No | Sí |
| Editar correo | No | No | Sí |
| Editar uso CFDI | No | No | Sí |
| Editar CP | No | No | Sí |
| Reintentar | No | No | Sí |
| Cerrar caso | No | No | Sí |

Campos no editables para todos:

```txt
RFC
razón social
```

---

## 8.6 Cancelaciones CFDI

| Acción | Cajero | Supervisor | Gerente |
|---|---:|---:|---:|
| Ver módulo | No | No | Sí |
| Iniciar cancelación | No | No | Sí |
| Elegir motivo SAT | No | No | Sí |
| Capturar motivo interno | No | No | Sí |
| Capturar evidence URL | No | No | Sí |
| Confirmar cancelación | No | No | Sí |
| Ver estado cancelación | No | No | Sí |

---

## 8.7 Conciliación

| Acción | Cajero | Supervisor | Gerente |
|---|---:|---:|---:|
| Ver conciliación | No | Sí | Sí |
| Subir CSV/XLSX | No | Sí | Sí |
| Ver movimientos | No | Sí | Sí |
| Ver candidatos POS | No | Sí | Sí |
| Confirmar match | No | Sí | Sí |
| Rechazar match | No | Sí | Sí |
| Resolver pending_reference | No | Sí | Sí |
| Agregar nota | No | Sí | Sí |
| Ignorar incidencia | No | No | Sí |
| Reprocesar import | No | No | Sí |
| Vista corporativa | No | Limitado | Sí |

---

## 8.8 Configuración Fiscal

| Acción | Cajero | Supervisor | Gerente |
|---|---:|---:|---:|
| Ver configuración | No | No | Sí |
| Editar RFC | No | No | Sí |
| Editar razón social | No | No | Sí |
| Cargar CSD | No | No | Sí |
| Validar configuración | No | No | Sí |
| Activar facturación | No | No | Sí |
| Ver estado provider | No | No | Sí |

---

## 8.9 Exportaciones

| Acción | Cajero | Supervisor | Gerente |
|---|---:|---:|---:|
| Ver exportaciones | No | No | Sí |
| Exportar facturas | No | No | Sí |
| Exportar XML | No | No | Sí |
| Exportar globales | No | No | Sí |
| Exportar conciliación | No | No | Sí |
| Exportar ventas fiscales | No | No | Sí |

---

## 9. Permisos técnicos sugeridos

Los permisos pueden modelarse como strings.

### 9.1 POS

```txt
pos.sale.create
pos.sale.complete
pos.ticket.search_recent
pos.ticket.reprint_recent
pos.ticket.search_historical
```

### 9.2 Billing manager

```txt
billing.dashboard.view
billing.invoice.view
billing.invoice.download_pdf
billing.invoice.download_xml
billing.global_daily.view
billing.global_daily.confirm
billing.global_pending.view
billing.global_pending.confirm
billing.manual_review.view
billing.manual_review.resolve
billing.invoice.cancel
billing.settings.view
billing.settings.update
billing.settings.validate
billing.exports.run
```

### 9.3 Reconciliation

```txt
billing.reconciliation.view
billing.reconciliation.upload
billing.reconciliation.match.confirm
billing.reconciliation.match.reject
billing.reconciliation.pending_reference.resolve
billing.reconciliation.incident.ignore
billing.reconciliation.import.reprocess
billing.reconciliation.corporate_view
```

---

## 10. UI por permisos

### 10.1 No mostrar acciones no permitidas

Si una acción no está permitida, preferir ocultarla.

Ejemplo:

```txt
Cajero no ve botón Cancelar CFDI.
```

---

### 10.2 Mostrar disabled solo cuando sea educativo

Usar disabled si conviene explicar.

Ejemplo:

```txt
Confirmar global deshabilitado porque aún no hay lote preparado.
```

---

### 10.3 Backend siempre valida

Aunque el frontend oculte botones, backend debe rechazar acciones no permitidas.

El frontend no sustituye RBAC backend.

---

## 11. Mensajes de permisos

Mensaje general:

```txt
No tienes permiso para esta acción.
```

Mensaje para módulo:

```txt
No tienes acceso a este módulo.
```

Mensaje para acción fiscal crítica:

```txt
Esta acción requiere permisos de gerente.
```

---

## 12. Auditoría por rol

Acciones auditadas siempre:

```txt
confirmar global diaria
confirmar global rezagados
cancelar CFDI
resolver manual review
editar configuración fiscal
validar configuración fiscal
subir archivo conciliación
confirmar match
ignorar incidencia
resolver pending_reference
reimprimir ticket QR
```

Datos mínimos:

```txt
usuario
rol
fecha/hora
acción
entidad
valor anterior
valor nuevo
sucursal
caja si aplica
```

---

## 13. Reglas de escalamiento

### 13.1 Cajero → Supervisor

Casos:

```txt
pending_reference
problema de ticket reciente
incidencia de conciliación operativa
```

### 13.2 Supervisor → Gerente

Casos:

```txt
cancelación CFDI
manual review CFDI
global diaria
global rezagados
configuración fiscal
ignorar incidencia
exportaciones fiscales
```

---

## 14. Estados de acceso

El frontend debe contemplar:

```txt
allowed
denied
limited
requires_manager
requires_supervisor_or_manager
```

Ejemplo:

```json
{
  "module": "billing.reconciliation",
  "access": "limited",
  "allowedActions": [
    "view",
    "confirm_match",
    "resolve_pending_reference"
  ]
}
```

---

## 15. Rutas protegidas

### 15.1 POS

```txt
/pos
/pos/tickets/search
```

### 15.2 Manager Billing

```txt
/manager/billing
/manager/billing/invoices
/manager/billing/global-daily
/manager/billing/global-pending
/manager/billing/manual-review
/manager/billing/cancellations
/manager/billing/reconciliation
/manager/billing/exports
/manager/billing/settings
```

### 15.3 Portal público

El portal público no usa estos roles.

Ruta:

```txt
/r/{receipt_token}
```

---

## 16. Módulos visibles por rol

### 16.1 Cajero

```txt
POS
Búsqueda rápida de tickets
```

### 16.2 Supervisor

```txt
POS
Conciliación
Incidencias
Tickets limitados
```

### 16.3 Gerente

```txt
POS
Manager Billing
Conciliación
Configuración Fiscal
Exportaciones
```

---

## 17. No implementar en V1

No incluir:

```txt
roles personalizados
permisos configurables desde UI
contador
dueño
director
soporte SaaS como rol dentro de la tortillería
aprobación multinivel
firma digital de autorizaciones
```

---

## 18. QA mínimo roles/permisos

```txt
[ ] Cajero puede cobrar venta.
[ ] Cajero puede generar ticket QR.
[ ] Cajero no accede a Manager Billing.
[ ] Cajero no ve cancelar CFDI.
[ ] Cajero solo busca tickets recientes.
[ ] Supervisor puede ver conciliación.
[ ] Supervisor puede resolver pending_reference.
[ ] Supervisor no puede cancelar CFDI.
[ ] Supervisor no puede confirmar global diaria.
[ ] Supervisor no puede configurar fiscal.
[ ] Gerente puede ver Manager Billing completo.
[ ] Gerente puede confirmar global diaria.
[ ] Gerente puede confirmar global rezagados.
[ ] Gerente puede cancelar CFDI.
[ ] Gerente puede configurar RFC/CSD.
[ ] Gerente puede exportar reportes fiscales.
[ ] Backend rechaza acciones no permitidas aunque frontend falle.
```

---

## 19. Definition of Done

```txt
[ ] Roles V1 definidos.
[ ] Permisos POS definidos.
[ ] Permisos Manager definidos.
[ ] Permisos conciliación definidos.
[ ] Permisos configuración fiscal definidos.
[ ] Permisos exportación definidos.
[ ] Reglas UI por permiso definidas.
[ ] Rutas protegidas definidas.
[ ] QA mínimo definido.
```

---

## 20. Siguiente documento

Después de este documento, generar:

```txt
billing-ticket-templates-v0.1.md
```
