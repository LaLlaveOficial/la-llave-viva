CREATE TABLE IF NOT EXISTS console066_fb_groups (
 id text PRIMARY KEY, url text NOT NULL UNIQUE, version integer NOT NULL DEFAULT 1,
 data jsonb NOT NULL, membership text NOT NULL DEFAULT 'not_requested'
 CHECK(membership IN ('not_requested','requested','member','declined','left')),
 updated_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS console066_fb_posts (
 id text PRIMARY KEY, group_id text NOT NULL REFERENCES console066_fb_groups(id),
 version integer NOT NULL DEFAULT 1, data jsonb NOT NULL,
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','approved','prepared','submitted','published','rejected','uncertain')),
 approval_hash text, approved_at timestamptz, receipt jsonb,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK((approval_hash IS NULL)=(approved_at IS NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS console066_fb_one_pending ON console066_fb_posts(group_id) WHERE status IN ('prepared','submitted','uncertain');
CREATE TABLE IF NOT EXISTS console066_fb_discovery_days(day text PRIMARY KEY, candidates integer NOT NULL CHECK(candidates BETWEEN 1 AND 6));

ALTER TABLE console066_fb_groups ADD COLUMN IF NOT EXISTS facebook_id text;
CREATE UNIQUE INDEX IF NOT EXISTS console066_fb_group_identity ON console066_fb_groups(facebook_id) WHERE facebook_id IS NOT NULL;
