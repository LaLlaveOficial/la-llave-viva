BEGIN;
CREATE TABLE IF NOT EXISTS console066_conversation_cases (
 channel text NOT NULL CHECK(channel IN ('instagram','email')), thread_id text NOT NULL,
 case_id text NOT NULL REFERENCES console066_marketing_records(id),
 lead_id integer REFERENCES console066_leads(id),
 PRIMARY KEY(channel,thread_id), UNIQUE(case_id)
);
CREATE TABLE IF NOT EXISTS console066_gmail_threads (
 id text PRIMARY KEY, mailbox text NOT NULL, provider_id text NOT NULL,
 subject text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(mailbox,provider_id)
);
CREATE TABLE IF NOT EXISTS console066_gmail_messages (
 id text PRIMARY KEY, thread_id text NOT NULL REFERENCES console066_gmail_threads(id),
 provider_id text NOT NULL, direction text NOT NULL CHECK(direction IN ('inbound','outbound')),
 sender text NOT NULL, recipient text NOT NULL, subject text NOT NULL, text text NOT NULL,
 message_id text NOT NULL, refs text NOT NULL, received_at timestamptz NOT NULL,
 UNIQUE(thread_id,provider_id)
);
CREATE INDEX IF NOT EXISTS console066_gmail_conversation ON console066_gmail_messages(thread_id,received_at);
CREATE TABLE IF NOT EXISTS console066_gmail_sync (
 id text PRIMARY KEY, cycle_at timestamptz NOT NULL DEFAULT now(), fetched integer NOT NULL DEFAULT 0,
 page_token text, completed boolean NOT NULL DEFAULT false, lease_until timestamptz,
 last_success timestamptz, last_error text
);
CREATE TABLE IF NOT EXISTS console066_gmail_replies (
 id text PRIMARY KEY, thread_id text NOT NULL REFERENCES console066_gmail_threads(id),
 anchor_id text NOT NULL REFERENCES console066_gmail_messages(id), text text NOT NULL CHECK(length(text) BETWEEN 1 AND 6000),
 status text NOT NULL CHECK(status IN ('pending_review','sending','accepted','uncertain','rejected')),
 version integer NOT NULL DEFAULT 1, provider_id text, created_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS console066_gmail_one_reply ON console066_gmail_replies(thread_id) WHERE status IN ('pending_review','sending','uncertain');
CREATE TABLE IF NOT EXISTS console066_delivery_receipts (
 id text PRIMARY KEY, source text NOT NULL, source_id text NOT NULL, state text NOT NULL,
 evidence jsonb NOT NULL, recorded_at timestamptz NOT NULL DEFAULT now(), UNIQUE(source,source_id)
);
COMMIT;
