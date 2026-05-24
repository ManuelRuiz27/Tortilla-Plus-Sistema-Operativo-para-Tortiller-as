# Tortilla Plus — Billing Error Catalog V0.1

## 1. Propósito

Este documento define el catálogo de errores del módulo fiscal de **Tortilla Plus — V1 Operativa Comercial**.

Debe servir como referencia para:

```txt
backend
frontend
OpenAPI
QA
observabilidad
soporte operativo
```

Ubicación recomendada:

```txt
docs/contracts/billing-error-catalog-v0.1.md
```

---

## 2. Principio general

Los errores deben ser:

```txt
predecibles
operativos
seguros
accionables
consistentes
```

No deben exponer:

```txt
stack traces
payloads crudos del provider fiscal
API keys
certificados
llaves privadas
datos bancarios sensibles
errores internos no sanitizados
```

---

## 3. Formato estándar de error

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

`details` es opcional.

---

## 4. Códigos HTTP oficiales

```txt
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
410 Gone
422 Unprocessable Entity
429 Too Many Requests
500 Internal Server Error
502 Bad Gateway
503 Service Unavailable
```

---

## 5. Criterio de uso por HTTP code

## 5.1 400 Bad Request

Usar cuando la solicitud esté mal formada o sea inválida de forma general.

Ejemplo:

```txt
JSON inválido
parámetros incompatibles
payload incompleto no específico
```

---

## 5.2 401 Unauthorized

Usar cuando no hay autenticación válida.

Ejemplo:

```txt
token ausente
token expirado
token inválido
```

---

## 5.3 403 Forbidden

Usar cuando el usuario sí está autenticado, pero no tiene permiso.

Ejemplo:

```txt
Cajero intenta entrar a Manager Billing
Supervisor intenta cancelar CFDI
Cajero intenta exportar XML
```

---

## 5.4 404 Not Found

Usar cuando el recurso no existe o no debe revelarse.

Ejemplo:

```txt
factura no encontrada
ticket no encontrado
export no encontrado
recurso de otra sucursal no visible
```

---

## 5.5 409 Conflict

Usar cuando la acción no es válida por estado actual del recurso.

Ejemplo:

```txt
facturar ticket ya facturado
cancelar factura ya cancelada
confirmar global ya timbrada
confirmar match ya resuelto
activar fiscal config incompleta
```

---

## 5.6 410 Gone

Usar cuando el recurso existía pero ya expiró.

Ejemplo:

```txt
QR vencido
archivo exportado expirado
token público vencido
```

---

## 5.7 422 Unprocessable Entity

Usar cuando hay validaciones de campos.

Ejemplo:

```txt
RFC inválido
CP inválido
correo inválido
motivo SAT faltante
archivo CSV inválido
```

---

## 5.8 429 Too Many Requests

Usar cuando se exceden límites de intentos.

Ejemplo:

```txt
demasiados intentos de autofactura
polling abusivo
reintentos manuales excesivos
```

---

## 5.9 500 Internal Server Error

Usar solo para error inesperado no controlado.

El mensaje debe ser genérico.

---

## 5.10 502 Bad Gateway

Usar cuando el provider externo responde inválido o falla de forma no recuperable inmediata.

Ejemplo:

```txt
Facturapi responde error inválido
provider fiscal devuelve payload no esperado
```

---

## 5.11 503 Service Unavailable

Usar cuando un servicio externo está temporalmente no disponible.

Ejemplo:

```txt
provider fiscal caído
servicio de timbrado no disponible
storage temporalmente no disponible
```

---

# 6. Catálogo general de errores

## 6.1 AUTH_REQUIRED

```txt
HTTP: 401
Mensaje: Inicia sesión para continuar.
```

Uso:

```txt
rutas internas sin token
```

---

## 6.2 TOKEN_EXPIRED

```txt
HTTP: 401
Mensaje: Tu sesión expiró. Inicia sesión nuevamente.
```

Uso:

```txt
JWT expirado
```

---

## 6.3 FORBIDDEN

```txt
HTTP: 403
Mensaje: No tienes permiso para esta acción.
```

Uso:

```txt
acción no permitida por rol/permisos
```

---

## 6.4 MODULE_ACCESS_DENIED

```txt
HTTP: 403
Mensaje: No tienes acceso a este módulo.
```

Uso:

```txt
Cajero intenta entrar a Manager Billing
```

---

## 6.5 VALIDATION_ERROR

```txt
HTTP: 422
Mensaje: Revisa los campos enviados.
```

Uso:

```txt
validaciones de formulario
```

---

## 6.6 NOT_FOUND

```txt
HTTP: 404
Mensaje: No encontramos el recurso solicitado.
```

Uso:

```txt
recurso inexistente o no visible
```

---

## 6.7 CONFLICT

```txt
HTTP: 409
Mensaje: La acción no puede completarse en el estado actual.
```

Uso:

```txt
conflictos genéricos de estado
```

---

## 6.8 RATE_LIMITED

```txt
HTTP: 429
Mensaje: Demasiados intentos. Espera unos minutos antes de volver a intentar.
```

Uso:

```txt
autofactura
polling
acciones repetidas
```

---

## 6.9 INTERNAL_ERROR

```txt
HTTP: 500
Mensaje: Ocurrió un error inesperado.
```

Uso:

```txt
error no controlado
```

---

# 7. Errores POS / Sales

## 7.1 SALE_NOT_FOUND

```txt
HTTP: 404
Mensaje: No encontramos esta venta.
```

Uso:

```txt
buscar/imprimir/reimprimir venta inexistente
```

---

## 7.2 SALE_ALREADY_COMPLETED

```txt
HTTP: 409
Mensaje: Esta venta ya fue completada.
```

Uso:

```txt
intentar completar venta dos veces sin idempotencia válida
```

---

## 7.3 SALE_ALREADY_CANCELLED

```txt
HTTP: 409
Mensaje: Esta venta ya fue cancelada.
```

Uso:

```txt
intentar operar venta cancelada
```

---

## 7.4 SALE_PAYMENT_REQUIRED

```txt
HTTP: 422
Mensaje: Agrega al menos un método de pago.
```

Uso:

```txt
complete sale sin payments
```

---

## 7.5 SALE_PAYMENT_TOTAL_MISMATCH

```txt
HTTP: 422
Mensaje: El total de pagos no coincide con el total de la venta.
```

Uso:

```txt
pagos incompletos o excedidos
```

---

## 7.6 CARD_REFERENCE_MISSING

```txt
HTTP: 200 con warning o 422 según configuración
Mensaje: La venta con tarjeta no tiene referencia.
```

Uso:

```txt
tarjeta sin referencia
```

Regla V1:

```txt
no bloquear venta
generar warning e incidencia pending_reference
```

---

## 7.7 PRINT_PAYLOAD_NOT_AVAILABLE

```txt
HTTP: 409
Mensaje: El ticket no está disponible para impresión.
```

Uso:

```txt
estado de venta no imprimible
```

---

## 7.8 REPRINT_NOT_ALLOWED

```txt
HTTP: 403 o 409
Mensaje: No se puede reimprimir este ticket.
```

Uso:

```txt
cajero fuera de turno/caja/rango permitido
ticket no reimprimible por estado
```

---

# 8. Errores Public Billing / Portal Autofactura

## 8.1 RECEIPT_NOT_FOUND

```txt
HTTP: 404
Mensaje: No encontramos este ticket.
```

Uso:

```txt
token inexistente o inválido
```

---

## 8.2 RECEIPT_EXPIRED

```txt
HTTP: 410
Mensaje: Este ticket ya no puede autofacturarse automáticamente.
```

Uso:

```txt
QR fuera de vigencia
```

Frontend debe mostrar:

```txt
fecha límite
fecha actual
contacto del negocio
```

---

## 8.3 RECEIPT_ALREADY_INVOICED

```txt
HTTP: 409
Mensaje: Este ticket ya fue facturado.
```

Uso:

```txt
cliente intenta facturar ticket ya usado
```

Frontend debe mostrar descargas si están disponibles.

---

## 8.4 RECEIPT_CANCELLED

```txt
HTTP: 410
Mensaje: Este ticket ya no está disponible.
```

Uso:

```txt
venta cancelada o receipt cancelado
```

---

## 8.5 RECEIPT_NOT_INVOICEABLE

```txt
HTTP: 409
Mensaje: Este ticket no está disponible para autofactura.
```

Uso:

```txt
estado fiscal no permite autofactura
```

---

## 8.6 INVALID_RFC

```txt
HTTP: 422
Mensaje: RFC inválido.
Campo: rfc
```

Uso:

```txt
RFC mal formado
```

---

## 8.7 INVALID_POSTAL_CODE

```txt
HTTP: 422
Mensaje: El código postal debe tener 5 dígitos.
Campo: postalCode
```

---

## 8.8 INVALID_EMAIL

```txt
HTTP: 422
Mensaje: Ingresa un correo válido.
Campo: email
```

---

## 8.9 INVALID_TAX_REGIME

```txt
HTTP: 422
Mensaje: Selecciona un régimen fiscal válido.
Campo: taxRegime
```

---

## 8.10 INVALID_CFDI_USE

```txt
HTTP: 422
Mensaje: Selecciona un uso CFDI válido.
Campo: cfdiUse
```

---

## 8.11 PUBLIC_INVOICE_RATE_LIMITED

```txt
HTTP: 429
Mensaje: Demasiados intentos. Espera unos minutos antes de volver a intentar.
```

Uso:

```txt
autofactura pública con intentos excesivos
```

---

## 8.12 PUBLIC_INVOICE_PROCESSING

```txt
HTTP: 202
Mensaje: Estamos generando tu factura.
```

Uso:

```txt
timbrado asíncrono en proceso
```

No es error; es estado.

---

# 9. Errores Provider Fiscal

## 9.1 PROVIDER_UNAVAILABLE

```txt
HTTP: 503
Mensaje: El servicio de facturación no está disponible. Intentaremos procesarlo nuevamente.
```

Uso:

```txt
Facturapi no disponible
timeout provider
```

---

## 9.2 PROVIDER_TIMEOUT

```txt
HTTP: 503
Mensaje: El servicio de facturación tardó demasiado en responder.
```

Uso:

```txt
timeout
```

---

## 9.3 PROVIDER_BAD_RESPONSE

```txt
HTTP: 502
Mensaje: El servicio de facturación respondió de forma inesperada.
```

Uso:

```txt
respuesta inválida del provider
```

---

## 9.4 PROVIDER_REJECTED_DATA

```txt
HTTP: 422
Mensaje: El servicio de facturación rechazó los datos fiscales.
```

Uso:

```txt
datos fiscales rechazados por provider
```

Debe mapear campos si es posible.

---

## 9.5 PROVIDER_AUTH_FAILED

```txt
HTTP: 503
Mensaje: No se pudo autenticar con el proveedor fiscal.
```

Uso:

```txt
credenciales provider inválidas o expiradas
```

No mostrar detalles internos.

---

## 9.6 PROVIDER_RATE_LIMITED

```txt
HTTP: 503
Mensaje: El servicio de facturación está saturado. Intentaremos más tarde.
```

Uso:

```txt
rate limit provider
```

---

# 10. Errores Invoice / CFDI

## 10.1 INVOICE_NOT_FOUND

```txt
HTTP: 404
Mensaje: No encontramos esta factura.
```

---

## 10.2 INVOICE_ALREADY_STAMPED

```txt
HTTP: 409
Mensaje: Esta factura ya fue timbrada.
```

---

## 10.3 INVOICE_NOT_STAMPED

```txt
HTTP: 409
Mensaje: Esta factura aún no ha sido timbrada.
```

Uso:

```txt
descargar XML antes de timbrado
```

---

## 10.4 INVOICE_NOT_CANCELLABLE

```txt
HTTP: 409
Mensaje: Esta factura no puede cancelarse en su estado actual.
```

---

## 10.5 INVOICE_ALREADY_CANCELLED

```txt
HTTP: 409
Mensaje: Esta factura ya fue cancelada.
```

---

## 10.6 INVOICE_CANCEL_REASON_REQUIRED

```txt
HTTP: 422
Mensaje: Selecciona un motivo SAT para cancelar.
Campo: satReason
```

---

## 10.7 INVOICE_INTERNAL_REASON_REQUIRED

```txt
HTTP: 422
Mensaje: Captura el motivo interno de cancelación.
Campo: internalReason
```

---

## 10.8 INVALID_EVIDENCE_URL

```txt
HTTP: 422
Mensaje: El enlace de evidencia no es válido.
Campo: evidenceUrl
```

---

## 10.9 INVOICE_XML_NOT_AVAILABLE

```txt
HTTP: 404 o 409
Mensaje: El XML no está disponible.
```

---

## 10.10 INVOICE_PDF_GENERATION_FAILED

```txt
HTTP: 503
Mensaje: No se pudo generar el PDF. Intenta de nuevo más tarde.
```

---

# 11. Errores Global Invoices

## 11.1 GLOBAL_BATCH_NOT_FOUND

```txt
HTTP: 404
Mensaje: No encontramos este lote global.
```

---

## 11.2 GLOBAL_BATCH_NOT_READY

```txt
HTTP: 409
Mensaje: La global aún no está lista para confirmarse.
```

---

## 11.3 GLOBAL_BATCH_ALREADY_CONFIRMED

```txt
HTTP: 409
Mensaje: Esta global ya fue confirmada.
```

---

## 11.4 GLOBAL_BATCH_ALREADY_STAMPED

```txt
HTTP: 409
Mensaje: Esta global ya fue timbrada.
```

---

## 11.5 GLOBAL_BATCH_EMPTY

```txt
HTTP: 409
Mensaje: No hay ventas disponibles para generar esta global.
```

---

## 11.6 GLOBAL_BATCH_HAS_WARNINGS

```txt
HTTP: 409 o 200 con warnings
Mensaje: La global tiene advertencias pendientes de revisión.
```

Regla:

```txt
si warnings son bloqueantes, usar 409
si warnings son informativos, usar 200 con warnings
```

---

## 11.7 GLOBAL_CONFIRMATION_REQUIRED

```txt
HTTP: 422
Mensaje: Confirma que revisaste la global antes de timbrar.
```

Uso opcional si se requiere checkbox o bandera explícita.

---

# 12. Errores Manual Review

## 12.1 MANUAL_REVIEW_NOT_FOUND

```txt
HTTP: 404
Mensaje: No encontramos este caso de revisión.
```

---

## 12.2 MANUAL_REVIEW_REQUIRED

```txt
HTTP: 409
Mensaje: Esta solicitud requiere revisión manual.
```

---

## 12.3 MANUAL_REVIEW_ALREADY_RESOLVED

```txt
HTTP: 409
Mensaje: Este caso ya fue resuelto.
```

---

## 12.4 MANUAL_REVIEW_FIELD_NOT_EDITABLE

```txt
HTTP: 422
Mensaje: Este campo no puede editarse desde revisión manual.
```

Uso:

```txt
intento de editar RFC o razón social
```

---

## 12.5 MANUAL_REVIEW_RETRY_LIMIT_REACHED

```txt
HTTP: 409
Mensaje: Se alcanzó el máximo de reintentos.
```

---

## 12.6 MANUAL_REVIEW_RETRY_IN_PROGRESS

```txt
HTTP: 409
Mensaje: Ya hay un reintento en proceso.
```

---

# 13. Errores Reconciliation

## 13.1 RECONCILIATION_IMPORT_NOT_FOUND

```txt
HTTP: 404
Mensaje: No encontramos esta importación.
```

---

## 13.2 INVALID_FILE_FORMAT

```txt
HTTP: 422
Mensaje: El archivo no tiene un formato compatible.
```

---

## 13.3 EMPTY_FILE

```txt
HTTP: 422
Mensaje: No encontramos movimientos en el archivo.
```

---

## 13.4 PROVIDER_FILE_MISMATCH

```txt
HTTP: 422
Mensaje: El archivo no parece corresponder al proveedor seleccionado.
```

---

## 13.5 RECONCILIATION_IMPORT_PROCESSING

```txt
HTTP: 409
Mensaje: Esta importación aún se está procesando.
```

---

## 13.6 RECONCILIATION_MATCH_NOT_FOUND

```txt
HTTP: 404
Mensaje: No encontramos esta coincidencia.
```

---

## 13.7 RECONCILIATION_MATCH_CONFLICT

```txt
HTTP: 409
Mensaje: Esta coincidencia ya fue resuelta o cambió de estado.
```

---

## 13.8 RECONCILIATION_INCIDENT_NOT_FOUND

```txt
HTTP: 404
Mensaje: No encontramos esta incidencia.
```

---

## 13.9 RECONCILIATION_INCIDENT_ALREADY_RESOLVED

```txt
HTTP: 409
Mensaje: Esta incidencia ya fue resuelta.
```

---

## 13.10 RECONCILIATION_IGNORE_REASON_REQUIRED

```txt
HTTP: 422
Mensaje: Captura un motivo para ignorar esta incidencia.
```

---

## 13.11 PENDING_REFERENCE_NOT_FOUND

```txt
HTTP: 404
Mensaje: No encontramos esta referencia pendiente.
```

---

## 13.12 PENDING_REFERENCE_ALREADY_RESOLVED

```txt
HTTP: 409
Mensaje: Esta referencia pendiente ya fue resuelta.
```

---

# 14. Errores Exports

## 14.1 EXPORT_TYPE_INVALID

```txt
HTTP: 422
Mensaje: Selecciona un tipo de exportación válido.
```

---

## 14.2 EXPORT_FORMAT_INVALID

```txt
HTTP: 422
Mensaje: Selecciona un formato válido.
```

---

## 14.3 EXPORT_DATE_RANGE_INVALID

```txt
HTTP: 422
Mensaje: Revisa el rango de fechas.
```

---

## 14.4 EXPORT_DATE_RANGE_TOO_LARGE

```txt
HTTP: 422
Mensaje: El rango seleccionado es demasiado amplio.
```

---

## 14.5 EXPORT_NOT_FOUND

```txt
HTTP: 404
Mensaje: No encontramos esta exportación.
```

---

## 14.6 EXPORT_NOT_READY

```txt
HTTP: 409
Mensaje: La exportación aún no está lista.
```

---

## 14.7 EXPORT_FAILED

```txt
HTTP: 500
Mensaje: No se pudo generar la exportación.
```

---

## 14.8 EXPORT_EXPIRED

```txt
HTTP: 410
Mensaje: Este archivo ya expiró. Genera una nueva exportación.
```

---

# 15. Errores Fiscal Settings

## 15.1 FISCAL_CONFIG_NOT_FOUND

```txt
HTTP: 404
Mensaje: No encontramos la configuración fiscal.
```

---

## 15.2 FISCAL_CONFIG_INCOMPLETE

```txt
HTTP: 409
Mensaje: La configuración fiscal está incompleta.
```

---

## 15.3 FISCAL_CONFIG_ALREADY_ACTIVE

```txt
HTTP: 409
Mensaje: La facturación ya está activa.
```

---

## 15.4 FISCAL_CONFIG_VALIDATION_IN_PROGRESS

```txt
HTTP: 409
Mensaje: Ya hay una validación fiscal en proceso.
```

---

## 15.5 FISCAL_RFC_INVALID

```txt
HTTP: 422
Mensaje: RFC inválido.
```

---

## 15.6 FISCAL_LEGAL_NAME_INVALID

```txt
HTTP: 422
Mensaje: Revisa la razón social.
```

---

## 15.7 FISCAL_CERTIFICATE_INVALID

```txt
HTTP: 422
Mensaje: El certificado no es válido.
```

---

## 15.8 FISCAL_CERTIFICATE_EXPIRED

```txt
HTTP: 409
Mensaje: El certificado fiscal está vencido.
```

---

## 15.9 FISCAL_PROVIDER_CONNECTION_ERROR

```txt
HTTP: 503
Mensaje: No se pudo conectar con el proveedor fiscal.
```

---

## 15.10 FISCAL_TEST_STAMP_FAILED

```txt
HTTP: 409
Mensaje: No se pudo completar el timbrado de prueba.
```

---

# 16. Errores de permisos por rol

## 16.1 CASHIER_MANAGER_ACCESS_DENIED

```txt
HTTP: 403
Mensaje: No tienes acceso a Manager Billing.
```

---

## 16.2 SUPERVISOR_CFDI_CANCEL_DENIED

```txt
HTTP: 403
Mensaje: Cancelar CFDI requiere permisos de gerente.
```

---

## 16.3 SUPERVISOR_GLOBAL_CONFIRM_DENIED

```txt
HTTP: 403
Mensaje: Confirmar globales requiere permisos de gerente.
```

---

## 16.4 EXPORT_PERMISSION_DENIED

```txt
HTTP: 403
Mensaje: Exportar información fiscal requiere permisos de gerente.
```

---

## 16.5 FISCAL_SETTINGS_PERMISSION_DENIED

```txt
HTTP: 403
Mensaje: Configurar facturación requiere permisos de gerente.
```

---

# 17. Errores que NO deben mostrarse al usuario

No mostrar directamente:

```txt
ECONNRESET
ETIMEDOUT
PrismaClientKnownRequestError
duplicate key value violates unique constraint
Cannot read properties of undefined
Facturapi raw payload
CSD password invalid raw error
JWT malformed raw error
```

Deben mapearse a errores operativos.

---

## 18. Mapeo frontend por tipo de error

## 18.1 Errores de campo

Mostrar debajo del input.

Ejemplos:

```txt
INVALID_RFC
INVALID_EMAIL
INVALID_POSTAL_CODE
```

---

## 18.2 Errores de permiso

Mostrar pantalla o toast:

```txt
No tienes permiso para esta acción.
```

---

## 18.3 Errores de estado

Mostrar mensaje contextual.

Ejemplo:

```txt
Este ticket ya fue facturado.
```

---

## 18.4 Errores temporales

Mostrar retry o estado en proceso.

Ejemplos:

```txt
PROVIDER_UNAVAILABLE
PROVIDER_TIMEOUT
EXPORT_NOT_READY
```

---

## 18.5 Errores definitivos

No insistir automáticamente.

Ejemplos:

```txt
RECEIPT_EXPIRED
INVOICE_ALREADY_CANCELLED
FISCAL_CERTIFICATE_EXPIRED
```

---

# 19. QA del catálogo de errores

```txt
[ ] 401 muestra sesión expirada.
[ ] 403 muestra sin permiso.
[ ] 404 no revela recursos de otra sucursal.
[ ] 409 se usa para conflicto de estado.
[ ] 410 se usa para QR/export vencido.
[ ] 422 marca campos inválidos.
[ ] 429 se maneja en portal público.
[ ] Provider raw errors no llegan al frontend.
[ ] Errores de Facturapi se sanitizan.
[ ] Cancelación sin motivo SAT responde 422.
[ ] QR vencido responde 410.
[ ] Ticket ya facturado responde 409.
[ ] Export expirado responde 410.
[ ] Supervisor cancelando CFDI responde 403.
```

---

## 20. Relación con otros documentos

Convenciones API:

```txt
docs/contracts/billing-api-conventions-v0.1.md
```

OpenAPI:

```txt
docs/contracts/billing-openapi-v0.1.yaml
```

DTO catalog:

```txt
docs/contracts/billing-dto-catalog-v0.1.md
```

Events contract:

```txt
docs/contracts/billing-events-contract-v0.1.md
```

---

## 21. Siguiente documento

Después de este documento, generar:

```txt
billing-events-contract-v0.1.md
```
