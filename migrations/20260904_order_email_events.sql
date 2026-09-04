CREATE TABLE IF NOT EXISTS public.order_email_events (
  id BIGSERIAL PRIMARY KEY,
  external_reference VARCHAR NOT NULL
    REFERENCES public.orders (external_reference)
    ON DELETE CASCADE,
  email_type VARCHAR NOT NULL,
  recipient_email VARCHAR NOT NULL,
  resend_email_id VARCHAR,
  status VARCHAR NOT NULL DEFAULT 'processing',
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  error_message TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT order_email_events_type_check
    CHECK (email_type IN ('purchase_confirmation', 'checkout_recovery')),
  CONSTRAINT order_email_events_status_check
    CHECK (status IN ('processing', 'scheduled', 'sent', 'canceled', 'failed', 'cancel_failed')),
  CONSTRAINT order_email_events_attempt_count_check
    CHECK (attempt_count > 0),
  CONSTRAINT order_email_events_order_type_key
    UNIQUE (external_reference, email_type)
);

CREATE INDEX IF NOT EXISTS order_email_events_status_scheduled_idx
  ON public.order_email_events (status, scheduled_for);

COMMENT ON TABLE public.order_email_events IS
  'Registro idempotente de confirmaciones de compra y recuperaciones de checkout enviadas mediante Resend.';
