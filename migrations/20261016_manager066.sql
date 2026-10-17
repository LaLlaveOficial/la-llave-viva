CREATE TABLE IF NOT EXISTS console066_manager_policy (
 id integer PRIMARY KEY CHECK(id=1), version integer NOT NULL DEFAULT 1,
 enabled boolean NOT NULL DEFAULT true,
 max_daily_drafts integer NOT NULL DEFAULT 6 CHECK(max_daily_drafts BETWEEN 1 AND 12),
 updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO console066_manager_policy(id) VALUES(1) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS console066_manager_jobs (
 id text PRIMARY KEY, dedupe_key text NOT NULL UNIQUE,
 kind text NOT NULL CHECK(kind IN ('creative','research','campaign-review')),
 role text NOT NULL, channel text NOT NULL, data jsonb NOT NULL,
 state text NOT NULL DEFAULT 'queued' CHECK(state IN ('queued','drafted','review','blocked','closed')),
 version integer NOT NULL DEFAULT 1, output_id bigint,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS console066_manager_jobs_open ON console066_manager_jobs(state,created_at);
CREATE TABLE IF NOT EXISTS console066_public_signals (
 id text PRIMARY KEY, source_url text NOT NULL, source_hash text NOT NULL UNIQUE,
 category text NOT NULL CHECK(category IN ('competitor','community','professional','inbound-interest')),
 title text NOT NULL, evidence text NOT NULL, observed_at timestamptz NOT NULL,
 state text NOT NULL DEFAULT 'research' CHECK(state IN ('research','qualified','dismissed')),
 version integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS console066_manager_days (
 day text PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now()
);
