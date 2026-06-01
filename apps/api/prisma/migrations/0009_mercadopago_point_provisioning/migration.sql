ALTER TABLE payment_terminals
  ADD COLUMN mp_store_id VARCHAR(180),
  ADD COLUMN mp_pos_id VARCHAR(180);

CREATE TABLE mercadopago_branch_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  provider_connection_id UUID NOT NULL REFERENCES payment_provider_connections(id) ON DELETE CASCADE,
  mp_store_id VARCHAR(180),
  external_store_id VARCHAR(80) NOT NULL,
  store_name VARCHAR(160) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_mp_branch_config_org_branch UNIQUE (organization_id, branch_id),
  CONSTRAINT uq_mp_branch_config_connection_external_store UNIQUE (provider_connection_id, external_store_id)
);

CREATE TABLE mercadopago_pos_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  pos_device_id UUID NOT NULL REFERENCES pos_devices(id),
  provider_connection_id UUID NOT NULL REFERENCES payment_provider_connections(id) ON DELETE CASCADE,
  mp_branch_config_id UUID NOT NULL REFERENCES mercadopago_branch_configs(id) ON DELETE CASCADE,
  mp_pos_id VARCHAR(180),
  external_pos_id VARCHAR(80) NOT NULL,
  pos_name VARCHAR(160) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_mp_pos_config_org_pos_device UNIQUE (organization_id, pos_device_id),
  CONSTRAINT uq_mp_pos_config_connection_external_pos UNIQUE (provider_connection_id, external_pos_id)
);
