CREATE TABLE IF NOT EXISTS console066_queue (
 id text PRIMARY KEY, dedupe_key text NOT NULL UNIQUE,
 kind text NOT NULL CHECK(kind IN ('operations','probe')),
 effect text NOT NULL CHECK(effect IN ('internal','external')),
 payload jsonb NOT NULL, payload_hash text NOT NULL,
 state text NOT NULL DEFAULT 'queued' CHECK(state IN ('queued','running','complete','blocked','uncertain')),
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 3),
 fence integer NOT NULL DEFAULT 0,
 owner text, lease_until timestamptz,
 available_at timestamptz NOT NULL DEFAULT now(),
 result jsonb, reason text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK((state='running')=(owner IS NOT NULL AND lease_until IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS console066_queue_pending ON console066_queue(state,available_at,created_at);
CREATE TABLE IF NOT EXISTS console066_queue_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 job_id text NOT NULL REFERENCES console066_queue(id),
 action text NOT NULL, owner text, fence integer NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
