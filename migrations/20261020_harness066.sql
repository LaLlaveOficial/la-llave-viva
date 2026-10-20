CREATE TABLE IF NOT EXISTS console066_harness_budget (
 day date NOT NULL, agent text NOT NULL, operation text NOT NULL,
 used integer NOT NULL DEFAULT 0 CHECK(used>=0),
 failures integer NOT NULL DEFAULT 0 CHECK(failures>=0), blocked_until timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(day,agent,operation)
);
-- Preserve searches already spent today when introducing the atomic team budget.
INSERT INTO console066_harness_budget(day,agent,operation,used)
 SELECT (now() AT TIME ZONE 'America/Santiago')::date,'team','search',COUNT(*)::int
 FROM console066_audit WHERE entity='agent-search' AND created_at>=date_trunc('day',now() AT TIME ZONE 'America/Santiago') AT TIME ZONE 'America/Santiago'
 ON CONFLICT(day,agent,operation) DO NOTHING;
CREATE UNIQUE INDEX IF NOT EXISTS console066_output_fingerprint ON console066_audit((detail->>'fingerprint'))
 WHERE entity='agent-output' AND detail ? 'fingerprint';
CREATE TABLE IF NOT EXISTS console066_harness_refresh (
 id integer PRIMARY KEY CHECK(id=1), attempted_at timestamptz NOT NULL
);
INSERT INTO console066_harness_refresh(id,attempted_at)
 SELECT 1,MAX(created_at) FROM console066_audit WHERE entity='agent-refresh' HAVING MAX(created_at) IS NOT NULL
 ON CONFLICT(id) DO NOTHING;
