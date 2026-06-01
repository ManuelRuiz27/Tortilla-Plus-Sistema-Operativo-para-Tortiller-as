CREATE TYPE payment_integration_provider AS ENUM ('mercadopago');
CREATE TYPE payment_provider_connection_status AS ENUM ('pending', 'active', 'expired', 'revoked', 'error');
CREATE TYPE payment_terminal_status AS ENUM ('active', 'inactive', 'unassigned', 'error');
CREATE TYPE terminal_binding_status AS ENUM ('active', 'inactive');
CREATE TYPE payment_terminal_order_status AS ENUM ('created', 'sent_to_terminal', 'pending', 'approved', 'rejected', 'expired', 'canceled', 'failed', 'refunded');

CREATE TABLE payment_provider_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  provider payment_integration_provider NOT NULL DEFAULT 'mercadopago',
  connection_name VARCHAR(160) NOT NULL,
  status payment_provider_connection_status NOT NULL DEFAULT 'pending',
  mp_user_id VARCHAR(180),
  access_token_ciphertext TEXT,
  refresh_token_ciphertext TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  oauth_state_hash VARCHAR(128),
  oauth_state_expires_at TIMESTAMPTZ,
  connected_by_user_id UUID REFERENCES users(id),
  connected_at TIMESTAMPTZ,
  last_health_check_at TIMESTAMPTZ,
  last_error_code VARCHAR(120),
  last_error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payment_terminals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  branch_id UUID REFERENCES branches(id),
  provider_connection_id UUID NOT NULL REFERENCES payment_provider_connections(id) ON DELETE CASCADE,
  provider payment_integration_provider NOT NULL DEFAULT 'mercadopago',
  terminal_id VARCHAR(180) NOT NULL,
  terminal_name VARCHAR(180),
  external_store_id VARCHAR(180),
  external_pos_id VARCHAR(180),
  status payment_terminal_status NOT NULL DEFAULT 'unassigned',
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_payment_terminal_connection_terminal UNIQUE (provider_connection_id, terminal_id)
);

CREATE TABLE pos_payment_terminal_bindings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  pos_device_id UUID NOT NULL REFERENCES pos_devices(id),
  payment_terminal_id UUID NOT NULL REFERENCES payment_terminals(id),
  provider payment_integration_provider NOT NULL DEFAULT 'mercadopago',
  status terminal_binding_status NOT NULL DEFAULT 'active',
  created_by_user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payment_terminal_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  pos_device_id UUID NOT NULL REFERENCES pos_devices(id),
  sale_id UUID REFERENCES sales(id),
  sale_payment_id UUID UNIQUE REFERENCES sale_payments(id),
  payment_terminal_id UUID NOT NULL REFERENCES payment_terminals(id),
  provider_connection_id UUID NOT NULL REFERENCES payment_provider_connections(id),
  provider payment_integration_provider NOT NULL DEFAULT 'mercadopago',
  external_order_id VARCHAR(180),
  external_payment_id VARCHAR(180),
  external_reference VARCHAR(80) NOT NULL,
  idempotency_key VARCHAR(180) NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency CHAR(3) NOT NULL DEFAULT 'MXN',
  status payment_terminal_order_status NOT NULL DEFAULT 'created',
  status_detail VARCHAR(180),
  sale_draft JSONB,
  checkout_payments JSONB,
  expires_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  raw_create_response JSONB,
  raw_last_status_response JSONB,
  created_by_user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_payment_terminal_orders_external_reference UNIQUE (organization_id, provider, external_reference),
  CONSTRAINT uq_payment_terminal_orders_idempotency UNIQUE (organization_id, provider, idempotency_key)
);

CREATE TABLE payment_terminal_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  branch_id UUID REFERENCES branches(id),
  terminal_order_id UUID NOT NULL REFERENCES payment_terminal_orders(id) ON DELETE CASCADE,
  provider payment_integration_provider NOT NULL DEFAULT 'mercadopago',
  external_event_id VARCHAR(180),
  event_type VARCHAR(120) NOT NULL,
  event_status VARCHAR(120),
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_provider_connections_org_provider_status ON payment_provider_connections(organization_id, provider, status);
CREATE INDEX idx_payment_terminals_org_branch ON payment_terminals(organization_id, branch_id);
CREATE INDEX idx_pos_payment_terminal_bindings_branch ON pos_payment_terminal_bindings(branch_id);
CREATE INDEX idx_payment_terminal_orders_org_branch_status ON payment_terminal_orders(organization_id, branch_id, status);
CREATE INDEX idx_payment_terminal_events_order ON payment_terminal_events(terminal_order_id);

CREATE UNIQUE INDEX uq_pos_payment_terminal_binding_active_pos
  ON pos_payment_terminal_bindings(organization_id, provider, pos_device_id)
  WHERE status = 'active';

CREATE UNIQUE INDEX uq_payment_terminal_binding_active_terminal
  ON pos_payment_terminal_bindings(organization_id, provider, payment_terminal_id)
  WHERE status = 'active';

CREATE UNIQUE INDEX uq_payment_terminal_events_provider_external_event
  ON payment_terminal_events(provider, external_event_id)
  WHERE external_event_id IS NOT NULL;
