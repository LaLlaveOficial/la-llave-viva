BEGIN;
CREATE TABLE IF NOT EXISTS console066_marketing_records (
 id text PRIMARY KEY CHECK (length(id) BETWEEN 1 AND 80),
 kind text NOT NULL CHECK (kind IN ('brand','product','case','content','experiment','seo','visibility','order-label')),
 data jsonb NOT NULL CHECK (jsonb_typeof(data)='object'),
 status text NOT NULL DEFAULT 'draft',
 version integer NOT NULL DEFAULT 0,
 approved_hash text,
 approved_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK ((approved_hash IS NULL)=(approved_at IS NULL))
);
CREATE INDEX IF NOT EXISTS console066_marketing_kind ON console066_marketing_records(kind,updated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS console066_marketing_purchase_order ON console066_marketing_records((data->>'orderRef')) WHERE kind='case' AND status='purchased';
CREATE UNIQUE INDEX IF NOT EXISTS console066_marketing_order_label ON console066_marketing_records((data->>'orderRef')) WHERE kind='order-label';
COMMIT;
