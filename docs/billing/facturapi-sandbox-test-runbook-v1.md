# Runbook De Pruebas Facturapi Sandbox V1

Fecha base: 2026-05-26

Objetivo: validar que Facturacion Real V1 timbra, descarga documentos y cancela CFDI usando Facturapi sandbox real.

Fuentes oficiales consultadas:

- Autenticacion Bearer Token: https://docs.facturapi.io/docs/getting-started/authenticate/
- API Facturapi v2, descarga XML/PDF y acuse de cancelacion: https://docs.facturapi.io/api/

## 1. Precondiciones

Antes de iniciar, confirma:

- Cuenta Facturapi sandbox disponible.
- `FACTURAPI_API_KEY` de prueba, normalmente con prefijo `sk_test_`.
- Organizacion/emisor configurado en Facturapi.
- Datos fiscales de prueba definidos para receptor.
- Base local migrada.
- No pegar API keys, CSD, passwords ni tokens en logs.

## 2. Configuracion Local

En `apps/api/.env`, usar:

```env
BILLING_PROVIDER=facturapi
FACTURAPI_API_KEY=sk_test_xxx
FACTURAPI_ENV=sandbox
FACTURAPI_API_BASE_URL=https://www.facturapi.io/v2
FACTURAPI_PUBLIC_ZIP_CODE=64000
```

Luego ejecutar:

```bash
npm run db:generate -w @tortilla-plus/api
cd apps/api
npx prisma migrate deploy
cd ../..
npm run build -w @tortilla-plus/api
```

## 3. Levantar Aplicacion

En una terminal:

```bash
npm run dev -w @tortilla-plus/api
```

En otra terminal, si vas a probar desde UI:

```bash
npm run dev -w @tortilla-plus/web
```

## 4. Caso A - Autofactura Publica Tarjeta

Objetivo: tarjeta genera QR/receipt y el portal publico timbra CFDI sandbox.

Pasos:

1. Entrar como gerente demo.
2. Abrir caja si no hay sesion abierta.
3. Crear venta mostrador con pago `card`.
4. Confirmar que se genero `billing_receipt`.
5. Abrir portal publico con el token/URL del receipt.
6. Capturar datos fiscales:
   - RFC: `XAXX010101000` para publico general de prueba, o RFC sandbox validado.
   - Nombre: `PUBLICO EN GENERAL` o nombre fiscal de prueba.
   - Regimen: `616` si aplica para publico general.
   - CP: usar el CP configurado para pruebas.
   - Uso CFDI: `S01` para publico general.
   - Email de prueba.
7. Enviar solicitud de factura.
8. Confirmar respuesta `stamped`.
9. Descargar XML.
10. Descargar PDF.

Criterios de aceptacion:

- `provider = facturapi`.
- `providerInvoiceId` existe.
- `cfdiUuid` existe.
- XML contiene CFDI real.
- PDF descarga desde Facturapi.
- `billing_provider_logs.success = true`.
- El receipt queda `used`.
- Reintentar el mismo receipt devuelve duplicado/bloqueo.

## 5. Caso B - Factura Individual Manager

Objetivo: gerente timbra una factura individual desde venta elegible.

Pasos:

1. Crear cliente con datos fiscales completos o perfil fiscal activo.
2. Crear venta con cliente.
3. Completar venta con `requestInvoice=true` o `customerRequestedInvoice=true`.
4. Desde Billing Manager, crear factura individual.
5. Timbrar la factura.
6. Descargar XML/PDF desde endpoint manager o UI.

Criterios de aceptacion:

- Estado publico final: `stamped`.
- Venta queda `customer_invoiced`.
- `fiscalLockedAt` tiene valor.
- XML persiste con `contentSha256`.
- Provider log de `createInvoice` existe.

## 6. Caso C - Global Diaria

Objetivo: timbrar global diaria por sucursal y timezone.

Pasos:

1. Crear venta en efectivo sin solicitud de factura.
2. Confirmar que la venta queda `eligible_for_daily_global`.
3. Ir a Billing Manager.
4. Crear global diaria para la sucursal y fecha fiscal local.
5. Timbrar global.
6. Descargar XML/PDF.

Criterios de aceptacion:

- No duplica global para misma sucursal/fecha.
- Excluye ventas `pending_customer_invoice`.
- Estado final: `stamped`.
- Ventas incluidas quedan `included_in_global`.
- `fiscalLockedAt` tiene valor.
- Provider log de `createGlobalInvoice` existe.

## 7. Caso D - Transferencia Y Credito Bajo Solicitud

Objetivo: validar decisiones ADR.

Pasos transferencia:

1. Crear venta con pago `transfer` sin `requestInvoice`.
2. Confirmar que no genera receipt.
3. Crear otra venta `transfer` con `requestInvoice=true`.
4. Confirmar que genera receipt y puede autofacturar.

Pasos credito:

1. Crear venta `credit` sin `requestInvoice`.
2. Confirmar que queda para global.
3. Crear venta `credit` con `requestInvoice=true`.
4. Confirmar que genera receipt y queda `pending_customer_invoice`.

Criterios de aceptacion:

- Transferencia se comporta como efectivo bajo solicitud.
- Credito genera `pending_customer_invoice` solo con `requestInvoice=true`.

## 8. Caso E - Cancelacion CFDI

Objetivo: cancelar CFDI timbrado con Facturapi sandbox.

Pasos:

1. Tomar una factura `stamped`.
2. Ejecutar cancelacion desde Manager.
3. Usar motivo SAT, por ejemplo `02` si aplica al caso de prueba.
4. Agregar motivo interno legible.
5. Confirmar estado `cancelled`.
6. Revisar provider log `cancelInvoice`.
7. Si Facturapi entrega acuse, probar descarga manual en Facturapi:

```bash
curl https://www.facturapi.io/v2/invoices/<providerInvoiceId>/cancellation_receipt/xml ^
  -H "Authorization: Bearer <FACTURAPI_API_KEY>"
```

Criterios de aceptacion:

- Solo gerente/owner tecnico puede cancelar.
- No se cancela factura `draft`, `processing` o `failed`.
- Estado final `cancelled`.
- Error de proveedor queda logueado si falla.

## 9. Revision De Logs En Base De Datos

Usar una herramienta SQL y ejecutar:

```sql
select
  created_at,
  provider,
  operation,
  related_entity_type,
  related_entity_id,
  success,
  error_code,
  error_message,
  idempotency_key
from billing_provider_logs
order by created_at desc
limit 50;
```

Para documentos:

```sql
select
  i.id,
  i.status,
  i.cfdi_uuid,
  i.provider_invoice_id,
  i.pac_provider,
  d.document_type,
  d.content_type,
  d.content_sha256,
  length(d.storage_content) as storage_content_length
from invoices i
left join invoice_documents d on d.invoice_id = i.id
order by i.created_at desc
limit 20;
```

Para ventas:

```sql
select
  id,
  sale_number,
  fiscal_intent,
  fiscal_status,
  invoice_deadline_at,
  fiscal_locked_at,
  total,
  created_at
from sales
order by created_at desc
limit 30;
```

## 10. Que Reportar Si Falla

Pega en `docs/billing/facturapi-sandbox-test-log-v1.md`:

- Caso probado.
- Fecha/hora.
- Usuario/rol.
- `saleId`, `receiptId`, `invoiceId`.
- `providerInvoiceId`, si existe.
- `cfdiUuid`, si existe.
- `errorCode` normalizado.
- Mensaje Facturapi sanitizado.
- Paso exacto donde fallo.

No pegar:

- API keys.
- Tokens de sesion.
- CSD/private keys.
- XML completo si contiene datos sensibles reales.
- RFC real de cliente sin anonimizar.

## 11. Comandos De Regresion Despues De Ajustes

Despues de cualquier ajuste de codigo por error de sandbox:

```bash
npm run db:generate -w @tortilla-plus/api
npm run test -w @tortilla-plus/api
npm run test:integration -w @tortilla-plus/api
npm run audit:stability:e2e
```

## 12. Criterio De Cierre Sandbox

Sandbox se considera validado cuando:

- Autofactura tarjeta timbra.
- Individual manager timbra.
- Global diaria timbra.
- XML se persiste y puede descargarse aunque Facturapi falle despues.
- PDF se descarga bajo demanda.
- Cancelacion funciona o queda documentada con error Facturapi reproducible.
- No hay secretos en `billing_provider_logs`.
- Errores reales quedan clasificados con codigo normalizado.
