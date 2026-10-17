-- Atomic hourly reservation survives process restarts; no customer data.
CREATE TABLE IF NOT EXISTS console066_operations_runs (
 slot timestamptz PRIMARY KEY,
 started_at timestamptz NOT NULL DEFAULT now(),
 finished_at timestamptz,
 status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','complete','partial','failed')),
 detail jsonb NOT NULL DEFAULT '{}'::jsonb
);
