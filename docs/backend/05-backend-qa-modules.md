# Backend QA Modules V0.1

Complemento QA para crédito, clientes, rutas, conciliación, facturación, auditoría, transacciones y multi-tenant.

## Crédito / Fiado

- QA-CRED-001: venta mixta con crédito válido. Esperado: balance aumenta.
- QA-CRED-002: crédito sin cliente. Esperado: CUSTOMER_REQUIRED_FOR_CREDIT.
- QA-CRED-003: cliente sin crédito habilitado. Esperado: CUSTOMER_CREDIT_DISABLED.
- QA-CRED-004: crédito dentro de límite. Esperado: customer_balance_movement charge.
- QA-CRED-005: exceder límite sin autorización. Esperado: CUSTOMER_CREDIT_LIMIT_EXCEEDED.
- QA-CRED-006: exceder límite con autorización. Esperado: permitido y auditado.
- QA-CRED-007: pago de deuda. Esperado: balance disminuye.

## Clientes y precios

- QA-CUST-001: crear cliente recurrente. Esperado: cliente activo.
- QA-CUST-002: tipo de cliente inválido. Esperado: INVALID_CUSTOMER_TYPE.
- QA-CUST-003: asignar precio especial. Esperado: customer_product_price activo.
- QA-CUST-004: precio especial tiene prioridad. Esperado: usa precio cliente.
- QA-CUST-005: precio especial por sucursal. Esperado: aplica solo en branch.
- QA-CUST-006: precio especial no aplica en otra sucursal. Esperado: usa precio normal.

## Rutas

- QA-DEL-001: crear pedido de reparto. Esperado: pending.
- QA-DEL-002: crear pedido en plan free. Esperado: FEATURE_NOT_AVAILABLE.
- QA-DEL-003: preparar pedido. Esperado: prepared.
- QA-DEL-004: cargar pedido. Esperado: loaded y descuenta inventario.
- QA-DEL-005: cargar paquete. Esperado: descuenta producto base.
- QA-DEL-006: cargar en estado inválido. Esperado: INVALID_DELIVERY_STATUS.
- QA-DEL-007: marcar en ruta. Esperado: in_route.
- QA-DEL-008: entrega completa. Esperado: delivered.
- QA-DEL-009: entrega parcial con devolución. Esperado: return pending_review.
- QA-DEL-010: cobro en ruta. Esperado: delivery_payment.
- QA-DEL-011: cobro en ruta no entra a caja. Esperado: sin cash_movement.
- QA-DEL-012: cobro parcial. Esperado: partially_paid y saldo pendiente.
- QA-DEL-013: liquidación exacta. Esperado: diferencia 0.
- QA-DEL-014: liquidación con faltante. Esperado: diferencia negativa.
- QA-DEL-015: depositar ruta a caja. Esperado: cash_movement route_cash_in.
- QA-DEL-016: depositar sin caja abierta. Esperado: CASH_SESSION_NOT_OPEN.

## Devoluciones de ruta

- QA-DRET-001: devolución queda pendiente. Esperado: pending_review.
- QA-DRET-002: devolución vendible. Esperado: route_return_in.
- QA-DRET-003: devolución como merma. Esperado: return_waste / waste_record.
- QA-DRET-004: revisar dos veces. Esperado: RETURN_ALREADY_REVIEWED.
- QA-DRET-005: cajero revisa devolución. Esperado: PERMISSION_REQUIRED.

## Conciliación

- QA-REC-001: conciliación exacta. Esperado: matched.
- QA-REC-002: conciliación con diferencia. Esperado: difference.
- QA-REC-003: item missing_in_provider. Esperado: status missing_in_provider.
- QA-REC-004: item amount_mismatch. Esperado: status amount_mismatch.
- QA-REC-005: revisar conciliación. Esperado: reviewed.
- QA-REC-006: cajero revisa conciliación. Esperado: PERMISSION_REQUIRED.

## Facturación

- QA-BILL-001: factura individual de venta completed. Esperado: invoice created.
- QA-BILL-002: facturar venta draft. Esperado: SALE_NOT_COMPLETED.
- QA-BILL-003: doble factura individual. Esperado: SALE_ALREADY_INVOICED.
- QA-BILL-004: timbrado exitoso. Esperado: UUID y documentos.
- QA-BILL-005: timbrado fallido. Esperado: PAC_STAMPING_FAILED.
- QA-BILL-006: factura global diaria. Esperado: global_public.
- QA-BILL-007: doble global diaria. Esperado: GLOBAL_INVOICE_ALREADY_EXISTS.
- QA-BILL-008: global sin ventas. Esperado: NO_SALES_TO_INVOICE.
- QA-BILL-009: editar factura timbrada. Esperado: INVOICE_CANNOT_BE_EDITED.
- QA-BILL-010: cancelar factura timbrada. Esperado: cancel_requested/cancelled.
- QA-BILL-011: webhook PAC idempotente. Esperado: no duplica evento.

## Reportes

- QA-REP-001: ventas por día. Esperado: totales correctos.
- QA-REP-002: ventas por sucursal. Esperado: solo branch filtrada.
- QA-REP-003: ventas por producto. Esperado: agrupación correcta.
- QA-REP-004: ventas por cliente. Esperado: agrupación correcta.
- QA-REP-005: retiros por motivo. Esperado: agrupación correcta.
- QA-REP-006: faltantes/sobrantes. Esperado: diferencias correctas.
- QA-REP-007: reportes avanzados en free. Esperado: FEATURE_NOT_AVAILABLE.

## Auditoría

- QA-AUD-001: venta completada genera audit_log.
- QA-AUD-002: retiro solicitado genera audit_log.
- QA-AUD-003: retiro autorizado genera audit_log.
- QA-AUD-004: ajuste de inventario guarda snapshot.
- QA-AUD-005: cambio de precio guarda snapshot.
- QA-AUD-006: factura timbrada genera audit_log.
- QA-AUD-007: webhook Mercado Pago genera audit_log.

## Transacciones

- QA-TX-001: venta falla por pago inválido. Esperado: no crea pagos ni descuenta stock.
- QA-TX-002: retail sin stock. Esperado: no completa venta.
- QA-TX-003: tarjeta sin referencia. Esperado: no crea payment.
- QA-TX-004: cierre con retiro pendiente. Esperado: no crea cash_closing.
- QA-TX-005: carga ruta falla por stock. Esperado: no cambia estado.
- QA-TX-006: webhook duplicado. Esperado: no duplica pago.
- QA-TX-007: timbrado fallido. Esperado: invoice failed y venta no marcada como invoiced.

## Multi-tenant

- QA-TEN-001: usuario org A ve branch org B. Esperado: BRANCH_ACCESS_DENIED.
- QA-TEN-002: venta con customer de otra org. Esperado: INVALID_TENANT_REFERENCE.
- QA-TEN-003: venta con product de otra org. Esperado: INVALID_TENANT_REFERENCE.
- QA-TEN-004: reporte org A no mezcla org B. Esperado: solo datos org A.
- QA-TEN-005: POS de branch A abre caja en branch B. Esperado: INVALID_DEVICE_BRANCH.

## Smoke tests mínimos

- QA-AUTH-001
- QA-SUB-001
- QA-SUB-006
- QA-CASH-001
- QA-CASH-004
- QA-CASH-005
- QA-CASH-006
- QA-CASH-009
- QA-CASH-010
- QA-INV-001
- QA-INV-005
- QA-INV-006
- QA-SALE-001
- QA-SALE-005
- QA-SALE-007
- QA-SALE-009
- QA-CRED-001
- QA-CRED-005
- QA-DEL-004
- QA-DEL-011
- QA-BILL-001
- QA-BILL-006
- QA-TX-001
- QA-TEN-001
