# ADR-billing-status-normalization-v1: Normalizacion de estados publicos de facturacion

## Status

Accepted

## Date

2026-05-25

## Context

Los documentos de billing usan vocabularios cercanos pero no identicos para estados de factura. El catalogo DTO define estados publicos como `processing` y `failed`, mientras algunos documentos tecnicos usan `stamping` y `stamp_failed` para describir ejecucion interna de timbrado.

Antes de implementar FacturapiAdapter o endpoints nuevos, se debe fijar que contrato gobierna las respuestas publicas.

## Decision Drivers

- El frontend y consumidores externos deben depender de un contrato estable.
- El DTO catalog es la fuente de verdad para DTOs publicos.
- Los estados internos pueden ser mas especificos, pero no deben filtrarse sin estar en el contrato publico.
- Cualquier nuevo estado publico debe pasar por actualizacion documental.

## Decision

1. **`billing-dto-catalog-v0.1.md` gobierna `InvoiceStatus` publico.**

2. **Los estados publicos de factura usan `processing` y `failed`.**
   - `processing` representa timbrado o cancelacion en proceso segun contexto del DTO.
   - `failed` representa fallo visible al usuario/manager cuando el detalle tecnico no debe exponerse como estado publico.

3. **`stamping` y `stamp_failed` solo pueden existir como estados internos o de job si se requieren.**
   - Pueden usarse en tablas internas, workers o provider logs.
   - Al responder API publica o Manager UI, deben mapearse a estados del DTO catalog.

4. **No introducir nuevos estados publicos sin actualizar DTO catalog y OpenAPI.**
   - Si se requiere un nuevo estado publico, primero se actualizan `docs/product/contracts/billing-dto-catalog-v0.1.md` y `docs/product/contracts/billing-openapi-v0.1.yaml`.
   - Si el cambio modifica semantica de negocio, se crea o actualiza ADR.

## Public Mapping

```txt
internal stamping      -> public processing
internal stamp_failed  -> public failed
internal cancel flow   -> public cancel_requested | cancel_processing | cancelled | cancel_failed
internal retry states  -> public processing | failed | requires_manual_review, segun caso
```

## Consequences

### Positive

- Frontend y API contracts quedan alineados.
- El backend conserva libertad para modelar detalle interno de jobs.
- Se evita filtrar estados tecnicos de provider como contrato publico.

### Negative

- Los servicios deben mapear estados internos a estados publicos antes de responder.
- Los documentos tecnicos que mencionan `stamping` o `stamp_failed` deben leerse como internos salvo que el DTO catalog los adopte formalmente.

## Implementation Notes

- Validar serializers/mappers de billing antes de exponer endpoints nuevos.
- Las pruebas de contrato deben esperar `processing`/`failed` en DTOs publicos.
- Los jobs pueden conservar nombres y estados operativos especificos si no salen como `InvoiceStatus` publico.

## Related Decisions

- `docs/adr/ADR-billing-facturapi-v1.md`
- `docs/product/contracts/billing-dto-catalog-v0.1.md`
- `docs/product/contracts/billing-openapi-v0.1.yaml`
