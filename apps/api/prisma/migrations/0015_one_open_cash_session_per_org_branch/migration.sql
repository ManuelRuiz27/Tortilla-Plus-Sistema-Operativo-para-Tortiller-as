CREATE UNIQUE INDEX uq_one_open_cash_session_per_org_branch
ON cash_sessions(organization_id, branch_id)
WHERE status = 'open';
