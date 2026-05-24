CREATE TABLE "idempotency_records" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL,
  "operation" varchar(120) NOT NULL,
  "key" varchar(180) NOT NULL,
  "request_hash" varchar(128) NOT NULL,
  "response_body" jsonb,
  "status" varchar(40) NOT NULL DEFAULT 'pending',
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),
  "updated_at" timestamptz(6) NOT NULL DEFAULT now(),
  CONSTRAINT "idempotency_records_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX "uq_idempotency_org_operation_key"
  ON "idempotency_records"("organization_id", "operation", "key");

CREATE INDEX "idx_idempotency_records_created_at"
  ON "idempotency_records"("created_at");

ALTER TABLE "delivery_payments"
  ADD COLUMN "delivery_settlement_id" uuid,
  ADD COLUMN "reference" varchar(180),
  ADD COLUMN "provider" varchar(120),
  ADD COLUMN "settled_at" timestamptz(6);

ALTER TABLE "delivery_payments"
  ADD CONSTRAINT "delivery_payments_delivery_settlement_id_fkey"
  FOREIGN KEY ("delivery_settlement_id") REFERENCES "delivery_settlements"("id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE INDEX "idx_delivery_payments_settlement"
  ON "delivery_payments"("delivery_settlement_id");

ALTER TABLE "delivery_settlements"
  ADD COLUMN "cash_movement_id" uuid;

ALTER TABLE "delivery_settlements"
  ADD CONSTRAINT "delivery_settlements_cash_movement_id_fkey"
  FOREIGN KEY ("cash_movement_id") REFERENCES "cash_movements"("id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE UNIQUE INDEX "delivery_settlements_cash_movement_id_key"
  ON "delivery_settlements"("cash_movement_id");
