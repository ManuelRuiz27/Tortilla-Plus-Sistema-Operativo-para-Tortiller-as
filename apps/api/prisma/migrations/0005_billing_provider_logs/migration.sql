CREATE TABLE billing_provider_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  provider VARCHAR(120) NOT NULL,
  operation VARCHAR(120) NOT NULL,
  related_entity_type VARCHAR(120),
  related_entity_id UUID,
  request_payload_sanitized JSONB,
  response_payload_sanitized JSONB,
  duration_ms INTEGER,
  success BOOLEAN NOT NULL,
  error_code VARCHAR(120),
  error_message TEXT,
  idempotency_key VARCHAR(220),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_billing_provider_logs_related ON billing_provider_logs(related_entity_type, related_entity_id);
CREATE INDEX idx_billing_provider_logs_provider_operation ON billing_provider_logs(provider, operation);
