# Tortilla Plus - Operational Stability Audit V0.2

**Producto:** Tortilla Plus V1 Operativa Comercial  
**Freeze auditado:** 2026-05-25  
**Repositorio:** `ManuelRuiz27/Tortilla-Plus-Sistema-Operativo-para-Tortiller-as`

## Objetivo

Dejar el repo sin ambiguedad entre funcionalidad real, mock, stub, contrato y pendiente de produccion antes de construir modulos mayores como PAC real, Mercado Pago, Clip o bascula real.

Este freeze no implementa modulos nuevos ni redisenia UI.

## Leyenda

```txt
[real] implementado y con prueba automatizada o evidencia directa en codigo.
[mock] funciona con proveedor simulado; no es produccion externa.
[stub] respuesta local realista sin integracion final.
[contrato] API/DTO/fallback listo; integracion real pendiente.
[runtime] requiere validacion manual o E2E mas profunda.
[externo] depende de proveedor/dispositivo/credenciales.
[pendiente] no debe considerarse cerrado.
```

## Evidencia Revisada

```txt
package.json
apps/api/package.json
apps/web/package.json
apps/web/.env.example
apps/web/.env.audit.example
apps/api/src/services/billing-service.ts
apps/api/src/services/public-autofactura-service.ts
apps/api/src/services/permission-service.ts
apps/api/src/services/physical-integration-service.ts
apps/api/tests/integration/*.test.ts
apps/web/e2e/audit-smoke.spec.ts
docs/security/permission-matrix-v0.1.md
docs/integrations/physical-integrations-v0.1.md
```

## Scripts de Auditoria

Existen en `package.json` raiz:

```txt
[real] audit:stability -> lint + build + test
[real] audit:stability:integration -> audit:stability + API integration tests
[real] audit:stability:e2e -> audit:stability:integration + Playwright
```

Pruebas reales existentes:

```txt
[real] apps/api/tests/*.test.ts
[real] apps/api/tests/integration/*.test.ts
[real] apps/web/e2e/audit-smoke.spec.ts
```

Limitacion:

```txt
[runtime] Playwright es smoke operativo. No cubre navegador profundo de POS, ruta, caja, billing y permisos pantalla por pantalla.
```

## Politica de Mocks

Estado corregido:

```txt
[real] apps/web/.env.audit.example usa VITE_USE_MOCKS=false.
[real] apps/web/.env.example documenta que VITE_USE_MOCKS=true es solo demo/desarrollo visual.
```

Regla de aceptacion:

```txt
QA operativo siempre usa VITE_USE_MOCKS=false.
VITE_USE_MOCKS=true invalida evidencia operativa; solo sirve para demo visual.
```

## Estado por Modulo

### F0 Operacion Core

```txt
[real] POS con cliente, precio especial, pago mixto, caja e inventario
[real] Credito/fiado actualiza saldo
[real] Inventario descuenta por POS y ruta
[real] Ruta completa hasta liquidacion depositada
[real] Caja abre/cierra y registra movimientos
[runtime] Falta E2E navegador profundo, aunque hay integracion backend + DB
```

Evidencia:

```txt
apps/api/tests/integration/pos-operational-flow.test.ts
apps/api/tests/integration/reports-operational-flow.test.ts
apps/web/e2e/audit-smoke.spec.ts
```

### F1 Billing y Autofactura

```txt
[real] Factura individual interna minima
[real] Factura global diaria interna minima
[real] Factura global diaria usa timezone de sucursal
[mock] PAC de timbrado/cancelacion
[stub] PDF/XML realistas locales
[real] Webhook PAC idempotente
[real] Portal publico de autofactura
[real] Rate limit por token/IP
[real] Expiracion de receipts
[real] Catalogos fiscales basicos
```

Correccion aplicada:

```txt
billing-service.ts ya no corta factura global diaria con UTC puro.
Para sucursal usa branch.timezone y rango [inicio fiscal local, siguiente inicio fiscal local).
Esto evita que ventas cercanas a medianoche se asignen al dia fiscal incorrecto.
```

Autofactura:

```txt
[real] public-autofactura-service.ts genera receipt solo si hay pago con tarjeta.
[real] Existe prueba que confirma que pago en efectivo no genera receipt.
[pendiente] Si la politica comercial cambia para efectivo, se debe definir antes de implementar.
```

### F2 Conciliacion

```txt
[real] Lotes de conciliacion
[real] Partidas manuales/proveedor
[real] Revision manual auditada
[externo] Import automatico bancario o proveedor real
```

### F3 Reportes

```txt
[real] Dashboard consume backend real con mocks apagados
[real] Reportes por dia/sucursal/producto/cliente
[real] Retiros por motivo y diferencias de caja
```

### F4 Exportaciones

```txt
[real] CSV/XLSX minimo de facturas emitidas
[real] CSV/XLSX minimo de facturas globales
[real] CSV/XLSX minimo de reportes operativos
```

### F5 Integraciones Fisicas

No se considera cerrado real.

```txt
[contrato] Mercado Pago
[mock] Mercado Pago mock aislado
[contrato] Clip
[mock] Clip mock aislado
[contrato] Bascula
[mock] Lectura de bascula/manual
[real] Codigo de barras contra productos reales
[externo] Terminales, credenciales, SDK/PinPad y dispositivos reales
```

### F6 Permisos

Backend es la fuente de verdad. Guards frontend solo mejoran UX.

```txt
[real] cashier bloqueado de billing
[real] cashier bloqueado de conciliacion
[real] cashier bloqueado de reportes/exportaciones
[real] supervisor puede autorizar retiros con PIN
[real] supervisor no puede billing
[real] manager puede facturar
[real] organization_owner accede billing/reportes/conciliacion
[real] 403 PERMISSION_REQUIRED consistente para falta de permiso
```

Evidencia:

```txt
apps/api/tests/integration/permission-hardening-flow.test.ts
docs/security/permission-matrix-v0.1.md
```

## Hallazgos Residuales

```txt
1. PAC real no existe; timbrado/cancelacion siguen en mock.
2. Mercado Pago real no existe; solo contrato/mock/fallback.
3. Clip real no existe; solo contrato/mock/fallback.
4. Bascula real no existe; falta driver/protocolo/dispositivo.
5. Playwright cubre smoke, no flujos completos en navegador.
6. Autofactura esta limitada a tarjeta por decision actual; efectivo requiere politica.
7. Conciliacion externa bancaria/proveedor real sigue pendiente.
```

## Checklist Final

```txt
Listo para construir facturacion real: SI, con base interna estable; PAC/CSD/SAT pendientes.
Listo para Mercado Pago real: PARCIAL, contrato listo; credenciales/terminal real pendientes.
Listo para Clip real: PARCIAL, contrato listo; SDK/PinPad certificado pendiente.
Listo para bascula real: PARCIAL, contrato listo; driver/dispositivo pendiente.
Bloqueantes pendientes: integraciones externas reales y E2E profundo de navegador.
```

## Comando Final

Ejecutar:

```bash
npm run audit:stability:e2e
```
