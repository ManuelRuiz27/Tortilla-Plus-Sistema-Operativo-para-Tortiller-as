-- CreateIndex
-- Enforce a single open cash session per branch at the database level.
-- Prisma does not model partial indexes directly, so this migration uses raw PostgreSQL SQL.

CREATE UNIQUE INDEX "uq_one_open_cash_session_per_org_branch"
ON "cash_sessions"("organization_id", "branch_id")
WHERE "status" = 'open';
