BEGIN;
CREATE TABLE IF NOT EXISTS console066_inbox_threads (
 id text PRIMARY KEY, account_id text NOT NULL, sender_id text NOT NULL,
 last_inbound_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(account_id,sender_id)
);
CREATE TABLE IF NOT EXISTS console066_inbox_messages (
 id text PRIMARY KEY,thread_id text NOT NULL REFERENCES console066_inbox_threads(id),
 direction text NOT NULL CHECK(direction IN ('inbound','outbound')),
 text text NOT NULL CHECK(length(text)<=4000),
 status text NOT NULL CHECK(status IN ('received','pending_review','sending','accepted','uncertain','rejected')),
 provider_id text UNIQUE, version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),approved_at timestamptz,finished_at timestamptz
);
CREATE INDEX IF NOT EXISTS console066_inbox_thread_messages ON console066_inbox_messages(thread_id,created_at);
CREATE UNIQUE INDEX IF NOT EXISTS console066_inbox_one_active_reply ON console066_inbox_messages(thread_id) WHERE direction='outbound' AND status IN ('pending_review','sending','uncertain');
COMMIT;
