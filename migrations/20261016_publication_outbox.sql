BEGIN;
CREATE TABLE IF NOT EXISTS console066_publications (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 record_id text NOT NULL REFERENCES console066_marketing_records(id),record_version integer NOT NULL,
 payload jsonb NOT NULL,status text NOT NULL DEFAULT 'prepared' CHECK(status IN ('prepared','sending','scheduled','awaiting_confirmation','uncertain','rejected')),
 provider_id text,created_at timestamptz NOT NULL DEFAULT now(),approved_at timestamptz,finished_at timestamptz,
 UNIQUE(record_id,record_version)
);
COMMIT;
