-- Neon branch-preview ONLY. No bucket provisioning or production migration.
BEGIN;
CREATE TABLE IF NOT EXISTS console066_studio_media (
 id uuid PRIMARY KEY,
 project_id bigint NOT NULL REFERENCES console066_studio_projects(id) ON DELETE RESTRICT,
 name varchar(180) NOT NULL,
 kind varchar(12) NOT NULL CHECK (kind IN ('image','video','audio')),
 mime varchar(80) NOT NULL,
 size_bytes bigint NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 52428800),
 sha256_hex char(64) NOT NULL,
 object_key varchar(200) NOT NULL UNIQUE,
 status varchar(12) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','ready')),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS studio066_media_project_idx ON console066_studio_media(project_id,status,created_at DESC);
COMMIT;
