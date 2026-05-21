# Backend QA Core V0.1

Alcance: pruebas backend de suscripción, auth, permisos, caja, ventas e inventario.

## Suscripción

- QA-SUB-001: plan free bloquea facturación. Esperado: FEATURE_NOT_AVAILABLE.
- QA-SUB-002: plan free bloquea rutas. Esperado: FEATURE_NOT_AVAILABLE.
- QA-SUB-003: plan free bloquea segunda sucursal. Esperado: PLAN_LIMIT_REACHED.
- QA-SUB-004: plan free bloquea segundo POS. Esperado: PLAN_LIMIT_REACHED.
- QA-SUB-005: plan free bloquea cuarto usuario. Esperado: PLAN_LIMIT_REACHED.
- QA-SUB-006: suspended_limited permite POS básico. Esperado: venta permitida.
- QA-SUB-007: suspended_limited bloquea facturación. Esperado: SUBSCRIPTION_SUSPENDED_LIMITED.
- QA-SUB-008: webhook Mercado Pago idempotente. Esperado: no duplica pago ni evento.

## Auth y permisos

- QA-AUTH-001: login correcto. Esperado: tokens y sesión.
- QA-AUTH-002: password incorrecto. Esperado: INVALID_CREDENTIALS.
- QA-AUTH-003: usuario inactivo. Esperado: USER_INACTIVE.
- QA-AUTH-004: PIN correcto. Esperado: valid true.
- QA-AUTH-005: PIN incorrecto. Esperado: INVALID_PIN.
- QA-PERM-001: cajero intenta autorizar retiro. Esperado: PERMISSION_REQUIRED.
- QA-PERM-002: supervisor autoriza retiro. Esperado: movimiento autorizado.
- QA-PERM-003: usuario sin sucursal intenta vender. Esperado: BRANCH_ACCESS_DENIED.

## Caja

- QA-CASH-001: abrir caja sin caja previa. Esperado: cash_session open.
- QA-CASH-002: abrir caja con saldo sugerido. Esperado: opening_discrepancy 0.
- QA-CASH-003: abrir caja con discrepancia. Esperado: caja abre y audita discrepancia.
- QA-CASH-004: intentar segunda caja abierta en misma sucursal. Esperado: CASH_SESSION_ALREADY_OPEN.
- QA-CASH-005: registrar retiro. Esperado: pending_authorization.
- QA-CASH-006: supervisor autoriza retiro. Esperado: authorized.
- QA-CASH-007: gerente autoriza retiro remoto. Esperado: authorized.
- QA-CASH-008: rechazar retiro. Esperado: rejected.
- QA-CASH-009: cerrar caja con retiro pendiente. Esperado: PENDING_CASH_MOVEMENTS.
- QA-CASH-010: cerrar caja exacta. Esperado: difference_type none.
- QA-CASH-011: cerrar caja con faltante. Esperado: difference_type shortage.
- QA-CASH-012: cerrar caja con sobrante. Esperado: difference_type surplus.
- QA-CASH-013: cancelar movimiento no resuelto. Esperado: cancelled.
- QA-CASH-014: intentar reabrir caja cerrada. Esperado: CASH_SESSION_ALREADY_CLOSED.

## Producción e inventario

- QA-INV-001: producción diaria de tortilla. Esperado: stock aumenta y production_in.
- QA-INV-002: producción diaria de masa. Esperado: stock aumenta.
- QA-INV-003: producción con producto retail. Esperado: INVALID_PRODUCTION_PRODUCT.
- QA-INV-004: venta de tortilla descuenta inventario. Esperado: sale_out.
- QA-INV-005: paquete 800g descuenta producto base. Esperado: 10 paquetes descuentan 8kg.
- QA-INV-006: stock negativo tortilla. Esperado: permitido y auditado.
- QA-INV-007: stock negativo retail. Esperado: bloqueado.
- QA-INV-008: ajuste manual con motivo. Esperado: inventory_movement creado.
- QA-INV-009: ajuste manual sin motivo. Esperado: REASON_REQUIRED.
- QA-INV-010: cajero ajusta inventario. Esperado: PERMISSION_REQUIRED.
- QA-INV-011: registrar merma. Esperado: waste_out.
- QA-INV-012: editar producción cerrada. Esperado: CANNOT_EDIT_CLOSED_BATCH.

## Ventas

- QA-SALE-001: venta sin caja abierta. Esperado: NO_OPEN_CASH_SESSION.
- QA-SALE-002: venta por kilo. Esperado: total correcto.
- QA-SALE-003: venta por monto. Esperado: kg calculados.
- QA-SALE-004: venta por paquete. Esperado: total por paquete.
- QA-SALE-005: cobro efectivo. Esperado: venta completed.
- QA-SALE-006: cobro tarjeta con referencia. Esperado: payment y terminal reference.
- QA-SALE-007: tarjeta sin referencia. Esperado: CARD_REFERENCE_REQUIRED.
- QA-SALE-008: cobro mixto efectivo/tarjeta. Esperado: dos payments.
- QA-SALE-009: pagos menores al total. Esperado: PAYMENT_TOTAL_MISMATCH.
- QA-SALE-010: pagos mayores al total. Esperado: PAYMENT_TOTAL_MISMATCH.
- QA-SALE-011: cancelar draft como cajero. Esperado: cancelled.
- QA-SALE-012: cajero cancela venta cobrada. Esperado: PERMISSION_REQUIRED.
- QA-SALE-013: gerente cancela venta cobrada. Esperado: cancelled.
- QA-SALE-014: venta facturada no se cancela directo. Esperado: INVOICED_SALE_CANNOT_BE_CANCELLED_DIRECTLY.
- QA-SALE-015: devolución parcial autorizada. Esperado: return approved.
- QA-SALE-016: devolución excede cantidad vendida. Esperado: INVALID_RETURN_QUANTITY.
