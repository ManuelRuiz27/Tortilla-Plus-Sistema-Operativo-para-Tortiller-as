# Tortilla Plus — Billing API Conventions V0.1

## 1. Propósito

Este documento define las convenciones de API para el módulo fiscal de **Tortilla Plus — V1 Operativa Comercial**.

Aplica a:

```txt
billing-openapi-v0.1.yaml
backend billing
frontend billing
packages/api-contracts
QA de integración
```

Ubicación recomendada:

```txt
docs/contracts/billing-api-conventions-v0.1.md
```

---

## 2. Principio general

La API debe ser consistente, explícita y segura.

Reglas base:

```txt
estados explícitos
errores operativos
permisos validados en backend
montos seguros
fechas con zona horaria
idempotencia en acciones críticas
paginación estándar
filtros predecibles
```

---

## 3. Base URL

Ambientes recomendados:

```txt
Producción:
https://api.tortillaplus.mx

Staging:
https://staging-api.tortillaplus.mx

Local:
http://localhost:3000
```

---

## 4. Versionado

Para V1 inicial, la versión puede mantenerse en documentación/OpenAPI.

No es obligatorio iniciar con `/v1` en rutas si el monorepo aún está en MVP.

Opciones válidas:

```txt
/api/...
/v1/...
```

Recomendación para producción:

```txt
/v1/...
```

Ejemplo:

```txt
/v1/manager/billing/invoices
```

Si se decide no usar `/v1` inicialmente, debe quedar documentado en `docs/architecture/`.

---

## 5. Autenticación

Las rutas internas usan JWT Bearer.

Header:

```txt
Authorization: Bearer {token}
```

Aplica a:

```txt
POS
Manager Billing
Conciliación
Exportaciones
Configuración Fiscal
```

No aplica a:

```txt
portal público de autofactura por token QR
descargas públicas autorizadas por token
```

---

## 6. Autorización

El backend es la fuente de verdad de permisos.

El frontend puede ocultar botones, pero backend debe validar cada acción.

Roles V1:

```txt
cashier
supervisor
manager
```

No agregar roles extra en V1.

---

## 7. Permisos efectivos

Cuando el frontend necesite armar navegación o acciones debe consumir:

```txt
GET /me/permissions
GET /manager/billing/permissions
```

Las respuestas deben incluir:

```txt
role
permissions
modules
allowedActions
```

---

## 8. Formato estándar de respuesta

Para recursos individuales:

```json
{
  "data": {}
}
```

Para listas paginadas:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 25,
    "total": 100,
    "totalPages": 4
  }
}
```

No mezclar nombres como:

```txt
items
results
rows
records
```

Usar siempre:

```txt
data
```

---

## 9. Formato estándar de error

Formato obligatorio:

```json
{
  "statusCode": 422,
  "error": "VALIDATION_ERROR",
  "message": "Revisa los campos enviados.",
  "details": [
    {
      "field": "rfc",
      "message": "RFC inválido.",
      "code": "INVALID_RFC"
    }
  ]
}
```

Campos:

```txt
statusCode
error
message
details
```

`details` puede omitirse si no aplica.

---

## 10. Mensajes de error

Los mensajes deben ser operativos.

Incorrecto:

```txt
Provider 500 internal server error
```

Correcto:

```txt
No se pudo conectar con el servicio de facturación.
Intenta de nuevo más tarde.
```

No exponer:

```txt
stack traces
API keys
certificados
payloads completos del provider
errores crudos del PAC
```

---

## 11. Códigos HTTP

Usar códigos de forma consistente.

```txt
200 OK:
consulta exitosa o acción completada

201 Created:
recurso creado

202 Accepted:
acción aceptada y en proceso

400 Bad Request:
solicitud inválida general

401 Unauthorized:
no autenticado

403 Forbidden:
sin permiso

404 Not Found:
recurso no existe o no visible

409 Conflict:
conflicto de estado

410 Gone:
recurso vencido

422 Unprocessable Entity:
validación de campos

429 Too Many Requests:
rate limit

500 Internal Server Error:
error inesperado
```

---

## 12. Idempotencia

Las acciones críticas deben aceptar:

```txt
Idempotency-Key
```

Aplica a:

```txt
completar venta
reimprimir ticket
solicitar autofactura
confirmar global diaria
confirmar global rezagados
cancelar CFDI
confirmar match conciliación
crear exportación
validar configuración fiscal
activar configuración fiscal
```

Regla:

```txt
misma Idempotency-Key + mismo usuario + misma operación
debe regresar el mismo resultado lógico
```

No usar idempotencia para simples consultas GET.

---

## 13. Fechas y zona horaria

Todas las fechas con hora deben usar ISO 8601.

Ejemplo:

```txt
2026-05-24T10:35:00-06:00
```

Fechas de negocio sin hora:

```txt
2026-05-24
```

Mes fiscal:

```txt
2026-05
```

Zona operativa por defecto:

```txt
America/Monterrey
```

El backend debe ser explícito cuando una fecha sea:

```txt
fecha de venta
fecha de negocio
fecha de timbrado
fecha de vencimiento QR
fecha de creación
fecha de actualización
```

---

## 14. Dinero

Los montos deben viajar como string decimal.

Correcto:

```json
{
  "total": "86.00",
  "currency": "MXN"
}
```

Incorrecto:

```json
{
  "total": 86.0
}
```

Motivo:

```txt
evitar errores de coma flotante
mantener precisión fiscal
```

Moneda V1:

```txt
MXN
```

---

## 15. IDs

Los IDs deben ser strings.

Ejemplos:

```txt
saleId
invoiceId
receiptId
batchId
caseId
importId
movementId
matchId
incidentId
exportJobId
branchId
```

No exponer IDs internos secuenciales si no es necesario.

El folio visible puede ser secuencial y amigable:

```txt
TP-000124
```

---

## 16. Nombres de campos

Usar camelCase en JSON.

Correcto:

```json
{
  "saleId": "sale_123",
  "fiscalStatus": "pending_customer_invoice"
}
```

Incorrecto:

```json
{
  "sale_id": "sale_123",
  "fiscal_status": "pending_customer_invoice"
}
```

La base de datos puede usar snake_case, pero API debe usar camelCase.

---

## 17. Enums

Los enums deben estar en snake_case.

Ejemplos:

```txt
pending_customer_invoice
requires_manual_review
global_pending_period
cancel_processing
pending_reference
```

No usar espacios ni mayúsculas en enums.

---

## 18. Paginación

Parámetros estándar:

```txt
page
pageSize
```

Defaults:

```txt
page = 1
pageSize = 25
```

Máximo recomendado:

```txt
pageSize = 100
```

Respuesta:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 25,
    "total": 100,
    "totalPages": 4
  }
}
```

---

## 19. Ordenamiento

Convención recomendada:

```txt
sortBy
sortDirection
```

Ejemplo:

```txt
?sortBy=createdAt&sortDirection=desc
```

Valores permitidos:

```txt
asc
desc
```

El backend debe validar `sortBy`.

No permitir ordenar por cualquier campo arbitrario sin whitelist.

---

## 20. Filtros

Los filtros deben ser query params en GET.

Ejemplo:

```txt
GET /manager/billing/invoices?startDate=2026-05-01&endDate=2026-05-31&status=stamped
```

Filtros de fecha:

```txt
startDate
endDate
```

Filtros comunes:

```txt
branchId
status
type
provider
rfc
folio
uuid
```

---

## 21. Rangos de fecha

Regla:

```txt
startDate <= endDate
```

Para exportaciones V1:

```txt
rango máximo recomendado = 31 días
```

Rangos mayores requieren autorización backend/configuración futura.

---

## 22. Estados explícitos

No inferir estados por campos nulos.

Correcto:

```json
{
  "receiptStatus": "expired",
  "canInvoice": false
}
```

Incorrecto:

```json
{
  "deadline": "2026-05-31T23:59:59-06:00",
  "invoiceId": null
}
```

El frontend no debe deducir vencimiento solo calculando fechas.

---

## 23. Acciones disponibles

Cuando un recurso tenga acciones condicionadas, backend debe devolver:

```txt
availableActions
```

Ejemplo:

```json
{
  "invoiceId": "invoice_123",
  "status": "stamped",
  "availableActions": [
    "download_pdf",
    "download_xml",
    "cancel"
  ]
}
```

Frontend debe usar `availableActions` para mostrar acciones.

---

## 24. Warnings

Cuando una operación se completa con advertencias, usar arreglo `warnings`.

Ejemplo:

```json
{
  "data": {},
  "warnings": [
    {
      "code": "PENDING_REFERENCE",
      "message": "Venta registrada sin referencia. Quedará pendiente de conciliación."
    }
  ]
}
```

Warnings no son errores.

---

## 25. Rate limit

El portal público debe manejar:

```txt
429 Too Many Requests
```

Formato:

```json
{
  "statusCode": 429,
  "error": "RATE_LIMITED",
  "message": "Demasiados intentos. Espera unos minutos antes de volver a intentar."
}
```

Si aplica, backend puede incluir:

```txt
Retry-After
```

---

## 26. Polling

Las operaciones asincrónicas deben retornar:

```txt
202 Accepted
```

Con estado actual.

Ejemplos:

```txt
solicitar autofactura
confirmar global
validar configuración fiscal
crear exportación
```

Frontend puede hacer polling a endpoint de status.

No usar polling agresivo.

Backoff recomendado:

```txt
2s
5s
10s
20s
```

---

## 27. Descarga de archivos

Archivos descargables:

```txt
PDF factura
XML factura
ZIP XML
CSV
XLSX
```

Los endpoints de descarga deben responder con:

```txt
Content-Type correcto
Content-Disposition con filename
```

Ejemplo:

```txt
Content-Disposition: attachment; filename="tortilla-plus_xml_2026-05.zip"
```

---

## 28. Expiración de exports

Las exportaciones pueden expirar.

Si expiró:

```txt
410 Gone
```

Error:

```json
{
  "statusCode": 410,
  "error": "EXPORT_EXPIRED",
  "message": "Este archivo ya expiró. Genera una nueva exportación."
}
```

---

## 29. Portal público

Las rutas públicas no requieren JWT.

Pero deben validarse por token seguro.

Rutas públicas:

```txt
GET /public/billing/receipts/{token}
POST /public/billing/receipts/{token}/invoice
GET /public/billing/receipts/{token}/invoice-status
GET /public/billing/invoices/{invoiceId}/pdf
GET /public/billing/invoices/{invoiceId}/xml
```

No exponer datos de otros tickets.

---

## 30. Seguridad de portal público

El token debe ser opaco.

No debe contener:

```txt
RFC
datos fiscales
monto editable
datos bancarios
IDs internos sensibles
```

El frontend no debe decodificar lógica del token.

---

## 31. Uploads

Carga de conciliación usa:

```txt
multipart/form-data
```

Campos:

```txt
branchId
provider
period
notes
file
```

Extensiones V1:

```txt
.csv
.xlsx
```

Tamaño máximo debe ser definido por backend.

---

## 32. Evidencia de cancelación

V1 no sube archivos de evidencia.

Solo se guarda:

```txt
evidenceUrl
```

Debe ser URL válida.

---

## 33. Configuración fiscal

El frontend nunca debe recibir ni mostrar:

```txt
private key
password de CSD
certificado completo si no es necesario
secretos provider
```

Solo estado:

```txt
certificado cargado
vigencia
última validación
checklist
```

---

## 34. Auditoría

La auditoría no necesariamente debe exponerse en todos los endpoints V1.

Pero acciones críticas deben registrarla internamente.

Acciones auditadas:

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
descargar exportación
```

---

## 35. Campos de auditoría mínimos

```txt
userId
role
action
entityType
entityId
before
after
branchId
registerId
createdAt
```

---

## 36. Códigos de error recomendados

```txt
VALIDATION_ERROR
UNAUTHORIZED
FORBIDDEN
NOT_FOUND
CONFLICT
RATE_LIMITED
RECEIPT_EXPIRED
RECEIPT_ALREADY_INVOICED
INVOICE_NOT_CANCELLABLE
GLOBAL_BATCH_NOT_READY
MANUAL_REVIEW_REQUIRED
PROVIDER_UNAVAILABLE
EXPORT_EXPIRED
INVALID_FILE_FORMAT
RECONCILIATION_MATCH_CONFLICT
FISCAL_CONFIG_INCOMPLETE
```

---

## 37. Conflictos de estado

Usar `409 Conflict` cuando una acción no sea válida por estado actual.

Ejemplos:

```txt
intentar facturar ticket ya facturado
confirmar global ya timbrada
cancelar CFDI ya cancelado
confirmar match ya resuelto
activar configuración fiscal incompleta
```

---

## 38. Validaciones

Usar `422 Unprocessable Entity` cuando los campos sean inválidos.

Ejemplos:

```txt
RFC inválido
correo inválido
CP inválido
motivo SAT faltante
rango de fechas inválido
archivo faltante
```

---

## 39. Not found vs forbidden

Si un usuario no tiene acceso a una entidad de otra organización/sucursal, puede responder:

```txt
404
```

para no revelar existencia.

Si el usuario sí ve la entidad pero no tiene permiso para acción:

```txt
403
```

---

## 40. Campos nullable

Usar `nullable: true` solo cuando el campo pueda existir vacío por regla de negocio.

Ejemplos válidos:

```txt
reference en tarjeta sin referencia
invoiceId antes de timbrado
evidenceUrl opcional
```

No usar null donde debería haber string vacío o campo ausente.

---

## 41. Compatibilidad con clientes generados

El OpenAPI debe ser apto para generar cliente TypeScript.

Evitar:

```txt
schemas ambiguos
any
oneOf excesivo
polimorfismo innecesario
campos sin tipo
```

---

## 42. Naming de operationId

Usar verbos claros:

```txt
getBillingDashboard
listBillingInvoices
getBillingInvoice
cancelBillingInvoice
prepareDailyGlobal
confirmDailyGlobal
requestPublicInvoice
getPublicInvoiceStatus
```

No usar operationIds genéricos como:

```txt
getData
process
handle
```

---

## 43. Checklist de cumplimiento

```txt
[ ] Todas las rutas internas usan JWT.
[ ] Rutas públicas no exponen datos sensibles.
[ ] Todas las listas usan paginación estándar.
[ ] Errores usan formato estándar.
[ ] Dinero viaja como string decimal.
[ ] Fechas usan ISO 8601.
[ ] Estados son enums explícitos.
[ ] Acciones críticas soportan Idempotency-Key.
[ ] Exportaciones son asincrónicas.
[ ] Descargas tienen Content-Disposition.
[ ] Backend valida permisos aunque frontend oculte botones.
```

---

## 44. Relación con otros contratos

OpenAPI:

```txt
docs/contracts/billing-openapi-v0.1.yaml
```

DTO catalog:

```txt
docs/contracts/billing-dto-catalog-v0.1.md
```

Error catalog:

```txt
docs/contracts/billing-error-catalog-v0.1.md
```

Events contract:

```txt
docs/contracts/billing-events-contract-v0.1.md
```

---

## 45. Siguiente documento

Después de este documento, generar:

```txt
billing-dto-catalog-v0.1.md
```
