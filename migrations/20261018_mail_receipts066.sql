CREATE TABLE IF NOT EXISTS console066_mail_receipts (
 provider_id text PRIMARY KEY,
 last_event text,
 error text,
 checked_at timestamptz NOT NULL DEFAULT now(),
 observed_at timestamptz
);
COMMENT ON TABLE console066_mail_receipts IS 'Último estado consultado a Resend. No contiene destinatarios ni cuerpos. No autoriza reenvíos.';
