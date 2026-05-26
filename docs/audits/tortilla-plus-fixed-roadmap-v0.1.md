# Tortilla Plus Fixed Roadmap V0.1

**Fecha base:** 2026-05-24  
**Freeze auditado:** 2026-05-25  
**Regla:** no marcar cerrado real sin evidencia en codigo y prueba ejecutable.

## Leyenda de Estado

```txt
[real] existe implementacion productiva interna y prueba automatizada.
[mock] existe flujo funcional con mock aislado; no es produccion externa.
[contrato] existe API/DTO/fallback documentado; integracion real pendiente.
[runtime] requiere validacion manual o E2E mas profunda.
[externo] depende de proveedor, dispositivo fisico o credenciales reales.
[pendiente] no esta listo para construccion encima.
```

## Estado Ejecutivo

```txt
[real] F0 Estabilidad operativa P0/P1 backend
[mock] F1 Billing/autofactura con PAC mock
[contrato] F1.1 Facturacion Real V1 con Facturapi aprobada por ADR; base fiscal inicial implementada
[real] F2 Conciliacion bancaria por import/manual interno
[real] F3 Dashboard y reportes internos
[real] F4 Exportaciones internas CSV/XLSX minimo
[contrato] F5 Integraciones fisicas y terminales
[real] F6 Permisos backend criticos
[runtime] E2E navegador sigue siendo smoke, no cobertura profunda de todos los flujos
```

## F0 - Estabilidad Operativa P0/P1

Estado: **cerrado real para backend e integracion con DB; pendiente E2E profundo de navegador**.

Evidencia:

```txt
apps/api/tests/integration/pos-operational-flow.test.ts
apps/web/e2e/audit-smoke.spec.ts
npm run audit:stability:e2e
```

Alcance cerrado real:

```txt
[real] POS con cliente, precio especial, pago mixto, caja e inventario
[real] Inventario negativo permitido para tortilla/masa y bloqueado para retail
[real] Ruta completa: pedido, carga, entrega parcial, devolucion, cobro, liquidacion y deposito
[real] VITE_USE_MOCKS=false en entorno audit
[runtime] PWA solo tiene smoke E2E minimo
```

## F1 - Billing y Autofactura

Estado: **cerrado como implementacion interna minima con PAC mock; facturacion fiscal real pendiente**.

Evidencia:

```txt
apps/api/src/services/billing-service.ts
apps/api/src/services/public-autofactura-service.ts
apps/api/tests/integration/billing-operational-flow.test.ts
apps/web/e2e/audit-smoke.spec.ts
```

Alcance:

```txt
[real] Factura individual interna minima
[real] Factura global diaria interna minima
[real] Webhook PAC idempotente
[mock] Timbrado PAC
[mock] Cancelacion PAC
[mock] PDF/XML realistas generados localmente
[real] Portal publico /r/:token
[real] Rate limit y expiracion de receipts
[real] Catalogos fiscales basicos
[real] Manager lista/reimprime receipts QR
[real] Factura global diaria usa timezone de sucursal para evitar cortes UTC incorrectos
```

Decision documentada:

```txt
[real] Autofactura publica actual genera receipt solo para pagos con tarjeta.
[contrato] Facturacion Real V1 define tarjeta y mixto con tarjeta como QR automatico.
[contrato] Efectivo, transferencia y credito/fiado generan QR solo con requestInvoice=true.
[contrato] Conciliacion bancaria queda fuera de Facturacion Real V1.
[contrato] organization_owner se mantiene como superrol tecnico.
```

No cerrado real:

```txt
[externo] PAC real
[externo] Certificados, CSD, sellado y cancelacion SAT real
```

## F1.1 - Facturacion Real V1 con Facturapi

Estado: **aprobado como contrato/roadmap; base fiscal inicial implementada; Facturapi real pendiente**.

Evidencia documental:

```txt
docs/adr/ADR-billing-facturapi-v1.md
docs/adr/ADR-billing-status-normalization-v1.md
docs/billing/facturapi-implementation-plan-v1.md
docs/billing/facturapi-implementation-plan-v1-docs-first.md
apps/api/prisma/migrations/0004_sales_fiscal_fields/migration.sql
apps/api/src/services/billing-fiscal-classifier.ts
apps/api/src/services/billing-pac-adapter.ts
apps/api/src/services/billing-provider-log-service.ts
apps/api/tests/billing-fiscal-classifier.test.ts
apps/api/tests/billing-pac-adapter.test.ts
apps/api/prisma/migrations/0005_billing_provider_logs/migration.sql
apps/api/tests/integration/billing-operational-flow.test.ts
```

Avance tecnico inicial:

```txt
[real] Campos fiscales minimos en sales: fiscal_intent, fiscal_status, invoice_deadline_at, fiscal_locked_at.
[real] Fiscal classifier para cash/card/transfer/credit segun ADR.
[real] POS completeSale clasifica fiscalmente la venta.
[real] Tarjeta y mixto con tarjeta generan QR automatico.
[real] Efectivo, transferencia y credito/fiado generan QR solo con requestInvoice/customerRequestedInvoice.
[real] Receipt vencido mueve venta pending_customer_invoice a expired_to_pending_global.
[real] Autofactura stamped mueve venta a customer_invoiced y fiscal_locked_at.
[real] PacAdapter formal creado.
[real] MockPacAdapter conservado y centralizado.
[real] Timbrado/cancelacion mock existentes pasan por PacAdapter.
[real] billing_provider_logs minimo creado.
[real] Llamadas PAC mock exitosas registran provider, operacion, entidad relacionada, duracion y payload sanitizado.
[contrato] FacturapiAdapter queda pendiente y bloqueado por sandbox/configuracion real.
```

Alcance aprobado:

```txt
[contrato] Facturapi sera el proveedor PAC inicial en sandbox.
[contrato] Mock PAC se conserva para pruebas.
[contrato] POS no llama Facturapi directamente.
[contrato] Provider real debe ir detras de PacAdapter/BillingProvider.
[contrato] Factura individual real.
[contrato] Factura global diaria real por branchId y timezone de sucursal.
[contrato] Autofactura publica real.
[contrato] Cancelacion CFDI.
[contrato] XML persistente.
[contrato] PDF bajo demanda.
[contrato] Auditoria fiscal y provider logs sanitizados.
[contrato] InvoiceStatus publico usa DTO catalog: processing/failed.
[contrato] stamping/stamp_failed solo internos o de jobs si se requieren.
```

Fuera de alcance de Facturacion Real V1:

```txt
[real] Conciliacion bancaria interna/manual permanece como F2 separado.
[externo] Conciliacion bancaria externa/proveedor real no bloquea Facturacion Real V1.
[externo] Mercado Pago real, Clip real y bascula real siguen fuera de este modulo.
```

Siguiente fase permitida:

```txt
[real] Migraciones/enums/base fiscal inicial.
[real] Fiscal classifier integrado a completeSale.
[real] PacAdapter/MockPacAdapter formal.
[pendiente] Portal publico y timbrado individual.
[pendiente] FacturapiAdapter sandbox real.
```

## F2 - Conciliacion Bancaria

Estado: **cerrado real para conciliacion interna/manual; integraciones bancarias externas pendientes**.

Evidencia:

```txt
apps/api/src/services/reconciliation-service.ts
apps/api/tests/integration/reconciliation-operational-flow.test.ts
```

Alcance:

```txt
[real] POST /reconciliation/batches
[real] POST /reconciliation/batches/:id/items
[real] POST /reconciliation/batches/:id/review
[real] UI minima conectada a backend real
[real] Auditoria de revision manual
[externo] Import automatico bancario o proveedor real
```

## F3 - Dashboard y Reportes

Estado: **cerrado real para reportes operativos internos**.

Evidencia:

```txt
apps/api/src/services/reports-service.ts
apps/api/tests/integration/reports-operational-flow.test.ts
apps/web/src/api/manager.api.ts
```

Alcance:

```txt
[real] Dashboard sin demo con VITE_USE_MOCKS=false
[real] Ventas por dia, sucursal, producto y cliente
[real] Retiros por motivo
[real] Diferencias de caja
[real] Filtros por tenant, sucursal y fechas
```

## F4 - Exportaciones

Estado: **cerrado real minimo**.

Evidencia:

```txt
apps/api/src/services/export-service.ts
apps/api/tests/integration/export-operational-flow.test.ts
```

Alcance:

```txt
[real] Exportacion de facturas emitidas
[real] Exportacion de facturas globales
[real] Exportacion de reportes operativos
[real] CSV/XLSX minimo sin dependencia externa
```

## F5 - Integraciones Fisicas y Terminales

Estado: **no cerrado real; cerrado solo como contrato/mock/fallback**.

Evidencia:

```txt
apps/api/src/services/physical-integration-service.ts
apps/api/tests/integration/physical-integrations-operational-flow.test.ts
docs/integrations/physical-integrations-v0.1.md
```

Alcance cerrado:

```txt
[contrato] Mercado Pago Point
[mock] Mercado Pago mock aislado
[contrato] Clip
[mock] Clip mock aislado
[contrato] Bascula
[mock] Lectura de bascula/manual auditada
[real] Codigo de barras resuelve productos reales por tenant/sucursal
[real] Fallback manual documentado
```

Pendiente de produccion:

```txt
[externo] Credenciales Mercado Pago reales
[externo] Terminal Mercado Pago real
[externo] Credenciales Clip reales
[externo] SDK/PinPad Clip certificado
[externo] Driver/protocolo de bascula real
[runtime] Prueba con dispositivos fisicos en sucursal
```

## F6 - Permisos Avanzados y Hardening

Estado: **cerrado real para permisos backend criticos; guards frontend son defensa UX, no fuente de verdad**.

Evidencia:

```txt
apps/api/src/services/permission-service.ts
apps/api/tests/integration/permission-hardening-flow.test.ts
apps/web/src/shared/guards/permission-guard.tsx
apps/web/src/shared/guards/role-guard.tsx
docs/security/permission-matrix-v0.1.md
```

Casos cubiertos:

```txt
[real] cashier no accede billing
[real] cashier no accede conciliacion
[real] cashier no accede reportes/exportaciones
[real] supervisor puede conciliacion/reportes
[real] supervisor no puede facturar
[real] supervisor puede autorizar retiros con PIN
[real] manager puede facturar
[real] organization_owner accede billing/reportes/conciliacion
[real] usuario sin permiso recibe 403 PERMISSION_REQUIRED consistente
```

## Politica de Mocks

```txt
apps/web/.env.audit.example debe usar VITE_USE_MOCKS=false.
apps/web/.env.example puede usar VITE_USE_MOCKS=true solo para demo/desarrollo visual.
Ningun QA operativo se acepta con VITE_USE_MOCKS=true.
```

## Checklist de Preparacion

```txt
Listo para construir facturacion real PAC: SI, sobre contrato interno existente y ADRs Facturapi V1 cerrados; produccion sigue bloqueada por PAC/CSD/SAT reales.
Listo para Mercado Pago real: PARCIAL, contrato y fallback listos; bloqueado por credenciales/terminal real.
Listo para Clip real: PARCIAL, contrato y fallback listos; bloqueado por SDK/PinPad certificado.
Listo para bascula real: PARCIAL, contrato y fallback listos; bloqueado por driver/protocolo/dispositivo.
Bloqueantes pendientes: integraciones externas reales, E2E navegador profundo, validacion Facturapi sandbox con credenciales/CSD reales.
```

## F1.1 - Facturacion Real V1 / Facturapi

Estado: **adapter real y base fiscal implementados para sandbox; produccion fiscal sigue bloqueada por validacion externa SAT/contador/CSD**.

Evidencia:

```txt
docs/adr/ADR-billing-facturapi-v1.md
docs/adr/ADR-billing-status-normalization-v1.md
docs/billing/facturapi-implementation-plan-v1.md
docs/billing/facturapi-technical-debt-v1.md
apps/api/src/services/billing-pac-adapter.ts
apps/api/src/services/billing-service.ts
apps/api/src/services/public-autofactura-service.ts
apps/api/prisma/migrations/0004_sales_fiscal_fields/migration.sql
apps/api/prisma/migrations/0005_billing_provider_logs/migration.sql
apps/api/prisma/migrations/0006_billing_facturapi_documents_status/migration.sql
apps/api/tests/billing-pac-adapter.test.ts
apps/api/tests/billing-fiscal-classifier.test.ts
apps/api/tests/integration/billing-operational-flow.test.ts
```

Alcance cerrado:

```txt
[real] FacturapiAdapter REST detras de PacAdapter
[mock] MockPacAdapter conservado como default local/CI
[contrato] InvoiceStatus publico normalizado a DTO catalog
[real] provider logs sanitizados en exito y fallo
[real] providerInvoiceId persistente
[real] XML persistente con SHA-256
[real] PDF bajo demanda para Facturapi
[real] cancelacion por adapter con motivo SAT
[real] transferencia y credito bajo solicitud de factura
[real] organization_owner conservado como superrol tecnico
```

Pendiente de cierre final:

```txt
[externo] FACTURAPI_API_KEY sandbox y CSD/configuracion fiscal validos
[externo] validacion contador/SAT del payload individual/global
[infra] storage productivo externo para XML
[runtime] provider-status-sync para timeout ambiguo
[qa] npm run audit:stability:e2e pasa
```

## Comando de Aceptacion

```bash
npm run audit:stability:e2e
```
