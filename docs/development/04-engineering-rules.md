# Engineering Rules — Backend Tortilla Plus

## Principio rector

Tortilla Plus no es un CRUD. Es un sistema operativo comercial. Caja, venta, inventario, crédito, rutas y facturación deben protegerse con reglas transaccionales.

## Reglas no negociables

1. No hay venta sin caja abierta.
2. No hay dos cajas abiertas por sucursal.
3. No se cierra caja con retiros pendientes.
4. Tarjeta sin referencia se bloquea.
5. Crédito requiere cliente con crédito habilitado.
6. Crédito sobre límite requiere autorización.
7. Producto retail sin stock se bloquea.
8. Tortilla y masa pueden venderse sin stock suficiente solo con auditoría.
9. Inventario se modifica por ledger, nunca directo.
10. Cobro de ruta no entra a caja hasta liquidación.
11. Factura global es diaria por sucursal.
12. Venta facturada no se cancela directo desde POS.
13. Webhooks deben ser idempotentes.
14. Toda operación crítica genera auditoría.
15. Ningún endpoint puede mezclar datos de otra organización.

## Estándar de servicio

Cada servicio debe tener:

- Responsabilidad única.
- Validación de permisos.
- Validación de sucursal cuando aplique.
- Validación de feature/plan cuando aplique.
- Transacción cuando modifique dinero, inventario, crédito o facturación.
- Errores de dominio explícitos.
- Auditoría cuando afecte operación crítica.

## Estándar de endpoint

Cada endpoint debe definir:

- Método HTTP.
- Ruta.
- Request body.
- Response body.
- Permiso requerido.
- Feature requerida.
- Errores esperados.
- Auditoría generada.

## Estándar de errores

Formato obligatorio:

```json
{
  "statusCode": 400,
  "error": "DOMAIN_ERROR_CODE",
  "message": "Descripción legible del error.",
  "details": {}
}
```

## Errores de dominio mínimos

- `NO_OPEN_CASH_SESSION`
- `CASH_SESSION_ALREADY_OPEN`
- `PENDING_CASH_MOVEMENTS`
- `CARD_REFERENCE_REQUIRED`
- `PAYMENT_TOTAL_MISMATCH`
- `CUSTOMER_REQUIRED_FOR_CREDIT`
- `CUSTOMER_CREDIT_DISABLED`
- `CUSTOMER_CREDIT_LIMIT_EXCEEDED`
- `INSUFFICIENT_STOCK`
- `NEGATIVE_STOCK_NOT_ALLOWED`
- `FEATURE_NOT_AVAILABLE`
- `PLAN_LIMIT_REACHED`
- `SUBSCRIPTION_SUSPENDED_LIMITED`
- `BRANCH_ACCESS_DENIED`
- `INVALID_TENANT_REFERENCE`
- `INVOICED_SALE_CANNOT_BE_CANCELLED_DIRECTLY`

## Transacciones obligatorias

Deben usar transacción de base de datos:

- Completar venta.
- Cancelar venta cobrada.
- Registrar devolución.
- Abrir caja.
- Cerrar caja.
- Autorizar retiro.
- Registrar producción.
- Registrar merma.
- Ajustar inventario.
- Cargar ruta.
- Liquidar ruta.
- Depositar efectivo de ruta a caja.
- Crear factura.
- Procesar webhook.

## Auditoría obligatoria

Acciones que deben generar `audit_logs`:

- Login exitoso/fallido.
- Apertura de caja.
- Discrepancia de apertura.
- Retiro solicitado.
- Retiro autorizado/rechazado.
- Cierre de caja.
- Faltante/sobrante.
- Venta completada.
- Venta cancelada.
- Devolución.
- Stock negativo permitido.
- Ajuste de inventario.
- Producción.
- Merma.
- Cambio de precio.
- Cambio de crédito.
- Pedido de ruta.
- Carga de ruta.
- Cobro de ruta.
- Liquidación de ruta.
- Factura solicitada/timbrada/cancelada.
- Webhook procesado.
- Bloqueo por plan o permisos.

## Multi-tenant

Todo query operativo debe filtrar por `organization_id` o derivarlo desde una entidad ya validada.

Está prohibido:

- Consultar por `id` sin validar tenant.
- Usar `branch_id` de otra organización.
- Usar `customer_id` de otra organización.
- Usar `product_id` de otra organización.
- Usar `cash_session_id` de otra sucursal.

## Gates de calidad

### Gate A — Foundation

- Prisma valida.
- Migración corre desde cero.
- Seed mínimo corre.
- Healthcheck OK.

### Gate B — Core operativo

- Caja terminada.
- Inventario ledger terminado.
- Producción terminada.

### Gate C — POS viable

- Venta completa funcional.
- Pagos funcionales.
- Stock descontado.
- Crédito funcional.

### Gate D — Comercial completo

- Rutas funcionales.
- Facturación mock funcional.
- Reportes base funcionales.

### Gate E — Release candidate

- Smoke tests completos.
- Tests multi-tenant.
- Tests transaccionales.
- OpenAPI formal.
- Documentación de arranque.

## Prohibiciones técnicas para V1

No implementar en V1 inicial:

- GPS de rutas.
- Optimización automática de rutas.
- Offline completo.
- Integración bancaria directa avanzada.
- BI con data warehouse.
- App móvil de repartidor.
- Machine learning.
- Sincronización multi-dispositivo compleja.

Estas funciones se documentan como futuras, no como parte del core inicial.
