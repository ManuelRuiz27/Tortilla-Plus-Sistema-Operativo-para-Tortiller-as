CREATE TYPE fiscal_intent AS ENUM ('no_invoice','customer_invoice','auto_customer_invoice');
CREATE TYPE sale_fiscal_status AS ENUM (
  'sale_completed',
  'eligible_for_daily_global',
  'pending_customer_invoice',
  'invoice_processing',
  'customer_invoiced',
  'invoice_failed',
  'requires_manual_review',
  'expired_to_pending_global',
  'included_in_global',
  'cfdi_cancelled',
  'cancelled'
);

ALTER TABLE sales
  ADD COLUMN fiscal_intent fiscal_intent NOT NULL DEFAULT 'no_invoice',
  ADD COLUMN fiscal_status sale_fiscal_status NOT NULL DEFAULT 'sale_completed',
  ADD COLUMN invoice_deadline_at TIMESTAMPTZ,
  ADD COLUMN fiscal_locked_at TIMESTAMPTZ;

CREATE INDEX idx_sales_fiscal_status ON sales(fiscal_status);
CREATE INDEX idx_sales_invoice_deadline_at ON sales(invoice_deadline_at);
