# Integraciones Fisicas y Terminales V0.1

Fecha: 2026-05-25

## Alcance

F5 deja contratos operativos para terminales, bascula y codigo de barras con:

```txt
modo mock aislado para QA
modo real bloqueado si faltan credenciales o driver certificado
fallback manual explicito para continuidad operativa
auditoria de acciones criticas
```

## Endpoints

```txt
POST /api/v1/integrations/terminals/mercadopago/payments
POST /api/v1/integrations/terminals/clip/payments
GET  /api/v1/integrations/terminals/:provider/payments/:reference
POST /api/v1/integrations/scale/readings
GET  /api/v1/integrations/barcodes/:barcode
```

## Modos

```txt
PHYSICAL_INTEGRATIONS_MODE=mock
```

Modo default. No llama proveedores externos. Genera referencias deterministicas y permite completar venta capturando folio manual.

```txt
PHYSICAL_INTEGRATIONS_MODE=real
```

Mercado Pago requiere `MERCADOPAGO_ACCESS_TOKEN` y `MERCADOPAGO_TERMINAL_ID`.

Clip requiere `CLIP_API_KEY` y `CLIP_TERMINAL_ID`, pero el cobro real queda bloqueado con error operativo hasta instalar SDK Terminal o PinPad certificado en el dispositivo.

## Mercado Pago Point

Contrato interno:

```json
{
  "branchId": "uuid",
  "amount": "24.00",
  "externalReference": "venta-local",
  "terminalId": "opcional"
}
```

Respuesta:

```json
{
  "provider": "mercadopago",
  "mode": "mock|real",
  "status": "approved|pending|rejected",
  "reference": "folio proveedor",
  "fallback": "manual_reference_allowed"
}
```

Modo real sigue la documentacion oficial de Mercado Pago Point: crear una orden tipo `point`, asignarla a `terminal_id`, usar `X-Idempotency-Key` y guardar el `order.id` o `transactions.payments.id` para consulta/conciliacion.

Fuente: https://www.mercadopago.com.mx/developers/en/docs/mp-point/payment-processing

## Clip

Contrato interno:

```json
{
  "branchId": "uuid",
  "amount": "24.00",
  "externalReference": "venta-local",
  "terminalId": "opcional"
}
```

Modo mock queda listo para QA. Modo real queda bloqueado hasta instalar el SDK Terminal o PinPad de Clip en el cliente/dispositivo, porque la documentacion oficial presenta pagos presenciales mediante API de PinPad y SDK Terminal.

Fuente: https://developer.clip.mx/docs/getting-started

## Bascula

Contrato:

```json
{
  "branchId": "uuid",
  "deviceId": "scale-01",
  "weightKg": "1.250"
}
```

Fallback operativo:

```txt
manual_weight_allowed
```

Si no hay driver real, el operador captura peso manual. El backend valida cantidad positiva y audita lectura.

## Codigo de Barras

Contrato:

```txt
GET /api/v1/integrations/barcodes/:barcode?branchId=:branchId
```

Busca producto activo por `organizationId` y `barcode`; si se incluye sucursal, anexa precio activo de la sucursal.

Fallback operativo:

```txt
manual_product_search_allowed
```

## Criterio de Cierre F5

```txt
Mercado Pago tiene contrato, mock aislado, modo real documentado y fallback manual.
Clip tiene contrato, mock aislado, modo real documentado/bloqueado y fallback manual.
Bascula tiene contrato, mock/manual y auditoria.
Codigo de barras tiene lookup real contra productos y fallback de busqueda manual.
audit:stability:e2e pasa.
```
