# Deuda Tecnica Facturacion Real V1

Fecha base: 2026-05-26

Este documento acompana `docs/billing/facturapi-implementation-plan-v1.md`. Cada fase debe registrar deuda detectada, deuda cerrada, deuda diferida con motivo y evidencia antes de considerarse cerrada.

## Fase 1.2 - FacturapiAdapter Sandbox

### Deuda detectada

- Adapter real Facturapi pendiente; el factory devolvia `PROVIDER_NOT_CONFIGURED`.
- Errores de proveedor no estaban normalizados para operaciones reales.
- Logs de proveedor solo cubrian exito en flujos mock.

### Deuda cerrada

- `FacturapiAdapter` implementado detras de `PacAdapter` usando REST `fetch`, sin SDK.
- `BILLING_PROVIDER=mock` se conserva como default local/CI.
- `BILLING_PROVIDER=facturapi` exige `FACTURAPI_API_KEY` y `FACTURAPI_ENV=sandbox`.
- Errores Facturapi se normalizan a `PROVIDER_TIMEOUT`, `PROVIDER_UNAVAILABLE`, `INVALID_TAX_DATA`, `CERTIFICATE_ERROR`, `RATE_LIMITED`, `UNKNOWN_PROVIDER_ERROR`.
- Sanitizacion de logs expuesta y cubierta por prueba unitaria.

### Deuda diferida con motivo

- Payload CFDI definitivo queda pendiente de validacion contador/SAT. El builder V1 usa campos minimos y snapshots de venta, pero produccion requiere CSD, regimen, CP emisor y reglas fiscales finales.

### Evidencia

- `apps/api/src/services/billing-pac-adapter.ts`
- `apps/api/tests/billing-pac-adapter.test.ts`

## Fase 2 - Timbrado Individual Real

### Deuda detectada

- Autofactura publica timbraba directo con mock.
- El timbrado individual no persistia `providerInvoiceId`.
- Fallos PAC no dejaban ruta operativa ni provider log de error.

### Deuda cerrada

- Autofactura publica e invoice manager usan el adapter PAC.
- `providerInvoiceId` se persiste en `invoices`.
- Fallos PAC registran provider log sanitizado y dejan estados `failed` o `requires_manual_review`.
- Duplicados siguen bloqueados por `receipt`/`invoiceSale` antes de llamar proveedor.

### Deuda diferida con motivo

- Validacion SAT completa de receptor/emisor queda pendiente de contador y sandbox con CSD real.

### Evidencia

- `apps/api/src/services/public-autofactura-service.ts`
- `apps/api/src/services/billing-service.ts`
- `apps/api/prisma/migrations/0006_billing_facturapi_documents_status/migration.sql`

## Fase 3 - XML Persistente Y PDF Bajo Demanda

### Deuda detectada

- XML/PDF mock se trataban como fuente principal.
- `invoice_documents` no guardaba hash ni contenido persistente XML.

### Deuda cerrada

- XML se guarda con `storageContent`, `contentType` y `contentSha256`.
- PDF queda bajo demanda: en Facturapi se descarga desde proveedor; en mock se conserva generacion local.
- Descargas publicas prefieren XML persistido cuando existe.

### Deuda diferida con motivo

- Storage productivo S3/R2/MinIO queda pendiente. V1 guarda XML en base de datos para desarrollo/sandbox y trazabilidad inmediata.

### Evidencia

- `apps/api/prisma/schema.prisma`
- `apps/api/src/services/public-autofactura-service.ts`
- `apps/api/src/services/billing-service.ts`

## Fase 4 - Global Diaria Real

### Deuda detectada

- Global diaria usaba PAC mock y no bloqueaba fiscalmente ventas al timbrar.

### Deuda cerrada

- `stampInvoice` llama `createGlobalInvoice` para `global_public`.
- Al timbrar global, ventas quedan `included_in_global` y `fiscalLockedAt`.
- La seleccion sigue limitada a `fiscalStatus=eligible_for_daily_global`, sucursal y timezone.

### Deuda diferida con motivo

- CFDI global definitivo queda pendiente de validacion contador/SAT en sandbox.

### Evidencia

- `apps/api/src/services/billing-service.ts`
- `apps/api/tests/integration/billing-operational-flow.test.ts`

## Fase 5 - Cancelacion CFDI Real

### Deuda detectada

- Cancelacion usaba PAC mock sin motivo SAT.
- Fallos de cancelacion no quedaban en estado operativo diferenciado.

### Deuda cerrada

- `cancelInvoice` llama adapter real/mock.
- Se acepta `motive` SAT y `internalReason`; `reason` queda como compatibilidad temporal.
- Fallo PAC queda como `cancel_failed` con provider log.

### Deuda diferida con motivo

- Acuse de cancelacion queda pendiente hasta confirmar exposicion y formato con Facturapi sandbox.

### Evidencia

- `apps/api/src/services/billing-service.ts`

## Fase 6 - Manual Review, Reintentos E Idempotencia

### Deuda detectada

- Fallos retryable no tenian ruta operativa clara.

### Deuda cerrada

- Idempotency key enviada al proveedor por operacion.
- Timeouts/rate limits/provider unavailable pasan a `requires_manual_review`.
- Receipt no se marca `used` si falla timbrado publico.

### Deuda diferida con motivo

- `provider-status-sync` y retry automatico quedan para fase posterior; V1 deja manual review trazable.

### Evidencia

- `apps/api/src/services/billing-pac-adapter.ts`
- `apps/api/src/services/public-autofactura-service.ts`

## Fase 7 - Manager Billing UI Y Contratos

### Deuda detectada

- Manager recibia estados `draft`/`error` derivados del mock.

### Deuda cerrada

- `requested` se serializa como `processing`.
- `failed`, `requires_manual_review`, `cancel_processing` y `cancel_failed` quedan disponibles en enum interno para mapear al DTO catalog.

### Deuda diferida con motivo

- Ajustes visuales del Manager quedan como deuda UI si frontend aun no consume todos los campos nuevos (`provider`, `contentSha256`, errores normalizados).

### Evidencia

- `apps/api/prisma/schema.prisma`
- `apps/api/src/services/billing-service.ts`

## Fase 8 - QA Fiscal Y Cierre

### Deuda detectada

- Faltaba cobertura unitaria para mapper Facturapi, error mapper y sanitizer.

### Deuda cerrada

- Tests unitarios agregados para payload builder, error mapper, factory Facturapi y sanitizer.
- Tests de integracion actualizados a `processing` como estado publico.

### Deuda diferida con motivo

- Prueba sandbox real requiere `FACTURAPI_API_KEY`; CI continua en mock.

### Evidencia

- `apps/api/tests/billing-pac-adapter.test.ts`
- `apps/api/tests/integration/billing-operational-flow.test.ts`
- `npm run audit:stability:e2e` ejecutado correctamente el 2026-05-26.
