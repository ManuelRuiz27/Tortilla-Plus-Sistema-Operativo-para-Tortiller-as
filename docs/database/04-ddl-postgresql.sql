-- Tortilla Plus — DDL PostgreSQL V0.1
-- Estado: base documental. DDL completo se generará en V0.2 desde el modelo normalizado.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Reglas SQL críticas que deben existir en migraciones reales:

-- 1. Una sola caja abierta por sucursal.
-- CREATE UNIQUE INDEX uq_one_open_cash_session_per_branch
-- ON cash_sessions(branch_id)
-- WHERE status = 'open';

-- 2. Una sola suscripción viva por organización.
-- CREATE UNIQUE INDEX uq_one_live_subscription_per_org
-- ON subscriptions(organization_id)
-- WHERE status IN ('trial', 'active', 'past_due', 'grace_period', 'suspended_limited');

-- 3. Montos positivos en pagos, movimientos y ventas.
-- 4. Cantidades positivas en inventario, producción, venta y ruta.
-- 5. Webhooks idempotentes por event_id.
-- 6. Un cierre por caja: cash_closings.cash_session_id UNIQUE.
-- 7. Inventario único por sucursal/producto.

-- Pendiente V0.2:
-- - Crear enums.
-- - Crear tablas.
-- - Crear foreign keys.
-- - Crear índices.
-- - Crear checks.
-- - Crear seeds transaccionales.
