-- Prevent more than one open cash session per branch in the same organization.
CREATE UNIQUE INDEX IF NOT EXISTS "uq_one_open_cash_session_per_branch"
ON "cash_sessions"("branch_id")
WHERE "status" = 'open';

-- Prevent duplicate inventory movements created by retries when a reference is present.
CREATE UNIQUE INDEX IF NOT EXISTS "uq_inventory_movements_reference_idempotency"
ON "inventory_movements"(
  "organization_id",
  "branch_id",
  "product_id",
  "movement_type",
  "reference_id"
)
WHERE "reference_id" IS NOT NULL;
