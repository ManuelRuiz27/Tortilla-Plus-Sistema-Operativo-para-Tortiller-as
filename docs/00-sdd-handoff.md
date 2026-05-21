# Tortilla Plus — SDD & Handoff Técnico V0.1

## 1. Contexto

**Tortilla Plus — V1 Operativa Comercial** es un backend SaaS para tortillerías. El objetivo no es solo registrar ventas, sino controlar dinero, mercancía, caja, producción, rutas, crédito, facturación y operación por sucursal.

## 2. Tesis del producto

> Reducir fugas de dinero, controlar mercancía y dar visibilidad al dueño aunque no esté físicamente en la tortillería.

## 3. Alcance backend V1

- SaaS multi-tenant.
- Organizaciones, marcas/negocios y sucursales.
- Planes `free` y `paid`.
- Cobro SaaS con Mercado Pago.
- Costo paid = tarifa base + costo por POS activo.
- Usuarios, roles, permisos y asignación por sucursal.
- POS backend.
- Caja: apertura, movimientos, retiros, autorizaciones, cierre.
- Ventas: kilo, monto, paquete configurable, productos retail, cobro mixto.
- Crédito/fiado para clientes recurrentes.
- Inventario por sucursal.
- Producción diaria de tortilla y masa.
- Merma.
- Rutas de reparto, cobros y liquidaciones.
- Conciliación manual de pagos con terminal.
- Facturación CFDI individual y global diaria por sucursal.
- Auditoría obligatoria.
- QA funcional backend.

## 4. Fuera de alcance V0.1

- Frontend PWA.
- POS Windows.
- Diseño UI/UX.
- GPS en rutas.
- Optimización automática de rutas.
- Integración real con terminal bancaria.
- Offline completo.
- App de repartidor.
- BI avanzado con data warehouse.

## 5. Documentos relacionados

```txt
/docs/backend/01-services.md
/docs/backend/02-openapi-contract.md
/docs/backend/03-critical-flows.md
/docs/backend/04-backend-qa.md
/docs/database/01-data-model.md
/docs/database/02-erd-rules.md
/docs/database/03-prisma-schema.prisma
/docs/database/04-ddl-postgresql.sql
/docs/database/05-seed.sql
```

## 6. Decisiones cerradas

- Un dueño puede administrar varios negocios/marcas bajo una organización.
- Una organización puede tener varias sucursales según plan.
- Plan `free`: POS básico, caja, inventario básico, producción; límites estrictos.
- Plan `paid`: facturación, multi-sucursal, rutas, reportes avanzados y conciliación.
- Suspensión por falta de pago: `past_due -> grace_period -> suspended_limited`.
- En `suspended_limited`, se permite POS básico, pero se bloquean módulos premium.
- Una sola caja activa por sucursal.
- Supervisor y gerente pueden autorizar retiros.
- No se puede cerrar caja con retiros pendientes.
- Tarjeta sin referencia se bloquea.
- Venta mixta puede incluir crédito solo con cliente habilitado.
- Si crédito excede límite, requiere autorización y auditoría.
- Tortilla/masa pueden venderse sin stock suficiente, generando alerta/auditoría.
- Reparto descuenta inventario al cargar producto.
- Factura global: diaria por sucursal.

## 7. Reglas rectoras

1. Ningún movimiento financiero se borra; se cancela o ajusta con auditoría.
2. Toda venta requiere caja abierta.
3. Todo movimiento de inventario debe pasar por ledger.
4. Toda operación física debe tener `branch_id`.
5. Toda entidad operativa debe respetar `organization_id`.
6. El backend valida permisos y plan; la UI no es fuente de seguridad.

## 8. Definition of Done backend

- Migraciones corren desde cero.
- Seed inicial crea plataforma usable.
- OpenAPI actualizado.
- Cada endpoint crítico valida permisos, plan y sucursal.
- No hay venta sin caja abierta.
- No hay dos cajas abiertas por sucursal.
- No se puede cerrar caja con retiros pendientes.
- Operaciones críticas generan `audit_logs`.
- Webhooks son idempotentes.
- QA smoke backend pasa.
