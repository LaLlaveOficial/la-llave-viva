-- Preview-only, reversible trash/restore metadata. Object bytes are not deleted.
ALTER TABLE console066_studio_media ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;
CREATE INDEX IF NOT EXISTS studio066_media_trash_idx ON console066_studio_media(project_id,deleted_at) WHERE deleted_at IS NOT NULL;
