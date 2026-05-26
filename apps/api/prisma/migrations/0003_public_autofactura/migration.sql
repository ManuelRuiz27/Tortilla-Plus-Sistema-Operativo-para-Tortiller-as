CREATE TYPE billing_receipt_status AS ENUM ('active','used','expired','cancelled');
CREATE TYPE invoice_request_status AS ENUM ('received','processing','stamped','failed','manual_review');

CREATE TABLE billing_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  sale_id UUID NOT NULL UNIQUE REFERENCES sales(id),
  receipt_token VARCHAR(160) NOT NULL UNIQUE,
  receipt_url VARCHAR(260) NOT NULL,
  status billing_receipt_status NOT NULL DEFAULT 'active',
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE billing_invoice_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  billing_receipt_id UUID NOT NULL REFERENCES billing_receipts(id) ON DELETE CASCADE,
  sale_id UUID NOT NULL REFERENCES sales(id),
  invoice_id UUID REFERENCES invoices(id),
  status invoice_request_status NOT NULL DEFAULT 'received',
  rfc VARCHAR(13) NOT NULL,
  legal_name VARCHAR(220) NOT NULL,
  tax_regime VARCHAR(10) NOT NULL,
  zip_code VARCHAR(10) NOT NULL,
  cfdi_use VARCHAR(10) NOT NULL,
  email VARCHAR(180) NOT NULL,
  error_code VARCHAR(80),
  error_message TEXT,
  raw_request JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_billing_receipts_branch_status ON billing_receipts(branch_id, status);
CREATE INDEX idx_billing_receipts_expires_at ON billing_receipts(expires_at);
CREATE INDEX idx_billing_receipts_status ON billing_receipts(status);
CREATE INDEX idx_invoice_requests_receipt_id ON billing_invoice_requests(billing_receipt_id);
CREATE INDEX idx_invoice_requests_rfc ON billing_invoice_requests(rfc);
CREATE INDEX idx_invoice_requests_sale_id ON billing_invoice_requests(sale_id);
CREATE INDEX idx_invoice_requests_status ON billing_invoice_requests(status);
