CREATE TABLE IF NOT EXISTS console066_wan_jobs (
 id uuid PRIMARY KEY,
 project_id bigint NOT NULL REFERENCES console066_studio_projects(id),
 provider_id text,
 status text NOT NULL CHECK (status IN ('SUBMITTING','UNKNOWN','IN_QUEUE','IN_PROGRESS','COMPLETED','FAILED','CANCELLED','TIMED_OUT')),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
-- One active job across the console. UNKNOWN blocks new submissions until reviewed.
CREATE UNIQUE INDEX IF NOT EXISTS console066_wan_single_active
 ON console066_wan_jobs ((true)) WHERE status IN ('SUBMITTING','UNKNOWN','IN_QUEUE','IN_PROGRESS');
