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
[real] Autofactura publica genera receipt solo para pagos con tarjeta.
[pendiente] Si negocio requiere autofactura en efectivo, se debe definir politica antes de cambiar codigo.
```

No cerrado real:

```txt
[externo] PAC real
[externo] Certificados, CSD, sellado y cancelacion SAT real
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
Listo para construir facturacion real PAC: SI, sobre contrato interno existente; bloqueado por PAC/CSD/SAT reales.
Listo para Mercado Pago real: PARCIAL, contrato y fallback listos; bloqueado por credenciales/terminal real.
Listo para Clip real: PARCIAL, contrato y fallback listos; bloqueado por SDK/PinPad certificado.
Listo para bascula real: PARCIAL, contrato y fallback listos; bloqueado por driver/protocolo/dispositivo.
Bloqueantes pendientes: integraciones externas reales, E2E navegador profundo, politica de autofactura para efectivo si negocio la requiere.
```

## Comando de Aceptacion

```bash
npm run audit:stability:e2e
```
