# Tortilla Plus Fixed Roadmap V0.1

**Fecha base:** 2026-05-24  
**Fuente:** `docs/audits/tortilla-plus-operational-stability-audit-v0.2.md`  
**Regla:** este roadmap es fijo. Solo se actualiza el estado de cada item conforme se complete y valide. No se agregan trabajos fuera de orden salvo bloqueo tecnico documentado.

## Estado

```txt
[x] F0 Estabilidad operativa P0/P1
[x] F1 Billing y autofactura sin huecos
[x] F2 Conciliacion bancaria
[x] F3 Dashboard y reportes reales
[x] F4 Exportaciones
[x] F5 Integraciones fisicas y terminales
[x] F6 Permisos avanzados y hardening final
```

## F0 - Estabilidad operativa P0/P1

Estado: cerrado.

Alcance cerrado:

```txt
[x] VITE_USE_MOCKS=false
[x] audit:stability:e2e
[x] POS real
[x] cliente real
[x] credito real
[x] caja real
[x] ruta real
[x] liquidacion real
[x] inventario real
[x] P1 UX operativa
```

Validacion requerida:

```txt
npm run audit:stability:e2e
```

## F1 - Billing y autofactura sin huecos

Estado: cerrado.

Orden fijo:

```txt
[x] Factura individual real minima
[x] Factura global diaria real minima
[x] PAC mock para timbrado/cancelacion
[x] Documentos CFDI registrados
[x] Webhook PAC idempotente
[x] Autofactura publica minima
[x] Playwright E2E especifico de autofactura publica
[x] Descarga real o respuesta realista PDF/XML
[x] Rate limit por token/IP
[x] Expiracion programada de receipts
[x] Catalogos fiscales para regimen y uso CFDI
[x] Manager: listado/reimpresion de receipts QR
```

Criterio de cierre:

```txt
Venta con tarjeta crea receipt.
Portal /r/:token consulta ticket sin login.
Cliente genera autofactura una sola vez.
Factura queda stamped.
PDF/XML se pueden descargar.
Receipt vence automaticamente.
Intentos excesivos quedan bloqueados.
Manager puede consultar/reimprimir QR.
audit:stability:e2e pasa.
```

## F2 - Conciliacion bancaria

Estado: cerrado.

Orden fijo:

```txt
[x] Modelo/servicio ReconciliationService real
[x] POST /reconciliation/batches
[x] POST /reconciliation/batches/:id/items
[x] POST /reconciliation/batches/:id/review
[x] UI minima de conciliacion o bloqueo explicito
[x] Tests QA-REC con tenant/sucursal
```

Criterio de cierre:

```txt
Pagos POS se pueden comparar contra proveedor/import manual.
Diferencias quedan marcadas.
Revision manual queda auditada.
Listados filtran por tenant y sucursal.
audit:stability:e2e pasa.
```

Validacion ejecutada:

```txt
npm run audit:stability:e2e
OK: lint, build, unit 20/20, integracion 8/8, Playwright 2/2.
```

## F3 - Dashboard y reportes reales

Estado: cerrado.

Orden fijo:

```txt
[x] Dashboard real sin datos demo
[x] GET /reports/sales-by-day
[x] GET /reports/sales-by-branch
[x] GET /reports/sales-by-product
[x] GET /reports/sales-by-customer
[x] GET /reports/cash-withdrawals-by-reason
[x] GET /reports/cash-differences
[x] UI de reportes conectada a backend real
```

Criterio de cierre:

```txt
Con VITE_USE_MOCKS=false no hay dashboard/reportes demo.
Todos los reportes filtran por tenant, sucursal y fechas.
audit:stability:e2e pasa.
```

Validacion ejecutada:

```txt
npm run audit:stability:e2e
OK: lint, build, unit 20/20, integracion 9/9, Playwright 2/2.
```

## F4 - Exportaciones

Estado: cerrado.

Orden fijo:

```txt
[x] Exportacion facturas emitidas
[x] Exportacion facturas globales
[x] Exportacion reportes operativos
[x] Descarga CSV/XLSX minima
[x] Tests de generacion/descarga
```

Criterio de cierre:

```txt
Facturas emitidas se descargan en CSV/XLSX.
Facturas globales se descargan en CSV/XLSX.
Reportes operativos se descargan en CSV/XLSX.
Descargas filtran por tenant, sucursal y fechas.
audit:stability:e2e pasa.
```

Validacion ejecutada:

```txt
npm run audit:stability:e2e
OK: lint, build, unit 20/20, integracion 10/10, Playwright 2/2.
```

## F5 - Integraciones fisicas y terminales

Estado: cerrado.

Orden fijo:

```txt
[x] Terminal Mercado Pago
[x] Terminal Clip
[x] Bascula
[x] Codigo de barras
```

Criterio de cierre:

```txt
Cada integracion tiene contrato, modo mock de proveedor aislado, modo real documentado y fallback operativo.
audit:stability:e2e pasa.
```

Validacion ejecutada:

```txt
npm run audit:stability:e2e
OK: lint, build, unit 20/20, integracion 11/11, Playwright 2/2.
```

Documento de contratos:

```txt
docs/integrations/physical-integrations-v0.1.md
```

## F6 - Permisos avanzados y hardening final

Estado: cerrado.

Orden fijo:

```txt
[x] Matriz de permisos por pantalla/accion
[x] Tests por rol para billing
[x] Tests por rol para conciliacion
[x] Tests por rol para reportes/exportaciones
[x] Errores operativos claros
[x] Logs de auditoria visibles para acciones criticas
```

Criterio de cierre:

```txt
Permisos criticos documentados por pantalla/accion.
Roles bloquean billing, conciliacion, reportes y exportaciones segun matriz.
Errores 403 son operativos.
Auditoria critica es visible en Ajustes.
audit:stability:e2e pasa.
```

Validacion ejecutada:

```txt
npm run audit:stability:e2e
OK: lint, build, unit 20/20, integracion 12/12, Playwright 2/2.
```

Documento de matriz:

```txt
docs/security/permission-matrix-v0.1.md
```

## Politica de actualizacion

```txt
1. No saltar fases salvo bloqueo.
2. No marcar un item [x] sin prueba ejecutada.
3. Si un item se cubre de forma minima, usar [~] y registrar el hueco.
4. Cada avance debe actualizar este archivo y el checkpoint del audit.
5. No hacer commit salvo solicitud explicita.
```
