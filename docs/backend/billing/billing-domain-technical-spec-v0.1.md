# Tortilla Plus — Billing Domain Technical Specification V0.1

## 1. Propósito

Este documento define el dominio fiscal de **Tortilla Plus — V1 Operativa Comercial** para pasar a implementación backend.

Cubre:

```txt
Autofactura por QR
Factura individual por portal
Factura global diaria
Factura global de rezagados
Cancelación CFDI
Integración con Facturapi como motor fiscal inicial
Estados fiscales de venta
Reglas de timbrado
Retries
Auditoría
Almacenamiento XML/metadata
Conciliación bancaria operativa
```

Este documento es fuente de verdad para:

```txt
ERD fiscal
OpenAPI billing
Jobs / queues / scheduler
Implementación backend
QA funcional fiscal
```

---

## 2. Decisiones congeladas V1

### 2.1 Motor fiscal

```txt
Provider fiscal inicial: Facturapi
```

Facturapi será usado como motor fiscal, no como dueño del dominio.

Tortilla Plus controla:

```txt
lifecycle fiscal
reglas de negocio
portal autofactura
QR
globales
auditoría
conciliación
```

Facturapi controla:

```txt
timbrado CFDI
cancelación CFDI
respuesta PAC/SAT
generación/consulta de PDF bajo demanda
```

### 2.2 Adapter obligatorio

No se permite acoplar directamente módulos de negocio al SDK/API de Facturapi.

Correcto:

```txt
Sales / Billing / Portal
→ BillingProvider interface
→ FacturapiProvider
```

Incorrecto:

```txt
SalesService
→ Facturapi SDK directo
```

---

## 3. Alcance V1

### Incluido

```txt
Autofactura por QR
Factura individual desde portal público
Global diaria confirmada por gerente
Global rezagados preparada automáticamente y confirmada por gerente
Cancelación CFDI solo por gerente
XML persistente
PDF bajo demanda
Provider adapter
Retries de timbrado
Rate limit de portal
Auditoría fiscal
Conciliación bancaria operativa básica
```

### No incluido V1

```txt
Timbrado directo desde POS
Notas de crédito SAT
Devoluciones sobre ventas ya timbradas
Contabilidad electrónica
Pólizas contables
DIOT
ERP fiscal completo
Multi-RFC operativo por sucursal
Open Banking automático
```

---

## 4. Actores

### Cajero

Opera POS.

Puede:

```txt
crear venta
cobrar venta
generar ticket QR según reglas
reimprimir QR limitado
```

No puede:

```txt
timbrar CFDI directamente
cancelar CFDI
ver histórico fiscal completo
generar globales
```

### Gerente

Controla operación fiscal de la sucursal/organización.

Puede:

```txt
confirmar global diaria
confirmar global rezagados
cancelar CFDI
consultar facturas
consultar solicitudes
reimprimir/reEnviar QR histórico
ver errores fiscales
gestionar conciliación
```

### Cliente final

Usa portal público de autofactura.

Puede:

```txt
consultar ticket por QR
capturar datos fiscales
solicitar factura
descargar XML/PDF
corregir datos fiscales dentro de límites
```

### Sistema

Ejecuta procesos automáticos.

Puede:

```txt
preparar lotes globales
marcar QR vencidos
reintentar timbrados
registrar provider logs
actualizar estados
```

---

## 5. Principios del dominio

### 5.1 El POS nunca timbra directamente

El POS termina la venta y genera ticket operativo/fiscal según corresponda.

```txt
POS completed sale
→ billing classification
→ ticket simple o QR
```

El timbrado ocurre fuera del POS:

```txt
portal autofactura
global diaria
global rezagados
cancelación manager
```

### 5.2 Una venta solo puede terminar fiscalmente en un destino

Una venta puede terminar como:

```txt
CFDI individual
```

o:

```txt
CFDI global
```

Nunca ambos.

### 5.3 Ventas timbradas quedan cerradas

Si una venta ya fue timbrada:

```txt
no devoluciones V1
no ajustes operativos V1
no notas crédito V1
```

Solo puede existir proceso formal de cancelación CFDI, ejecutado por gerente.

### 5.4 QR fiscal tiene vigencia hasta fin de mes natural

Ejemplo:

```txt
Venta: 2026-05-03
QR válido hasta: 2026-05-31 23:59:59
```

### 5.5 Global diaria no es automática

El sistema prepara información, pero el gerente confirma diariamente.

### 5.6 Global rezagados no es automática

El sistema prepara lote al cierre de periodo, pero el gerente confirma timbrado.

---

## 6. Estados oficiales

### 6.1 SaleFiscalStatus

```txt
sale_completed
eligible_for_daily_global
pending_customer_invoice
invoice_processing
customer_invoiced
invoice_failed
requires_manual_review
expired_to_pending_global
included_in_global
cfdi_cancelled
cancelled
```

### 6.2 Definición de estados

| Estado | Descripción |
|---|---|
| `sale_completed` | Venta completada, antes de clasificación fiscal final. Estado transitorio. |
| `eligible_for_daily_global` | Venta elegible para global diaria. |
| `pending_customer_invoice` | Venta reservada para posible autofactura por QR. |
| `invoice_processing` | Solicitud de factura individual en proceso. |
| `customer_invoiced` | Venta timbrada como CFDI individual. |
| `invoice_failed` | Intento de timbrado falló pero puede reintentarse. |
| `requires_manual_review` | Se agotaron retries o hay error que requiere intervención. |
| `expired_to_pending_global` | QR vencido; venta queda disponible para global rezagados. |
| `included_in_global` | Venta incluida en CFDI global. |
| `cfdi_cancelled` | CFDI asociado fue cancelado formalmente. |
| `cancelled` | Venta cancelada operativamente antes de timbrado. |

---

## 7. Estados de recibo fiscal QR

### 7.1 BillingReceiptStatus

```txt
active
used
expired
blocked
cancelled
```

| Estado | Descripción |
|---|---|
| `active` | QR vigente y facturable. |
| `used` | QR ya generó CFDI individual. |
| `expired` | QR vencido por fin de mes. |
| `blocked` | QR bloqueado por revisión/manual/auditoría. |
| `cancelled` | Venta cancelada antes de timbrado. |

---

## 8. Estados de solicitud de factura

### 8.1 InvoiceRequestStatus

```txt
draft
submitted
processing
stamped
failed_retryable
failed_final
requires_manual_review
cancelled
```

| Estado | Descripción |
|---|---|
| `draft` | Datos capturados pero no enviados. |
| `submitted` | Solicitud enviada por cliente. |
| `processing` | Intento de timbrado en curso. |
| `stamped` | CFDI timbrado correctamente. |
| `failed_retryable` | Fallo temporal; entra a retry. |
| `failed_final` | Fallo definitivo por datos inválidos u otra causa no reintentable. |
| `requires_manual_review` | Requiere revisión del gerente/soporte. |
| `cancelled` | Solicitud cancelada por estado de venta o vencimiento. |

---

## 9. Estados de factura

### 9.1 InvoiceStatus

```txt
draft
stamping
stamped
stamp_failed
cancel_requested
cancelled
cancel_failed
```

---

## 10. Estados de lote global

### 10.1 GlobalBatchType

```txt
daily
pending_period
```

### 10.2 GlobalBatchStatus

```txt
prepared
confirmed
stamping
stamped
failed
cancelled
```

| Estado | Descripción |
|---|---|
| `prepared` | Lote preparado por sistema, aún no timbrado. |
| `confirmed` | Gerente confirmó lote para timbrado. |
| `stamping` | Timbrado en proceso. |
| `stamped` | Global timbrada correctamente. |
| `failed` | Timbrado fallido. |
| `cancelled` | Lote descartado antes de timbrar. |

---

## 11. Lifecycle fiscal principal

### 11.1 Venta completada

Al completar venta, el backend clasifica fiscalmente según pago e intención.

```txt
sale completed
→ classify fiscal destination
```

### 11.2 Efectivo sin factura

```txt
sale_completed
→ eligible_for_daily_global
```

La venta entra al lote de global diaria, previa confirmación de gerente.

### 11.3 Efectivo con factura

```txt
sale_completed
→ pending_customer_invoice
→ create billing_receipt active
```

Se genera ticket QR.

### 11.4 Tarjeta

Toda venta con tarjeta genera QR automático.

```txt
sale_completed
→ pending_customer_invoice
→ create billing_receipt active
```

### 11.5 Mixto

Si una venta mixta incluye tarjeta:

```txt
sale_completed
→ pending_customer_invoice
```

Si es mixto sin tarjeta, por ejemplo efectivo + crédito, se define por intención fiscal capturada.

### 11.6 Cliente factura

```txt
pending_customer_invoice
→ invoice_processing
→ customer_invoiced
```

### 11.7 Cliente no factura y vence QR

```txt
pending_customer_invoice
→ expired_to_pending_global
```

Luego podrá incluirse en global rezagados.

### 11.8 Global diaria

```txt
eligible_for_daily_global
→ included_in_global
```

### 11.9 Global rezagados

```txt
expired_to_pending_global
→ included_in_global
```

---

## 12. Diagrama textual de lifecycle

```txt
sale_completed
├─ cash + no invoice
│  └─ eligible_for_daily_global
│     └─ included_in_global
│
├─ cash + wants invoice
│  └─ pending_customer_invoice
│     ├─ invoice_processing
│     │  ├─ customer_invoiced
│     │  ├─ invoice_failed
│     │  └─ requires_manual_review
│     └─ expired_to_pending_global
│        └─ included_in_global
│
├─ card
│  └─ pending_customer_invoice
│     ├─ customer_invoiced
│     └─ expired_to_pending_global
│        └─ included_in_global
│
└─ mixed with card
   └─ pending_customer_invoice
      ├─ customer_invoiced
      └─ expired_to_pending_global
         └─ included_in_global
```

---

## 13. Reglas por método de pago

### 13.1 Efectivo

El POS pregunta si requiere factura.

Si no requiere factura:

```txt
fiscal_status = eligible_for_daily_global
receipt = none
ticket = simple optional
```

Si requiere factura:

```txt
fiscal_status = pending_customer_invoice
receipt = active QR
ticket = QR fiscal
```

### 13.2 Tarjeta

Toda venta con tarjeta queda reservada para autofactura.

```txt
fiscal_status = pending_customer_invoice
receipt = active QR
ticket = QR fiscal
```

No requiere pregunta.

Motivo: venta trazable bancariamente.

### 13.3 Pago mixto

Si incluye tarjeta:

```txt
pending_customer_invoice
```

Si no incluye tarjeta:

```txt
depende de intención fiscal
```

### 13.4 Crédito/fiado

Para V1, si la venta queda a crédito, se recomienda:

```txt
pending_customer_invoice
```

hasta definir política fiscal de crédito. Si el crédito se maneja con clientes recurrentes, debe quedar en revisión fiscal antes de global.

---

## 14. Portal autofactura

### 14.1 Ruta pública conceptual

```txt
/public/receipts/{token}
```

### 14.2 El portal muestra

```txt
folio venta
fecha
sucursal
total
items
fecha límite de facturación
estado del ticket
```

### 14.3 El cliente captura

```txt
RFC
razón social
régimen fiscal
código postal
uso CFDI
correo electrónico
```

### 14.4 Resultado exitoso

```txt
CFDI timbrado
XML disponible
PDF disponible bajo demanda
correo opcional futuro
```

### 14.5 Resultado con falla temporal

```txt
Tu factura está siendo procesada.
Te recomendamos volver más tarde con este mismo enlace.
```

### 14.6 Resultado vencido

Mensaje oficial:

```txt
Este ticket ya venció para autofactura. Contacta al negocio para revisión.
```

No se permite autofactura automática tardía.

---

## 15. Validación y corrección de datos fiscales

### 15.1 Corrección por cliente

El cliente puede corregir datos fiscales desde el portal mientras:

```txt
receipt.status = active
sale.fiscal_status in pending_customer_invoice, invoice_failed
```

### 15.2 Límites

Debe implementarse:

```txt
máximo intentos por token
rate limit por IP/token
bloqueo temporal ante abuso
```

### 15.3 Recomendación inicial

```txt
máximo 5 intentos de submit por receipt_token por hora
máximo 20 consultas por receipt_token por hora
```

Estos valores pueden ajustarse por configuración.

---

## 16. Timbrado individual

### 16.1 Estrategia

Al recibir solicitud válida:

```txt
1. Crear billing_invoice_request.
2. Intentar timbrado inmediato.
3. Si OK, crear billing_invoice stamped.
4. Si falla temporal, enviar a cola.
5. Si falla definitivo por datos, permitir corrección.
```

### 16.2 Intento inmediato + fallback cola

Política oficial:

```txt
intento inmediato
+
fallback automático a cola/retry
```

### 16.3 Retry policy

```txt
intento 1: inmediato
retry 1: +1 min
retry 2: +5 min
retry 3: +15 min
retry 4: +1 h
retry 5: +6 h
```

Después:

```txt
requires_manual_review
```

---

## 17. Global diaria

### 17.1 Incluye

Solo ventas:

```txt
fiscal_status = eligible_for_daily_global
branch_id = branch seleccionada
period_date = fecha operativa
not cancelled
not invoiced
not included_in_global
```

### 17.2 Excluye

```txt
pending_customer_invoice
invoice_processing
customer_invoiced
invoice_failed
requires_manual_review
expired_to_pending_global
included_in_global
cancelled
```

### 17.3 Confirmación

La global diaria requiere confirmación del gerente.

Flujo:

```txt
Sistema calcula ventas elegibles
→ gerente revisa resumen
→ gerente confirma
→ sistema timbra CFDI global
```

### 17.4 No automática

No se timbra sola en V1.

---

## 18. Global rezagados

### 18.1 Qué es

Lote global para ventas QR que no fueron facturadas por el cliente dentro del mes natural.

### 18.2 Preparación

El sistema prepara lote automáticamente al cierre del periodo.

Ejemplo:

```txt
último día del mes 23:30
→ preparar ventas pending_customer_invoice vencidas
```

### 18.3 Confirmación

El gerente confirma manualmente.

### 18.4 Incluye

```txt
fiscal_status = expired_to_pending_global
not invoiced
not included_in_global
not cancelled
```

### 18.5 No incluye

```txt
customer_invoiced
invoice_processing
requires_manual_review
eligible_for_daily_global
included_in_global
```

---

## 19. Cancelación CFDI

### 19.1 Permiso

Solo gerente.

### 19.2 Requisitos

```txt
motivo SAT obligatorio
motivo interno obligatorio
auditoría obligatoria
evidence_url opcional
```

### 19.3 Evidencia

Tortilla Plus no almacena archivos de evidencia en V1.

Solo permite guardar:

```txt
evidence_url
```

Ejemplos:

```txt
Google Drive
Dropbox
OneDrive
URL privada del negocio
```

### 19.4 Auditoría mínima

Debe registrar:

```txt
invoice_id
uuid
organization_id
branch_id
manager_user_id
sat_cancel_reason
internal_reason
evidence_url
requested_at
provider_response
final_status
```

---

## 20. XML/PDF

### 20.1 XML

Tortilla Plus guarda XML y metadata fiscal de manera persistente.

Guardar:

```txt
uuid
xml_storage_path
xml_hash
provider
provider_invoice_id
stamped_at
sat_status
total
rfc_receptor
rfc_emisor
```

### 20.2 PDF

El PDF no se almacena permanentemente en V1.

Política:

```txt
PDF bajo demanda
```

Puede:

```txt
consultarse desde Facturapi
generarse temporalmente
cachearse temporalmente futuro
```

---

## 21. Multi-sucursal fiscal

### 21.1 V1

```txt
1 organización = 1 RFC
```

Una organización puede tener varias sucursales, pero todas usan la misma entidad fiscal.

### 21.2 Preparación futura

Implementar entidad conceptual:

```txt
billing_entity
```

En V1:

```txt
organization_id -> billing_entity_id único
```

Futuro:

```txt
branch_id -> billing_entity_id opcional
```

---

## 22. Reimpresión / recuperación QR

### 22.1 Cajero

Puede reimprimir QR solo si cumple:

```txt
misma sucursal
misma caja
mismo turno
ticket reciente
```

Definición inicial de reciente:

```txt
últimas 24 horas
```

Configurable futuro.

### 22.2 Gerente

Puede:

```txt
buscar histórico completo
reimprimir QR
reenviar link
consultar estado fiscal
```

### 22.3 Auditoría

Toda reimpresión/reenvío debe registrar:

```txt
user_id
sale_id
receipt_id
action
timestamp
reason optional
```

---

## 23. Devoluciones

### 23.1 Regla oficial

Si una venta ya fue timbrada:

```txt
no devoluciones V1
no ajustes V1
no notas crédito SAT V1
```

### 23.2 Antes del timbrado

Puede existir cancelación operativa si:

```txt
venta no incluida en global
venta no customer_invoiced
venta no invoice_processing
```

Sujeto a permisos ya definidos en dominio POS/caja.

---

## 24. Facturapi Provider

### 24.1 Rol

Facturapi es proveedor inicial.

### 24.2 No acoplamiento

El dominio no debe depender de modelos internos de Facturapi.

### 24.3 BillingProvider interface conceptual

```ts
export interface BillingProvider {
  createOrganization(input: CreateFiscalOrganizationInput): Promise<FiscalOrganizationResult>;
  uploadCertificate(input: UploadCertificateInput): Promise<CertificateResult>;

  createInvoice(input: CreateInvoiceInput): Promise<CreateInvoiceResult>;
  createGlobalInvoice(input: CreateGlobalInvoiceInput): Promise<CreateInvoiceResult>;

  cancelInvoice(input: CancelInvoiceInput): Promise<CancelInvoiceResult>;

  getInvoiceXml(input: GetInvoiceDocumentInput): Promise<InvoiceXmlResult>;
  getInvoicePdf(input: GetInvoiceDocumentInput): Promise<InvoicePdfResult>;

  getInvoiceStatus(input: GetInvoiceStatusInput): Promise<InvoiceStatusResult>;
}
```

### 24.4 Provider logs obligatorios

Cada llamada externa debe generar log:

```txt
provider
operation
request_payload_sanitized
response_payload_sanitized
status_code
duration_ms
success
error_code
error_message
created_at
```

No guardar secretos ni CSD sin cifrado.

---

## 25. Eventos de dominio

### 25.1 Eventos mínimos

```txt
sale.completed
billing.receipt.created
billing.invoice.requested
billing.invoice.stamped
billing.invoice.failed
billing.invoice.requires_manual_review
billing.global_batch.prepared
billing.global_batch.confirmed
billing.global_batch.stamped
billing.invoice.cancel_requested
billing.invoice.cancelled
billing.invoice.cancel_failed
billing.receipt.expired
```

### 25.2 Uso

Los eventos deben servir para:

```txt
auditoría
jobs
notificaciones futuras
actualización dashboards
```

---

## 26. Jobs y procesos requeridos

### 26.1 Jobs mínimos

```txt
billing.invoice.generate
billing.invoice.retry
billing.receipt.expire
billing.global.daily.prepare
billing.global.pending.prepare
billing.global.stamp
billing.invoice.cancel
billing.reconciliation.process
```

### 26.2 Scheduler mínimo

```txt
cada 5 minutos:
  procesar retries pendientes

diario 23:30:
  preparar global diaria por sucursal

último día del mes 23:30:
  expirar receipts del mes y preparar global rezagados

diario 00:15:
  marcar receipts vencidos del día anterior si aplica
```

La hora exacta debe ser configurable por organización.

---

## 27. Conciliación bancaria operativa

### 27.1 Alcance

V1 soporta conciliación semi-automática con carga de archivos:

```txt
BBVA
MercadoPago
Clip
```

### 27.2 Formatos

```txt
CSV
Excel futuro inmediato
```

No iniciar con PDF.

### 27.3 Matching

El sistema debe sugerir coincidencias con score.

Criterios:

```txt
monto
fecha/hora aproximada
referencia
terminal
autorización
últimos 4 dígitos si existe
```

### 27.4 Estados de conciliación

```txt
matched
possible_match
unmatched_pos_sale
unmatched_bank_movement
confirmed
rejected
```

### 27.5 Confirmación

El gerente confirma manualmente.

---

## 28. Seguridad

### 28.1 Portal público

Debe protegerse con:

```txt
tokens aleatorios no predecibles
rate limiting
expiración
no exponer ids internos
```

### 28.2 Token QR

El `receipt_token` debe ser:

```txt
único
largo
no secuencial
no reutilizable para modificar venta
```

### 28.3 Datos fiscales

Datos fiscales deben tratarse como información sensible.

Aplicar:

```txt
validación
auditoría
acceso mínimo
logs sanitizados
```

### 28.4 CSD

CSD/certificados deben almacenarse cifrados o delegarse al proveedor si aplica.

Nunca guardar `.key` sin cifrado.

---

## 29. Auditoría

Debe existir auditoría para:

```txt
creación QR
consulta QR
submit autofactura
reintentos
timbrado exitoso
fallo timbrado
confirmación global
cancelación CFDI
reimpresión QR
reenvío link
descarga XML/PDF
cambios de configuración fiscal
```

Auditoría mínima:

```txt
actor_type
actor_id
organization_id
branch_id
action
entity_type
entity_id
before_snapshot optional
after_snapshot optional
ip_address optional
user_agent optional
created_at
```

---

## 30. Errores normalizados

El backend debe normalizar errores del provider.

### 30.1 Error categories

```txt
provider_timeout
provider_unavailable
invalid_tax_data
certificate_error
rate_limited
duplicate_invoice
already_invoiced
already_globalized
receipt_expired
permission_denied
manual_review_required
unknown_provider_error
```

### 30.2 Ejemplo respuesta API interna

```json
{
  "statusCode": 422,
  "error": "INVALID_TAX_DATA",
  "message": "Los datos fiscales capturados no son válidos.",
  "details": {
    "field": "postal_code"
  }
}
```

---

## 31. Configuración por organización

Configuraciones mínimas:

```txt
billing_enabled
facturapi_organization_id
billing_entity_id
auto_invoice_enabled
auto_invoice_expires_policy = end_of_month
daily_global_requires_manager_confirmation = true
pending_global_requires_manager_confirmation = true
pdf_storage_policy = on_demand
xml_storage_policy = persistent
max_invoice_submit_attempts_per_hour
max_receipt_lookup_attempts_per_hour
billing_retry_policy_id
```

---

## 32. QA funcional mínimo

### Billing lifecycle

```txt
BILL-QA-001 Efectivo sin factura queda eligible_for_daily_global.
BILL-QA-002 Efectivo con factura genera QR active.
BILL-QA-003 Tarjeta genera QR automáticamente.
BILL-QA-004 Venta QR no entra a global diaria.
BILL-QA-005 Venta globalizada no puede autofacturarse.
BILL-QA-006 Venta customer_invoiced no entra a global.
```

### Portal

```txt
BILL-QA-010 Cliente puede abrir QR vigente.
BILL-QA-011 Cliente puede capturar datos fiscales.
BILL-QA-012 Datos inválidos permiten corrección dentro de límites.
BILL-QA-013 QR vencido muestra contacto al negocio.
BILL-QA-014 Rate limit bloquea abuso.
```

### Timbrado

```txt
BILL-QA-020 Timbrado exitoso guarda XML + metadata.
BILL-QA-021 PDF se obtiene bajo demanda.
BILL-QA-022 Provider timeout manda solicitud a cola.
BILL-QA-023 Retry se ejecuta 5 veces exponencial.
BILL-QA-024 Tras 5 fallos queda requires_manual_review.
```

### Globales

```txt
BILL-QA-030 Gerente confirma global diaria.
BILL-QA-031 Global diaria excluye QR pendientes.
BILL-QA-032 Sistema prepara global rezagados al cierre.
BILL-QA-033 Gerente confirma global rezagados.
BILL-QA-034 Ventas incluidas en global quedan blocked para autofactura.
```

### Cancelación

```txt
BILL-QA-040 Cajero no puede cancelar CFDI.
BILL-QA-041 Gerente puede cancelar con motivo SAT e interno.
BILL-QA-042 Cancelación sin motivo se bloquea.
BILL-QA-043 Evidence URL opcional se guarda si existe.
```

### Reimpresión

```txt
BILL-QA-050 Cajero solo reimprime tickets recientes de su caja/turno.
BILL-QA-051 Gerente puede buscar histórico.
BILL-QA-052 Reimpresión genera auditoría.
```

### Devoluciones

```txt
BILL-QA-060 Venta timbrada bloquea devolución.
BILL-QA-061 Venta incluida en global bloquea devolución.
```

---

## 33. Definition of Done — Billing Domain V0.1

```txt
[ ] Estados fiscales implementados
[ ] Clasificación fiscal al completar venta
[ ] QR autofactura generado según reglas
[ ] Portal público permite factura
[ ] Timbrado inmediato implementado
[ ] Fallback cola/retry implementado
[ ] XML persistente
[ ] PDF bajo demanda
[ ] Global diaria con confirmación gerente
[ ] Global rezagados preparada y confirmada
[ ] Cancelación CFDI solo gerente
[ ] Evidence URL opcional
[ ] Reimpresión QR con permisos
[ ] Auditoría fiscal
[ ] Provider adapter implementado
[ ] Logs provider sanitizados
[ ] QA billing mínimo aprobado
```

---

## 34. Documentos siguientes

Después de este documento, generar:

```txt
billing-erd-addendum-v0.1.md
billing-openapi-addendum-v0.1.md
billing-jobs-queues-scheduler-v0.1.md
billing-backend-implementation-guide-v0.1.md
```
