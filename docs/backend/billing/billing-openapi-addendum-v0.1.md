# Tortilla Plus — Billing OpenAPI Addendum V0.1

## 1. Propósito

Este documento define los contratos API para el módulo fiscal de **Tortilla Plus — V1 Operativa Comercial**.

Cubre:

```txt
Portal público de autofactura
Consulta de recibo QR
Solicitud de CFDI individual
Estado de factura
Descarga XML
PDF bajo demanda
Global diaria
Global rezagados
Cancelación CFDI
Reimpresión/reenvío QR
Configuración fiscal
Conciliación bancaria operativa
```

Este documento complementa:

```txt
billing-domain-technical-spec-v0.1.md
billing-erd-addendum-v0.1.md
```

---

## 2. Convenciones API

### 2.1 Base paths

```txt
/public/billing
/manager/billing
/manager/reconciliation
```

### 2.2 Autenticación

#### Endpoints públicos

No requieren sesión, pero requieren:

```txt
receipt_token válido
rate limit
token no expirado
```

#### Endpoints manager

Requieren:

```txt
JWT
rol gerente
branch access
feature billing_cfdi habilitada
```

#### Endpoints conciliación

Requieren:

```txt
JWT
rol gerente
feature reconciliation habilitada
```

---

## 3. Errores estándar

### 3.1 ErrorResponse

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

### 3.2 Códigos de error

```txt
RECEIPT_NOT_FOUND
RECEIPT_EXPIRED
RECEIPT_BLOCKED
RECEIPT_ALREADY_USED
SALE_ALREADY_INVOICED
SALE_ALREADY_GLOBALIZED
INVALID_TAX_DATA
RATE_LIMITED
PROVIDER_TIMEOUT
PROVIDER_UNAVAILABLE
CERTIFICATE_ERROR
INVOICE_REQUIRES_MANUAL_REVIEW
GLOBAL_BATCH_NOT_FOUND
GLOBAL_BATCH_ALREADY_CONFIRMED
GLOBAL_BATCH_ALREADY_STAMPED
GLOBAL_BATCH_EMPTY
PERMISSION_REQUIRED
FEATURE_NOT_AVAILABLE
CANCELLATION_REASON_REQUIRED
INTERNAL_REASON_REQUIRED
EVIDENCE_URL_INVALID
RECONCILIATION_IMPORT_INVALID
```

---

## 4. OpenAPI base

```yaml
openapi: 3.0.3
info:
  title: Tortilla Plus Billing API
  version: 0.1.0
  description: Billing, autofactura, CFDI and reconciliation contracts for Tortilla Plus V1.
servers:
  - url: https://api.tortillaplus.mx
    description: Production
  - url: https://sandbox-api.tortillaplus.mx
    description: Sandbox
tags:
  - name: Public Billing
  - name: Manager Billing
  - name: Manager Billing Config
  - name: Reconciliation
security:
  - bearerAuth: []
```

---

# 5. Public Billing API

## 5.1 GET `/public/billing/receipts/{token}`

Consulta un ticket QR de autofactura.

### Auth

```txt
public
```

### Path params

```txt
token: receipt_token
```

### Response 200

```json
{
  "receipt": {
    "id": "rcp_123",
    "token": "public-token",
    "status": "active",
    "expiresAt": "2026-05-31T23:59:59-06:00",
    "canInvoice": true
  },
  "sale": {
    "folio": "TP-SUC1-000124",
    "date": "2026-05-23T10:35:00-06:00",
    "branchName": "Sucursal Principal",
    "total": "86.00",
    "currency": "MXN",
    "items": [
      {
        "description": "Tortilla por kilo",
        "quantity": "1.500",
        "unit": "kg",
        "total": "42.00"
      }
    ]
  },
  "billingEntity": {
    "tradeName": "Tortillería La Esperanza",
    "rfcMasked": "TES***123"
  }
}
```

### Errors

```txt
404 RECEIPT_NOT_FOUND
409 RECEIPT_EXPIRED
409 RECEIPT_BLOCKED
409 RECEIPT_ALREADY_USED
429 RATE_LIMITED
```

---

## 5.2 POST `/public/billing/receipts/{token}/invoice`

Solicita CFDI individual desde portal QR.

### Auth

```txt
public
```

### Request

```json
{
  "rfc": "XAXX010101000",
  "legalName": "PUBLICO EN GENERAL",
  "taxRegime": "616",
  "postalCode": "78000",
  "cfdiUse": "S01",
  "email": "cliente@correo.com"
}
```

### Validaciones

```txt
receipt debe estar active
sale.fiscal_status debe ser pending_customer_invoice o invoice_failed
QR no debe estar vencido
rate limit por token/IP
datos fiscales requeridos
```

### Response 200 — timbrado inmediato exitoso

```json
{
  "status": "stamped",
  "invoice": {
    "id": "inv_123",
    "uuid": "1C3F0B1A-0000-0000-0000-000000000001",
    "status": "stamped",
    "stampedAt": "2026-05-23T10:40:00-06:00",
    "xmlUrl": "/public/billing/invoices/inv_123/xml",
    "pdfUrl": "/public/billing/invoices/inv_123/pdf"
  }
}
```

### Response 202 — fallback a cola

```json
{
  "status": "processing",
  "message": "Tu factura está siendo procesada. Puedes consultar este mismo enlace más tarde.",
  "invoiceRequest": {
    "id": "irq_123",
    "status": "failed_retryable",
    "nextRetryAt": "2026-05-23T10:45:00-06:00"
  }
}
```

### Response 422 — datos fiscales inválidos

```json
{
  "statusCode": 422,
  "error": "INVALID_TAX_DATA",
  "message": "Los datos fiscales capturados no son válidos.",
  "details": {
    "field": "postalCode",
    "reason": "Código postal no coincide con RFC/régimen."
  }
}
```

### Errors

```txt
404 RECEIPT_NOT_FOUND
409 RECEIPT_EXPIRED
409 SALE_ALREADY_INVOICED
409 SALE_ALREADY_GLOBALIZED
422 INVALID_TAX_DATA
429 RATE_LIMITED
503 PROVIDER_UNAVAILABLE
```

---

## 5.3 GET `/public/billing/receipts/{token}/invoice-status`

Consulta el estado de la solicitud/factura asociada al receipt.

### Response 200

```json
{
  "receipt": {
    "status": "used"
  },
  "invoiceRequest": {
    "id": "irq_123",
    "status": "stamped",
    "attemptCount": 1,
    "lastAttemptAt": "2026-05-23T10:40:00-06:00"
  },
  "invoice": {
    "id": "inv_123",
    "status": "stamped",
    "uuid": "1C3F0B1A-0000-0000-0000-000000000001",
    "xmlAvailable": true,
    "pdfAvailable": true
  }
}
```

---

## 5.4 GET `/public/billing/invoices/{invoiceId}/xml`

Descarga XML de CFDI.

### Auth

```txt
public by receipt token context or signed public document token
```

### Response

```txt
application/xml
```

### Errors

```txt
404 INVOICE_NOT_FOUND
409 INVOICE_NOT_STAMPED
403 DOCUMENT_ACCESS_DENIED
```

---

## 5.5 GET `/public/billing/invoices/{invoiceId}/pdf`

Genera/consulta PDF bajo demanda.

### Response

```txt
application/pdf
```

### Reglas

```txt
PDF no se almacena permanentemente en V1.
Puede generarse bajo demanda vía provider.
Puede cachearse temporalmente si se define TTL.
```

### Errors

```txt
404 INVOICE_NOT_FOUND
409 INVOICE_NOT_STAMPED
503 PROVIDER_UNAVAILABLE
```

---

# 6. Manager Billing API

## 6.1 GET `/manager/billing/dashboard`

Resumen fiscal operativo.

### Query

```txt
branchId
dateFrom
dateTo
```

### Response 200

```json
{
  "summary": {
    "eligibleDailyGlobalTotal": "8420.00",
    "eligibleDailyGlobalCount": 124,
    "pendingCustomerInvoiceTotal": "3200.00",
    "pendingCustomerInvoiceCount": 35,
    "customerInvoicedTotal": "1280.00",
    "customerInvoicedCount": 8,
    "expiredPendingGlobalTotal": "450.00",
    "expiredPendingGlobalCount": 4,
    "requiresManualReviewCount": 2
  },
  "alerts": [
    {
      "type": "manual_review",
      "message": "Hay 2 solicitudes fiscales que requieren revisión."
    }
  ]
}
```

---

## 6.2 GET `/manager/billing/receipts`

Lista receipts QR.

### Query

```txt
branchId
status
dateFrom
dateTo
saleFolio
```

### Response 200

```json
{
  "data": [
    {
      "id": "rcp_123",
      "saleId": "sale_123",
      "saleFolio": "TP-SUC1-000124",
      "status": "active",
      "fiscalStatus": "pending_customer_invoice",
      "total": "86.00",
      "expiresAt": "2026-05-31T23:59:59-06:00",
      "createdAt": "2026-05-23T10:35:00-06:00"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 25,
    "total": 1
  }
}
```

---

## 6.3 POST `/manager/billing/receipts/{receiptId}/reprint`

Reimprime QR.

### Permisos

```txt
cashier_limited or manager_full
```

### Request

```json
{
  "reason": "Cliente perdió ticket"
}
```

### Response 200

```json
{
  "receipt": {
    "id": "rcp_123",
    "receiptUrl": "https://factura.tortillaplus.mx/r/public-token",
    "status": "active"
  },
  "printPayload": {
    "folio": "TP-SUC1-000124",
    "qrContent": "https://factura.tortillaplus.mx/r/public-token",
    "expiresAt": "2026-05-31T23:59:59-06:00"
  }
}
```

### Reglas

```txt
Cajero: solo mismo turno, misma caja, últimas 24h.
Gerente: histórico completo.
```

---

## 6.4 POST `/manager/billing/receipts/{receiptId}/resend`

Reenvía liga QR.

### Request

```json
{
  "channel": "copy_link",
  "destination": null,
  "reason": "Cliente solicita liga"
}
```

### V1

```txt
Solo copy_link.
Email/WhatsApp quedan para futuro.
```

---

# 7. Global diaria

## 7.1 GET `/manager/billing/global/daily/preview`

Vista previa de global diaria.

### Query

```txt
branchId
operationalDate
```

### Response 200

```json
{
  "batchPreview": {
    "type": "daily",
    "branchId": "br_123",
    "operationalDate": "2026-05-23",
    "salesCount": 124,
    "subtotal": "7258.62",
    "taxTotal": "1161.38",
    "total": "8420.00"
  },
  "excluded": {
    "pendingCustomerInvoiceCount": 35,
    "customerInvoicedCount": 8,
    "requiresManualReviewCount": 2
  }
}
```

---

## 7.2 POST `/manager/billing/global/daily/prepare`

Prepara lote global diaria.

### Request

```json
{
  "branchId": "br_123",
  "operationalDate": "2026-05-23"
}
```

### Response 201

```json
{
  "batch": {
    "id": "gb_123",
    "type": "daily",
    "status": "prepared",
    "salesCount": 124,
    "total": "8420.00"
  }
}
```

### Reglas

```txt
No timbra.
Solo prepara lote.
```

---

## 7.3 POST `/manager/billing/global/daily/{batchId}/confirm`

Confirma y manda timbrar global diaria.

### Request

```json
{
  "confirmed": true,
  "managerNote": "Corte fiscal diario revisado."
}
```

### Response 202

```json
{
  "batch": {
    "id": "gb_123",
    "status": "stamping"
  },
  "job": {
    "id": "job_123",
    "type": "global_stamp",
    "status": "pending"
  }
}
```

### Errors

```txt
409 GLOBAL_BATCH_EMPTY
409 GLOBAL_BATCH_ALREADY_CONFIRMED
409 GLOBAL_BATCH_ALREADY_STAMPED
403 PERMISSION_REQUIRED
```

---

## 7.4 GET `/manager/billing/global/batches/{batchId}`

Consulta detalle de lote global.

### Response 200

```json
{
  "batch": {
    "id": "gb_123",
    "type": "daily",
    "status": "stamped",
    "salesCount": 124,
    "total": "8420.00",
    "stampedInvoiceId": "inv_789"
  },
  "sales": [
    {
      "id": "sale_123",
      "folio": "TP-SUC1-000124",
      "total": "86.00",
      "fiscalStatusSnapshot": "eligible_for_daily_global"
    }
  ]
}
```

---

# 8. Global rezagados

## 8.1 GET `/manager/billing/global/pending-period/preview`

Vista previa de rezagados.

### Query

```txt
branchId
periodStart
periodEnd
```

### Response 200

```json
{
  "batchPreview": {
    "type": "pending_period",
    "periodStart": "2026-05-01",
    "periodEnd": "2026-05-31",
    "salesCount": 48,
    "subtotal": "3879.31",
    "taxTotal": "620.69",
    "total": "4500.00"
  }
}
```

---

## 8.2 POST `/manager/billing/global/pending-period/prepare`

Prepara lote rezagado.

### Request

```json
{
  "branchId": "br_123",
  "periodStart": "2026-05-01",
  "periodEnd": "2026-05-31"
}
```

### Response 201

```json
{
  "batch": {
    "id": "gb_pending_123",
    "type": "pending_period",
    "status": "prepared",
    "salesCount": 48,
    "total": "4500.00"
  }
}
```

---

## 8.3 POST `/manager/billing/global/pending-period/{batchId}/confirm`

Confirma y manda timbrar lote de rezagados.

### Response 202

```json
{
  "batch": {
    "id": "gb_pending_123",
    "status": "stamping"
  },
  "job": {
    "id": "job_999",
    "type": "global_stamp",
    "status": "pending"
  }
}
```

---

# 9. CFDI manager

## 9.1 GET `/manager/billing/invoices`

Lista CFDIs.

### Query

```txt
branchId
type
status
dateFrom
dateTo
rfc
uuid
saleFolio
```

### Response 200

```json
{
  "data": [
    {
      "id": "inv_123",
      "type": "individual",
      "status": "stamped",
      "uuid": "1C3F0B1A-0000-0000-0000-000000000001",
      "total": "86.00",
      "rfcReceptor": "XAXX010101000",
      "stampedAt": "2026-05-23T10:40:00-06:00"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 25,
    "total": 1
  }
}
```

---

## 9.2 GET `/manager/billing/invoices/{invoiceId}`

Detalle CFDI.

### Response 200

```json
{
  "invoice": {
    "id": "inv_123",
    "type": "individual",
    "status": "stamped",
    "uuid": "1C3F0B1A-0000-0000-0000-000000000001",
    "provider": "facturapi",
    "providerInvoiceId": "facturapi-id",
    "subtotal": "74.14",
    "taxTotal": "11.86",
    "total": "86.00",
    "xmlAvailable": true,
    "pdfAvailableOnDemand": true
  },
  "items": [],
  "sale": {
    "id": "sale_123",
    "folio": "TP-SUC1-000124"
  }
}
```

---

## 9.3 GET `/manager/billing/invoices/{invoiceId}/xml`

Descarga XML.

### Response

```txt
application/xml
```

---

## 9.4 GET `/manager/billing/invoices/{invoiceId}/pdf`

Genera/consulta PDF bajo demanda.

### Response

```txt
application/pdf
```

---

## 9.5 POST `/manager/billing/invoices/{invoiceId}/cancel`

Solicita cancelación CFDI.

### Permisos

```txt
solo gerente
```

### Request

```json
{
  "satCancelReason": "02",
  "internalReason": "Cliente solicitó cancelación por error en datos fiscales.",
  "evidenceUrl": "https://drive.google.com/file/d/..."
}
```

### Validaciones

```txt
satCancelReason obligatorio
internalReason obligatorio
evidenceUrl opcional pero debe ser URL válida si existe
invoice debe estar stamped
usuario debe ser gerente
```

### Response 202

```json
{
  "cancellation": {
    "id": "can_123",
    "status": "processing",
    "invoiceId": "inv_123",
    "requestedAt": "2026-05-23T11:10:00-06:00"
  },
  "job": {
    "id": "job_can_123",
    "type": "invoice_cancel",
    "status": "pending"
  }
}
```

### Errors

```txt
403 PERMISSION_REQUIRED
422 CANCELLATION_REASON_REQUIRED
422 INTERNAL_REASON_REQUIRED
422 EVIDENCE_URL_INVALID
409 INVOICE_NOT_STAMPED
409 INVOICE_ALREADY_CANCELLED
```

---

# 10. Manual review

## 10.1 GET `/manager/billing/manual-review`

Lista casos que requieren revisión.

### Query

```txt
branchId
type
dateFrom
dateTo
```

### Response 200

```json
{
  "data": [
    {
      "id": "irq_123",
      "type": "invoice_request",
      "status": "requires_manual_review",
      "saleFolio": "TP-SUC1-000124",
      "lastErrorCode": "PROVIDER_TIMEOUT",
      "lastErrorMessage": "Facturapi no respondió tras 5 intentos.",
      "createdAt": "2026-05-23T10:40:00-06:00"
    }
  ]
}
```

---

## 10.2 POST `/manager/billing/manual-review/{entityId}/retry`

Reintenta un caso manual.

### Request

```json
{
  "entityType": "invoice_request",
  "reason": "Cliente confirmó datos fiscales correctos."
}
```

### Response 202

```json
{
  "job": {
    "id": "job_retry_123",
    "type": "invoice_retry",
    "status": "pending"
  }
}
```

---

# 11. Configuración fiscal manager

## 11.1 GET `/manager/billing/config`

Consulta configuración fiscal.

### Response 200

```json
{
  "billingEnabled": true,
  "autoInvoiceEnabled": true,
  "autoInvoiceExpiresPolicy": "end_of_month",
  "provider": "facturapi",
  "billingEntity": {
    "id": "be_123",
    "rfc": "TES010101ABC",
    "legalName": "TORTILLERIA LA ESPERANZA SA DE CV",
    "taxRegime": "601",
    "postalCode": "78000",
    "status": "active"
  },
  "policies": {
    "dailyGlobalRequiresManagerConfirmation": true,
    "pendingGlobalRequiresManagerConfirmation": true,
    "xmlStoragePolicy": "persistent",
    "pdfStoragePolicy": "on_demand",
    "maxInvoiceSubmitAttemptsPerHour": 5,
    "maxReceiptLookupAttemptsPerHour": 20
  }
}
```

---

## 11.2 PATCH `/manager/billing/config`

Actualiza configuración fiscal limitada.

### Request

```json
{
  "maxInvoiceSubmitAttemptsPerHour": 5,
  "maxReceiptLookupAttemptsPerHour": 20
}
```

### V1

No permitir cambiar:

```txt
autoInvoiceExpiresPolicy
pdfStoragePolicy
xmlStoragePolicy
```

sin soporte/admin.

---

## 11.3 POST `/manager/billing/entities`

Crea entidad fiscal V1.

### Request

```json
{
  "legalName": "TORTILLERIA LA ESPERANZA SA DE CV",
  "tradeName": "Tortillería La Esperanza",
  "rfc": "TES010101ABC",
  "taxRegime": "601",
  "postalCode": "78000",
  "email": "admin@tortilleria.mx",
  "phone": "4441234567"
}
```

### Response 201

```json
{
  "billingEntity": {
    "id": "be_123",
    "status": "pending_setup"
  }
}
```

---

## 11.4 POST `/manager/billing/entities/{billingEntityId}/certificates`

Registra o vincula CSD.

### Request conceptual

```json
{
  "provider": "facturapi",
  "uploadMode": "provider_dashboard",
  "providerCertificateId": "facturapi-certificate-id"
}
```

### Nota

Si se soporta upload directo de `.cer/.key`, debe manejarse con multipart y cifrado. V1 puede iniciar con onboarding guiado vía provider/dashboard.

---

# 12. Conciliación bancaria

## 12.1 POST `/manager/reconciliation/imports`

Carga archivo CSV/Excel.

### Content-Type

```txt
multipart/form-data
```

### Form fields

```txt
provider: bbva | mercadopago | clip
branchId: optional
file: csv/xlsx
```

### Response 202

```json
{
  "import": {
    "id": "rec_imp_123",
    "status": "uploaded",
    "provider": "bbva",
    "sourceFilename": "bbva_mayo.csv"
  },
  "job": {
    "id": "job_rec_123",
    "type": "reconciliation_process",
    "status": "pending"
  }
}
```

---

## 12.2 GET `/manager/reconciliation/imports/{importId}`

Consulta import.

### Response 200

```json
{
  "import": {
    "id": "rec_imp_123",
    "status": "processed",
    "provider": "bbva",
    "totalRows": 120,
    "validRows": 118,
    "invalidRows": 2
  }
}
```

---

## 12.3 GET `/manager/reconciliation/matches`

Lista matches.

### Query

```txt
branchId
provider
status
dateFrom
dateTo
minScore
```

### Response 200

```json
{
  "data": [
    {
      "id": "match_123",
      "status": "suggested",
      "confidenceScore": "92.50",
      "sale": {
        "id": "sale_123",
        "folio": "TP-SUC1-000124",
        "paymentAmount": "420.00",
        "paymentReference": "ABC123"
      },
      "bankMovement": {
        "id": "mov_123",
        "amount": "420.00",
        "reference": "ABC123",
        "movementDate": "2026-05-23T10:36:00-06:00"
      },
      "matchReason": {
        "amount": "exact",
        "reference": "exact",
        "timeWindow": "within_5_min"
      }
    }
  ]
}
```

---

## 12.4 POST `/manager/reconciliation/matches/{matchId}/confirm`

Confirma match sugerido.

### Response 200

```json
{
  "match": {
    "id": "match_123",
    "status": "confirmed",
    "confirmedAt": "2026-05-23T12:00:00-06:00"
  }
}
```

---

## 12.5 POST `/manager/reconciliation/matches/{matchId}/reject`

Rechaza match sugerido.

### Request

```json
{
  "reason": "No corresponde a esta venta."
}
```

### Response 200

```json
{
  "match": {
    "id": "match_123",
    "status": "rejected"
  }
}
```

---

# 13. Schemas

## 13.1 ReceiptStatus

```yaml
ReceiptStatus:
  type: string
  enum:
    - active
    - used
    - expired
    - blocked
    - cancelled
```

---

## 13.2 SaleFiscalStatus

```yaml
SaleFiscalStatus:
  type: string
  enum:
    - sale_completed
    - eligible_for_daily_global
    - pending_customer_invoice
    - invoice_processing
    - customer_invoiced
    - invoice_failed
    - requires_manual_review
    - expired_to_pending_global
    - included_in_global
    - cfdi_cancelled
    - cancelled
```

---

## 13.3 InvoiceStatus

```yaml
InvoiceStatus:
  type: string
  enum:
    - draft
    - stamping
    - stamped
    - stamp_failed
    - cancel_requested
    - cancelled
    - cancel_failed
```

---

## 13.4 GlobalBatchStatus

```yaml
GlobalBatchStatus:
  type: string
  enum:
    - prepared
    - confirmed
    - stamping
    - stamped
    - failed
    - cancelled
```

---

## 13.5 PublicReceipt

```yaml
PublicReceipt:
  type: object
  properties:
    id:
      type: string
    token:
      type: string
    status:
      $ref: '#/components/schemas/ReceiptStatus'
    expiresAt:
      type: string
      format: date-time
    canInvoice:
      type: boolean
```

---

## 13.6 TaxDataRequest

```yaml
TaxDataRequest:
  type: object
  required:
    - rfc
    - legalName
    - taxRegime
    - postalCode
    - cfdiUse
    - email
  properties:
    rfc:
      type: string
    legalName:
      type: string
    taxRegime:
      type: string
    postalCode:
      type: string
    cfdiUse:
      type: string
    email:
      type: string
      format: email
```

---

## 13.7 BillingInvoiceSummary

```yaml
BillingInvoiceSummary:
  type: object
  properties:
    id:
      type: string
    type:
      type: string
      enum: [individual, global_daily, global_pending_period]
    status:
      $ref: '#/components/schemas/InvoiceStatus'
    uuid:
      type: string
      nullable: true
    total:
      type: string
    stampedAt:
      type: string
      format: date-time
      nullable: true
```

---

## 13.8 ErrorResponse

```yaml
ErrorResponse:
  type: object
  properties:
    statusCode:
      type: integer
    error:
      type: string
    message:
      type: string
    details:
      type: object
      additionalProperties: true
```

---

# 14. Seguridad y rate limits

## 14.1 Portal público

Rate limits recomendados:

```txt
GET receipt:
20 por token por hora
60 por IP por hora

POST invoice:
5 por token por hora
10 por IP por hora
```

## 14.2 Manager

Rate limits más amplios pero auditados.

```txt
cancel invoice:
5 por usuario por hora

confirm global:
10 por branch por día
```

---

# 15. QA OpenAPI mínimo

```txt
OPENAPI-QA-001 Public receipt vigente responde 200.
OPENAPI-QA-002 Receipt vencido responde 409 RECEIPT_EXPIRED.
OPENAPI-QA-003 POST invoice timbra inmediato si provider OK.
OPENAPI-QA-004 POST invoice responde 202 si provider timeout.
OPENAPI-QA-005 Venta globalizada bloquea POST invoice.
OPENAPI-QA-006 Gerente puede preparar global diaria.
OPENAPI-QA-007 Gerente confirma global diaria.
OPENAPI-QA-008 Global vacía responde GLOBAL_BATCH_EMPTY.
OPENAPI-QA-009 Cajero no puede cancelar CFDI.
OPENAPI-QA-010 Gerente cancela CFDI con motivos obligatorios.
OPENAPI-QA-011 XML descarga si invoice stamped.
OPENAPI-QA-012 PDF se genera bajo demanda.
OPENAPI-QA-013 Reconciliation import acepta CSV BBVA.
OPENAPI-QA-014 Match sugerido puede confirmarse.
OPENAPI-QA-015 Match sugerido puede rechazarse.
```

---

## 16. Siguiente documento

Después de este documento, generar:

```txt
billing-jobs-queues-scheduler-v0.1.md
```
