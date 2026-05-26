ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'processing';
ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'requires_manual_review';
ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'cancel_processing';
ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'cancel_failed';

ALTER TABLE invoices
  ADD COLUMN provider_invoice_id VARCHAR(120);

ALTER TABLE invoice_documents
  ADD COLUMN content_type VARCHAR(120),
  ADD COLUMN content_sha256 VARCHAR(64),
  ADD COLUMN storage_content TEXT;

CREATE INDEX idx_invoices_provider_invoice_id ON invoices(provider_invoice_id);
