-- Tortilla Plus - DDL PostgreSQL V0.1
-- Base operativa inicial para revision backend.
-- Ejecutar solo en entorno local/dev hasta validar migraciones formales.
-- Fuente canonica de referencia DDL: este archivo con extension .sql.
-- El archivo docs/database/04-ddl-postgresql sin extension es draft no canonico.
-- Sprint 0 debe usar Prisma como fuente principal de migraciones y comparar contra este DDL.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ENUMS
CREATE TYPE organization_status AS ENUM ('active','past_due','grace_period','suspended_limited','cancelled');
CREATE TYPE generic_status AS ENUM ('active','inactive','deleted');
CREATE TYPE subscription_status AS ENUM ('trial','active','past_due','grace_period','suspended_limited','cancelled','expired');
CREATE TYPE billing_period AS ENUM ('monthly','annual');
CREATE TYPE subscription_provider AS ENUM ('mercadopago','manual');
CREATE TYPE subscription_item_type AS ENUM ('base_plan','pos_device','branch_extra','user_extra');
CREATE TYPE saas_payment_status AS ENUM ('pending','approved','rejected','cancelled','refunded','failed');
CREATE TYPE user_status AS ENUM ('active','inactive','locked','deleted');
CREATE TYPE role_scope AS ENUM ('platform','organization','branch');
CREATE TYPE device_type AS ENUM ('pwa','windows','tablet','desktop');
CREATE TYPE device_status AS ENUM ('pending_activation','active','inactive','blocked');
CREATE TYPE product_type AS ENUM ('tortilla','masa','package','retail','service');
CREATE TYPE product_unit AS ENUM ('kg','piece','package','liter','service');
CREATE TYPE sale_mode AS ENUM ('by_kg','by_amount','by_package','by_unit');
CREATE TYPE inventory_movement_type AS ENUM ('production_in','sale_out','route_load_out','route_return_in','waste_out','manual_adjustment_in','manual_adjustment_out','return_in','return_waste');
CREATE TYPE production_batch_status AS ENUM ('open','closed','cancelled');
CREATE TYPE waste_reason AS ENUM ('tortilla_rota','masa_echada_a_perder','producto_vencido','devolucion_no_revendible','otro');
CREATE TYPE cash_session_status AS ENUM ('open','closing','closed','cancelled');
CREATE TYPE cash_movement_direction AS ENUM ('in','out');
CREATE TYPE cash_movement_type AS ENUM ('cash_in','cash_out','adjustment_in','adjustment_out','route_cash_in');
CREATE TYPE cash_movement_status AS ENUM ('recorded','pending_authorization','authorized','rejected','cancelled');
CREATE TYPE difference_type AS ENUM ('none','shortage','surplus');
CREATE TYPE sale_status AS ENUM ('draft','completed','cancelled','partially_refunded','refunded','invoiced');
CREATE TYPE sale_type AS ENUM ('counter','customer_order','route');
CREATE TYPE payment_method AS ENUM ('cash','card','transfer','credit');
CREATE TYPE payment_status AS ENUM ('pending','completed','cancelled','refunded');
CREATE TYPE sale_return_status AS ENUM ('pending','approved','rejected','cancelled');
CREATE TYPE inventory_condition AS ENUM ('sellable','waste','review_required');
CREATE TYPE customer_type AS ENUM ('tienda','puesto','comedor','repartidor','cliente_frecuente','empresa','otro');
CREATE TYPE customer_balance_movement_type AS ENUM ('charge','payment','adjustment','refund');
CREATE TYPE delivery_order_status AS ENUM ('pending','prepared','loaded','in_route','delivered','partially_paid','paid','returned','cancelled');
CREATE TYPE delivery_settlement_status AS ENUM ('open','closed','cancelled');
CREATE TYPE delivery_return_status AS ENUM ('pending_review','returned_to_inventory','marked_as_waste','cancelled');
CREATE TYPE reconciliation_status AS ENUM ('draft','matched','difference','reviewed','cancelled');
CREATE TYPE reconciliation_item_status AS ENUM ('matched','missing_in_provider','missing_in_pos','amount_mismatch');
CREATE TYPE invoice_type AS ENUM ('individual','global_public');
CREATE TYPE invoice_status AS ENUM ('draft','requested','stamped','failed','cancel_requested','cancelled');
CREATE TYPE invoice_document_type AS ENUM ('xml','pdf');
CREATE TYPE analytics_snapshot_type AS ENUM ('daily_sales','daily_cash','daily_inventory','daily_routes','monthly_summary');

-- TENANCY / SAAS
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(160) NOT NULL,
  legal_name VARCHAR(200),
  tax_id VARCHAR(30),
  contact_email VARCHAR(180) NOT NULL,
  contact_phone VARCHAR(30),
  status organization_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE business_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  name VARCHAR(160) NOT NULL,
  trade_name VARCHAR(200),
  business_type VARCHAR(80),
  status generic_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  business_unit_id UUID NOT NULL REFERENCES business_units(id) ON DELETE RESTRICT,
  name VARCHAR(160) NOT NULL,
  address TEXT,
  phone VARCHAR(30),
  timezone VARCHAR(80) NOT NULL DEFAULT 'America/Mexico_City',
  status generic_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(60) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  description TEXT,
  status generic_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE plan_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  limit_value INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_plan_feature UNIQUE (plan_id, feature_id)
);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
  status subscription_status NOT NULL DEFAULT 'trial',
  billing_period billing_period NOT NULL DEFAULT 'monthly',
  provider subscription_provider NOT NULL DEFAULT 'mercadopago',
  provider_subscription_id VARCHAR(180),
  started_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  grace_until TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE subscription_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  item_type subscription_item_type NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'MXN',
  status generic_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE saas_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE RESTRICT,
  provider subscription_provider NOT NULL DEFAULT 'mercadopago',
  provider_payment_id VARCHAR(180) UNIQUE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency CHAR(3) NOT NULL DEFAULT 'MXN',
  status saas_payment_status NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE mercadopago_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id VARCHAR(180) NOT NULL UNIQUE,
  event_type VARCHAR(120) NOT NULL,
  provider_resource_id VARCHAR(180),
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  raw_payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- USERS / RBAC
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE RESTRICT,
  name VARCHAR(160) NOT NULL,
  email VARCHAR(180) NOT NULL,
  phone VARCHAR(30),
  password_hash TEXT NOT NULL,
  pin_hash TEXT,
  status user_status NOT NULL DEFAULT 'active',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_users_org_email UNIQUE (organization_id, email)
);

CREATE TABLE roles (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), code VARCHAR(80) NOT NULL UNIQUE, name VARCHAR(120) NOT NULL, scope role_scope NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE permissions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), code VARCHAR(100) NOT NULL UNIQUE, name VARCHAR(140) NOT NULL, description TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE role_permissions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE, permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), CONSTRAINT uq_role_permission UNIQUE (role_id, permission_id));
CREATE TABLE user_roles (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT, organization_id UUID REFERENCES organizations(id) ON DELETE RESTRICT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), CONSTRAINT uq_user_role_org UNIQUE (user_id, role_id, organization_id));
CREATE TABLE user_branch_assignments (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE, is_default BOOLEAN NOT NULL DEFAULT false, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), CONSTRAINT uq_user_branch UNIQUE (user_id, branch_id));
CREATE TABLE user_sessions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, refresh_token_hash TEXT NOT NULL, device_info TEXT, expires_at TIMESTAMPTZ NOT NULL, revoked_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now());

-- POS / PRODUCTS / INVENTORY
CREATE TABLE pos_devices (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID NOT NULL REFERENCES organizations(id), branch_id UUID NOT NULL REFERENCES branches(id), device_name VARCHAR(160) NOT NULL, device_code VARCHAR(120) NOT NULL UNIQUE, device_type device_type NOT NULL, status device_status NOT NULL DEFAULT 'pending_activation', licensed BOOLEAN NOT NULL DEFAULT false, last_seen_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE product_categories (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID NOT NULL REFERENCES organizations(id), name VARCHAR(140) NOT NULL, status generic_status NOT NULL DEFAULT 'active', created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), CONSTRAINT uq_product_category_org_name UNIQUE (organization_id, name));
CREATE TABLE products (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID NOT NULL REFERENCES organizations(id), category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL, name VARCHAR(160) NOT NULL, sku VARCHAR(80), barcode VARCHAR(120), product_type product_type NOT NULL, unit product_unit NOT NULL, is_sellable BOOLEAN NOT NULL DEFAULT true, requires_production BOOLEAN NOT NULL DEFAULT false, is_stock_tracked BOOLEAN NOT NULL DEFAULT true, status generic_status NOT NULL DEFAULT 'active', created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), CONSTRAINT uq_products_org_sku UNIQUE (organization_id, sku), CONSTRAINT uq_products_org_barcode UNIQUE (organization_id, barcode));
CREATE TABLE product_package_configs (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), product_id UUID NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE, base_product_id UUID NOT NULL REFERENCES products(id), package_weight_grams NUMERIC(12,3) NOT NULL CHECK (package_weight_grams > 0), created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), CONSTRAINT chk_package_not_self_base CHECK (product_id <> base_product_id));
CREATE TABLE branch_product_prices (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID NOT NULL REFERENCES organizations(id), branch_id UUID NOT NULL REFERENCES branches(id), product_id UUID NOT NULL REFERENCES products(id), sale_mode sale_mode NOT NULL, price NUMERIC(12,2) NOT NULL CHECK (price >= 0), currency CHAR(3) NOT NULL DEFAULT 'MXN', active_from TIMESTAMPTZ NOT NULL, active_to TIMESTAMPTZ, status generic_status NOT NULL DEFAULT 'active', created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), CONSTRAINT chk_branch_product_price_dates CHECK (active_to IS NULL OR active_to > active_from));
CREATE TABLE inventory_stocks (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID NOT NULL REFERENCES organizations(id), branch_id UUID NOT NULL REFERENCES branches(id), product_id UUID NOT NULL REFERENCES products(id), quantity NUMERIC(12,3) NOT NULL DEFAULT 0, reserved_quantity NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0), minimum_quantity NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (minimum_quantity >= 0), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), CONSTRAINT uq_inventory_stock_branch_product UNIQUE (branch_id, product_id));
CREATE TABLE inventory_movements (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID NOT NULL REFERENCES organizations(id), branch_id UUID NOT NULL REFERENCES branches(id), product_id UUID NOT NULL REFERENCES products(id), movement_type inventory_movement_type NOT NULL, quantity NUMERIC(12,3) NOT NULL CHECK (quantity > 0), unit product_unit NOT NULL, reason TEXT, reference_type VARCHAR(80), reference_id UUID, created_by_user_id UUID NOT NULL REFERENCES users(id), authorized_by_user_id UUID REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE production_batches (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID NOT NULL REFERENCES organizations(id), branch_id UUID NOT NULL REFERENCES branches(id), production_date DATE NOT NULL, status production_batch_status NOT NULL DEFAULT 'open', created_by_user_id UUID NOT NULL REFERENCES users(id), closed_by_user_id UUID REFERENCES users(id), closed_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE production_batch_items (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), production_batch_id UUID NOT NULL REFERENCES production_batches(id) ON DELETE CASCADE, product_id UUID NOT NULL REFERENCES products(id), produced_quantity NUMERIC(12,3) NOT NULL CHECK (produced_quantity > 0), unit product_unit NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), CONSTRAINT uq_production_batch_product UNIQUE (production_batch_id, product_id));
CREATE TABLE waste_records (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID NOT NULL REFERENCES organizations(id), branch_id UUID NOT NULL REFERENCES branches(id), product_id UUID NOT NULL REFERENCES products(id), quantity NUMERIC(12,3) NOT NULL CHECK (quantity > 0), unit product_unit NOT NULL, waste_reason waste_reason NOT NULL, inventory_movement_id UUID REFERENCES inventory_movements(id) ON DELETE SET NULL, created_by_user_id UUID NOT NULL REFERENCES users(id), authorized_by_user_id UUID REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now());

-- CASH / CUSTOMERS / SALES
CREATE TABLE cash_sessions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID NOT NULL REFERENCES organizations(id), branch_id UUID NOT NULL REFERENCES branches(id), device_id UUID REFERENCES pos_devices(id), opened_by_user_id UUID NOT NULL REFERENCES users(id), closed_by_user_id UUID REFERENCES users(id), opening_amount_expected NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (opening_amount_expected >= 0), opening_amount_counted NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (opening_amount_counted >= 0), opening_discrepancy NUMERIC(12,2) NOT NULL DEFAULT 0, opening_note TEXT, status cash_session_status NOT NULL DEFAULT 'open', opened_at TIMESTAMPTZ NOT NULL DEFAULT now(), closed_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE cash_movement_reasons (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID NOT NULL REFERENCES organizations(id), name VARCHAR(120) NOT NULL, movement_direction cash_movement_direction NOT NULL, requires_authorization BOOLEAN NOT NULL DEFAULT true, status generic_status NOT NULL DEFAULT 'active', created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), CONSTRAINT uq_cash_reason_org_name UNIQUE (organization_id, name));
CREATE TABLE cash_movements (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID NOT NULL REFERENCES organizations(id), branch_id UUID NOT NULL REFERENCES branches(id), cash_session_id UUID NOT NULL REFERENCES cash_sessions(id), movement_type cash_movement_type NOT NULL, amount NUMERIC(12,2) NOT NULL CHECK (amount > 0), reason_id UUID REFERENCES cash_movement_reasons(id), description TEXT, status cash_movement_status NOT NULL DEFAULT 'recorded', requested_by_user_id UUID NOT NULL REFERENCES users(id), authorized_by_user_id UUID REFERENCES users(id), authorized_at TIMESTAMPTZ, rejected_by_user_id UUID REFERENCES users(id), rejected_at TIMESTAMPTZ, cancelled_by_user_id UUID REFERENCES users(id), cancelled_at TIMESTAMPTZ, cancellation_reason TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE cash_closings (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID NOT NULL REFERENCES organizations(id), branch_id UUID NOT NULL REFERENCES branches(id), cash_session_id UUID NOT NULL UNIQUE REFERENCES cash_sessions(id), closed_by_user_id UUID NOT NULL REFERENCES users(id), opening_amount NUMERIC(12,2) NOT NULL DEFAULT 0, cash_sales_total NUMERIC(12,2) NOT NULL DEFAULT 0, card_sales_total NUMERIC(12,2) NOT NULL DEFAULT 0, transfer_sales_total NUMERIC(12,2) NOT NULL DEFAULT 0, credit_sales_total NUMERIC(12,2) NOT NULL DEFAULT 0, cash_in_total NUMERIC(12,2) NOT NULL DEFAULT 0, cash_out_total NUMERIC(12,2) NOT NULL DEFAULT 0, expected_cash_amount NUMERIC(12,2) NOT NULL DEFAULT 0, counted_cash_amount NUMERIC(12,2) NOT NULL DEFAULT 0, difference_amount NUMERIC(12,2) NOT NULL DEFAULT 0, difference_type difference_type NOT NULL DEFAULT 'none', comment TEXT, status generic_status NOT NULL DEFAULT 'active', closed_at TIMESTAMPTZ NOT NULL DEFAULT now(), created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE customers (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID NOT NULL REFERENCES organizations(id), business_unit_id UUID REFERENCES business_units(id), name VARCHAR(180) NOT NULL, customer_type customer_type NOT NULL, phone VARCHAR(30), email VARCHAR(180), tax_id VARCHAR(30), credit_enabled BOOLEAN NOT NULL DEFAULT false, credit_limit NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (credit_limit >= 0), current_balance NUMERIC(12,2) NOT NULL DEFAULT 0, status generic_status NOT NULL DEFAULT 'active', notes TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), CONSTRAINT uq_customers_org_name UNIQUE (organization_id, name));
CREATE TABLE customer_product_prices (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID NOT NULL REFERENCES organizations(id), customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE, product_id UUID NOT NULL REFERENCES products(id), branch_id UUID REFERENCES branches(id), sale_mode sale_mode NOT NULL, price NUMERIC(12,2) NOT NULL CHECK (price >= 0), active_from TIMESTAMPTZ NOT NULL, active_to TIMESTAMPTZ, status generic_status NOT NULL DEFAULT 'active', created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE customer_balance_movements (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID NOT NULL REFERENCES organizations(id), customer_id UUID NOT NULL REFERENCES customers(id), movement_type customer_balance_movement_type NOT NULL, amount NUMERIC(12,2) NOT NULL CHECK (amount > 0), reference_type VARCHAR(80), reference_id UUID, created_by_user_id UUID NOT NULL REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE sales (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID NOT NULL REFERENCES organizations(id), branch_id UUID NOT NULL REFERENCES branches(id), cash_session_id UUID NOT NULL REFERENCES cash_sessions(id), device_id UUID REFERENCES pos_devices(id), customer_id UUID REFERENCES customers(id), sale_number VARCHAR(80) NOT NULL, status sale_status NOT NULL DEFAULT 'draft', sale_type sale_type NOT NULL DEFAULT 'counter', subtotal NUMERIC(12,2) NOT NULL DEFAULT 0, discount_total NUMERIC(12,2) NOT NULL DEFAULT 0, tax_total NUMERIC(12,2) NOT NULL DEFAULT 0, total NUMERIC(12,2) NOT NULL DEFAULT 0, created_by_user_id UUID NOT NULL REFERENCES users(id), cancelled_by_user_id UUID REFERENCES users(id), cancelled_at TIMESTAMPTZ, cancellation_reason TEXT, client_generated_id VARCHAR(180), sync_status VARCHAR(60), synced_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), CONSTRAINT uq_sale_branch_number UNIQUE (branch_id, sale_number));
CREATE TABLE sale_items (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE, product_id UUID NOT NULL REFERENCES products(id), product_name_snapshot VARCHAR(180) NOT NULL, product_type_snapshot product_type NOT NULL, quantity NUMERIC(12,3) NOT NULL CHECK (quantity > 0), unit product_unit NOT NULL, unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0), discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0), total NUMERIC(12,2) NOT NULL CHECK (total >= 0), sale_mode sale_mode NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE sale_payments (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID NOT NULL REFERENCES organizations(id), branch_id UUID NOT NULL REFERENCES branches(id), sale_id UUID NOT NULL REFERENCES sales(id), payment_method payment_method NOT NULL, amount NUMERIC(12,2) NOT NULL CHECK (amount > 0), status payment_status NOT NULL DEFAULT 'completed', reference VARCHAR(180), provider VARCHAR(120), created_by_user_id UUID NOT NULL REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now(), CONSTRAINT chk_card_requires_reference CHECK (payment_method <> 'card' OR reference IS NOT NULL));
CREATE TABLE sale_returns (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID NOT NULL REFERENCES organizations(id), branch_id UUID NOT NULL REFERENCES branches(id), sale_id UUID NOT NULL REFERENCES sales(id), status sale_return_status NOT NULL DEFAULT 'pending', reason TEXT NOT NULL, authorized_by_user_id UUID NOT NULL REFERENCES users(id), created_by_user_id UUID NOT NULL REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE sale_return_items (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), sale_return_id UUID NOT NULL REFERENCES sale_returns(id) ON DELETE CASCADE, sale_item_id UUID NOT NULL REFERENCES sale_items(id), product_id UUID NOT NULL REFERENCES products(id), quantity NUMERIC(12,3) NOT NULL CHECK (quantity > 0), amount_refunded NUMERIC(12,2) NOT NULL CHECK (amount_refunded >= 0), return_to_inventory BOOLEAN NOT NULL DEFAULT false, inventory_condition inventory_condition NOT NULL, inventory_movement_id UUID REFERENCES inventory_movements(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now());

-- DELIVERY / BILLING / AUDIT
CREATE TABLE delivery_drivers (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID NOT NULL REFERENCES organizations(id), name VARCHAR(160) NOT NULL, phone VARCHAR(30), status generic_status NOT NULL DEFAULT 'active', notes TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), CONSTRAINT uq_delivery_driver_org_name UNIQUE (organization_id, name));
CREATE TABLE delivery_routes (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID NOT NULL REFERENCES organizations(id), branch_id UUID NOT NULL REFERENCES branches(id), driver_id UUID REFERENCES delivery_drivers(id), name VARCHAR(160) NOT NULL, status generic_status NOT NULL DEFAULT 'active', created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), CONSTRAINT uq_delivery_route_branch_name UNIQUE (branch_id, name));
CREATE TABLE delivery_route_customers (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), route_id UUID NOT NULL REFERENCES delivery_routes(id) ON DELETE CASCADE, customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE, sort_order INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), CONSTRAINT uq_delivery_route_customer UNIQUE (route_id, customer_id));
CREATE TABLE delivery_orders (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID NOT NULL REFERENCES organizations(id), branch_id UUID NOT NULL REFERENCES branches(id), route_id UUID REFERENCES delivery_routes(id), driver_id UUID REFERENCES delivery_drivers(id), customer_id UUID NOT NULL REFERENCES customers(id), cash_session_id UUID REFERENCES cash_sessions(id), status delivery_order_status NOT NULL DEFAULT 'pending', total NUMERIC(12,2) NOT NULL DEFAULT 0, amount_collected NUMERIC(12,2) NOT NULL DEFAULT 0, amount_pending NUMERIC(12,2) NOT NULL DEFAULT 0, created_by_user_id UUID NOT NULL REFERENCES users(id), prepared_by_user_id UUID REFERENCES users(id), loaded_at TIMESTAMPTZ, delivered_at TIMESTAMPTZ, closed_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE delivery_order_items (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), delivery_order_id UUID NOT NULL REFERENCES delivery_orders(id) ON DELETE CASCADE, product_id UUID NOT NULL REFERENCES products(id), quantity_loaded NUMERIC(12,3) NOT NULL DEFAULT 0, quantity_delivered NUMERIC(12,3) NOT NULL DEFAULT 0, quantity_returned NUMERIC(12,3) NOT NULL DEFAULT 0, unit_price NUMERIC(12,2) NOT NULL, total NUMERIC(12,2) NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE delivery_payments (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID NOT NULL REFERENCES organizations(id), branch_id UUID NOT NULL REFERENCES branches(id), delivery_order_id UUID NOT NULL REFERENCES delivery_orders(id), driver_id UUID REFERENCES delivery_drivers(id), customer_id UUID NOT NULL REFERENCES customers(id), amount NUMERIC(12,2) NOT NULL CHECK (amount > 0), payment_method payment_method NOT NULL DEFAULT 'cash', status payment_status NOT NULL DEFAULT 'completed', collected_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE delivery_settlements (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID NOT NULL REFERENCES organizations(id), branch_id UUID NOT NULL REFERENCES branches(id), driver_id UUID REFERENCES delivery_drivers(id), route_id UUID REFERENCES delivery_routes(id), status delivery_settlement_status NOT NULL DEFAULT 'open', expected_cash_amount NUMERIC(12,2) NOT NULL DEFAULT 0, delivered_cash_amount NUMERIC(12,2) NOT NULL DEFAULT 0, difference_amount NUMERIC(12,2) NOT NULL DEFAULT 0, received_by_user_id UUID REFERENCES users(id), cash_session_id UUID REFERENCES cash_sessions(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now(), closed_at TIMESTAMPTZ);
CREATE TABLE delivery_returns (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID NOT NULL REFERENCES organizations(id), branch_id UUID NOT NULL REFERENCES branches(id), delivery_order_id UUID NOT NULL REFERENCES delivery_orders(id), driver_id UUID REFERENCES delivery_drivers(id), status delivery_return_status NOT NULL DEFAULT 'pending_review', reviewed_by_user_id UUID REFERENCES users(id), reviewed_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE delivery_return_items (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), delivery_return_id UUID NOT NULL REFERENCES delivery_returns(id) ON DELETE CASCADE, product_id UUID NOT NULL REFERENCES products(id), quantity NUMERIC(12,3) NOT NULL CHECK (quantity > 0), condition inventory_condition NOT NULL, inventory_movement_id UUID REFERENCES inventory_movements(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE payment_providers (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID NOT NULL REFERENCES organizations(id), name VARCHAR(140) NOT NULL, provider_type VARCHAR(80) NOT NULL, status generic_status NOT NULL DEFAULT 'active', created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), CONSTRAINT uq_payment_provider_org_name UNIQUE (organization_id, name));
CREATE TABLE payment_terminal_references (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID NOT NULL REFERENCES organizations(id), branch_id UUID NOT NULL REFERENCES branches(id), sale_payment_id UUID NOT NULL UNIQUE REFERENCES sale_payments(id), provider_id UUID REFERENCES payment_providers(id), reference VARCHAR(180) NOT NULL, terminal_name VARCHAR(120), amount NUMERIC(12,2) NOT NULL CHECK (amount > 0), created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE reconciliation_batches (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID NOT NULL REFERENCES organizations(id), branch_id UUID NOT NULL REFERENCES branches(id), cash_session_id UUID REFERENCES cash_sessions(id), provider_id UUID REFERENCES payment_providers(id), status reconciliation_status NOT NULL DEFAULT 'draft', pos_total NUMERIC(12,2) NOT NULL DEFAULT 0, provider_reported_total NUMERIC(12,2) NOT NULL DEFAULT 0, difference_total NUMERIC(12,2) NOT NULL DEFAULT 0, created_by_user_id UUID NOT NULL REFERENCES users(id), reviewed_by_user_id UUID REFERENCES users(id), reviewed_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE reconciliation_items (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), reconciliation_batch_id UUID NOT NULL REFERENCES reconciliation_batches(id) ON DELETE CASCADE, sale_payment_id UUID REFERENCES sale_payments(id), provider_reference VARCHAR(180), pos_amount NUMERIC(12,2) NOT NULL DEFAULT 0, provider_amount NUMERIC(12,2) NOT NULL DEFAULT 0, status reconciliation_item_status NOT NULL, notes TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE billing_profiles (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID NOT NULL REFERENCES organizations(id), customer_id UUID REFERENCES customers(id), rfc VARCHAR(13) NOT NULL, legal_name VARCHAR(220) NOT NULL, tax_regime VARCHAR(10) NOT NULL, zip_code VARCHAR(10) NOT NULL, email VARCHAR(180) NOT NULL, status generic_status NOT NULL DEFAULT 'active', created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE invoices (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID NOT NULL REFERENCES organizations(id), branch_id UUID REFERENCES branches(id), customer_id UUID REFERENCES customers(id), billing_profile_id UUID REFERENCES billing_profiles(id), invoice_type invoice_type NOT NULL, status invoice_status NOT NULL DEFAULT 'draft', cfdi_use VARCHAR(10), payment_method_sat VARCHAR(10), payment_form_sat VARCHAR(10), currency CHAR(3) NOT NULL DEFAULT 'MXN', subtotal NUMERIC(12,2) NOT NULL DEFAULT 0, tax_total NUMERIC(12,2) NOT NULL DEFAULT 0, total NUMERIC(12,2) NOT NULL DEFAULT 0, cfdi_uuid VARCHAR(80) UNIQUE, pac_provider VARCHAR(120), pac_status VARCHAR(120), issued_at TIMESTAMPTZ, cancelled_at TIMESTAMPTZ, cancellation_reason TEXT, raw_request JSONB, raw_response JSONB, invoice_date DATE, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE invoice_sales (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE, sale_id UUID NOT NULL REFERENCES sales(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now(), CONSTRAINT uq_invoice_sale UNIQUE (invoice_id, sale_id));
CREATE TABLE invoice_items (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE, product_id UUID REFERENCES products(id), description TEXT NOT NULL, quantity NUMERIC(12,3) NOT NULL CHECK (quantity > 0), unit VARCHAR(40) NOT NULL, unit_price NUMERIC(12,2) NOT NULL, subtotal NUMERIC(12,2) NOT NULL, tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0, total NUMERIC(12,2) NOT NULL, sat_product_key VARCHAR(20), sat_unit_key VARCHAR(20), created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE invoice_documents (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE, document_type invoice_document_type NOT NULL, storage_url TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE pac_webhook_events (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), provider VARCHAR(120) NOT NULL, event_id VARCHAR(180) NOT NULL UNIQUE, invoice_id UUID REFERENCES invoices(id), processed BOOLEAN NOT NULL DEFAULT false, processed_at TIMESTAMPTZ, raw_payload JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE audit_logs (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID REFERENCES organizations(id), branch_id UUID REFERENCES branches(id), user_id UUID REFERENCES users(id), device_id UUID REFERENCES pos_devices(id), action VARCHAR(120) NOT NULL, entity_type VARCHAR(120) NOT NULL, entity_id UUID NOT NULL, before_snapshot JSONB, after_snapshot JSONB, metadata JSONB, ip_address INET, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE analytics_snapshots (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID NOT NULL REFERENCES organizations(id), branch_id UUID REFERENCES branches(id), snapshot_date DATE NOT NULL, snapshot_type analytics_snapshot_type NOT NULL, data JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());

-- CRITICAL INDEXES
CREATE INDEX idx_branches_organization ON branches(organization_id);
CREATE INDEX idx_subscriptions_organization ON subscriptions(organization_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE UNIQUE INDEX uq_one_live_subscription_per_org ON subscriptions(organization_id) WHERE status IN ('trial','active','past_due','grace_period','suspended_limited');
CREATE INDEX idx_users_organization ON users(organization_id);
CREATE INDEX idx_pos_devices_branch ON pos_devices(branch_id);
CREATE INDEX idx_products_organization ON products(organization_id);
CREATE INDEX idx_inventory_stocks_org ON inventory_stocks(organization_id);
CREATE INDEX idx_inventory_movements_created_at ON inventory_movements(created_at);
CREATE INDEX idx_cash_sessions_branch ON cash_sessions(branch_id);
CREATE INDEX idx_cash_sessions_status ON cash_sessions(status);
CREATE UNIQUE INDEX uq_one_open_cash_session_per_branch ON cash_sessions(branch_id) WHERE status = 'open';
CREATE INDEX idx_cash_movements_cash_session ON cash_movements(cash_session_id);
CREATE INDEX idx_cash_movements_status ON cash_movements(status);
CREATE INDEX idx_sales_branch ON sales(branch_id);
CREATE INDEX idx_sales_cash_session ON sales(cash_session_id);
CREATE INDEX idx_sales_created_at ON sales(created_at);
CREATE INDEX idx_sale_payments_sale ON sale_payments(sale_id);
CREATE INDEX idx_customers_organization ON customers(organization_id);
CREATE INDEX idx_customer_balance_customer ON customer_balance_movements(customer_id);
CREATE INDEX idx_delivery_orders_branch ON delivery_orders(branch_id);
CREATE INDEX idx_delivery_orders_status ON delivery_orders(status);
CREATE INDEX idx_invoices_org ON invoices(organization_id);
CREATE INDEX idx_invoices_branch ON invoices(branch_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE UNIQUE INDEX uq_global_invoice_branch_date ON invoices(branch_id, invoice_date) WHERE invoice_type = 'global_public' AND status <> 'cancelled';
