CREATE TABLE IF NOT EXISTS console066_order_ops (
 external_reference text PRIMARY KEY REFERENCES orders(external_reference),
 version integer NOT NULL DEFAULT 1,
 fulfillment text NOT NULL DEFAULT 'unprocessed',
 carrier text NOT NULL DEFAULT '', tracking text NOT NULL DEFAULT '',
 notes text NOT NULL DEFAULT '', abandonment_reason text NOT NULL DEFAULT '',
 reason_source text NOT NULL DEFAULT '', updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS console066_mail_campaigns (
 id text PRIMARY KEY, version integer NOT NULL DEFAULT 1,
 data jsonb NOT NULL, status text NOT NULL DEFAULT 'draft',
 approval_hash text, approved_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS console066_mail_recipients (
 campaign_id text NOT NULL REFERENCES console066_mail_campaigns(id),
 email text NOT NULL, subscriber_id bigint NOT NULL REFERENCES mailing_subscribers(id),
 status text NOT NULL DEFAULT 'prepared', provider_id text, error text,
 claimed_at timestamptz, sent_at timestamptz,
 PRIMARY KEY(campaign_id,email)
);
CREATE TABLE IF NOT EXISTS console066_mail_offers (
 code text PRIMARY KEY, campaign_id text NOT NULL UNIQUE REFERENCES console066_mail_campaigns(id),
 discount_percent integer NOT NULL CHECK(discount_percent=10),
 valid_from date NOT NULL, valid_until date NOT NULL,
 status text NOT NULL DEFAULT 'active', CHECK(valid_until>=valid_from)
);
CREATE INDEX IF NOT EXISTS console066_mail_recipients_status ON console066_mail_recipients(campaign_id,status);
