# ADR-billing-facturapi-v1: Alcance y politicas fiscales de Facturacion Real V1

## Status

Accepted

## Date

2026-05-25

## Context

El modulo de Facturacion Real V1 debe evolucionar el billing actual de Tortilla Plus desde PAC mock hacia Facturapi sandbox real. Antes de implementar adaptadores o cambios de codigo, se deben cerrar decisiones de alcance y reglas fiscales que estaban pendientes o ambiguas en los documentos fuente.

El plan rector exige un enfoque docs-first y prohibe implementar reglas fiscales implicitas.

## Decision Drivers

- Mantener Facturacion Real V1 enfocada en CFDI, autofactura, globales, cancelacion, XML/PDF y auditoria.
- Evitar que conciliacion bancaria amplie el alcance inicial.
- Resolver reglas de transferencia y credito/fiado antes de tocar POS o billing.
- Mantener compatibilidad con permisos existentes.
- Evitar crear documentacion basada en referencias invalidas.

## Decisions

1. **Conciliacion bancaria queda fuera de Facturacion Real V1.**
   - Puede permanecer documentada como modulo relacionado o futuro.
   - No bloquea ni forma parte del cierre de Facturacion Real V1.
   - No se implementara como parte del FacturapiAdapter ni de los flujos CFDI iniciales.

2. **Transferencia se trata igual que efectivo bajo solicitud.**
   - Transferencia sin `requestInvoice=true` no genera receipt/token.
   - Transferencia con `requestInvoice=true` genera `pending_customer_invoice` y receipt/token.

3. **Credito/fiado genera `pending_customer_invoice` solo con `requestInvoice=true`.**
   - Credito/fiado sin solicitud explicita no debe reservar automaticamente la venta para autofactura en V1.
   - Si se requiere otra politica fiscal para credito recurrente, debe registrarse en un ADR nuevo.

4. **`organization_owner` se mantiene como superrol tecnico.**
   - No reemplaza los roles operativos V1 de Cajero, Supervisor y Gerente.
   - Conserva acceso completo para administracion tecnica y permisos existentes.

5. **`docs/modulo-factutacion.md` es una referencia invalida.**
   - No se debe crear para satisfacer una referencia accidental.
   - Las fuentes validas para Facturacion Real V1 son los documentos listados en el plan rector y los ADRs aceptados.

## Consequences

### Positive

- El primer cierre de Facturacion Real V1 queda acotado a Facturapi, CFDI, autofactura, globales, cancelacion y documentos.
- Transferencia y credito/fiado ya tienen regla operativa.
- El modelo de permisos conserva compatibilidad con `organization_owner`.

### Negative

- Los documentos existentes de billing que mencionan conciliacion deben interpretarse como alcance relacionado, no como criterio de cierre de Facturacion Real V1.
- Si el negocio requiere credito/fiado con factura automatica, se necesitara otro ADR.

## Implementation Notes

- Actualizar el plan canonico `docs/billing/facturapi-implementation-plan-v1.md`.
- No implementar FacturapiAdapter hasta que este ADR y `ADR-billing-status-normalization-v1.md` esten cerrados.
- QA de Facturacion Real V1 no debe exigir conciliacion bancaria.

## Related Decisions

- `docs/adr/ADR-billing-status-normalization-v1.md`
- `docs/billing/facturapi-implementation-plan-v1.md`
