-- Phase 1 prepared migration. DO NOT apply to production without separate approval.
-- Isolated tables only; no edits to CRM, orders, ads, landing or existing API records.
BEGIN;
CREATE TABLE IF NOT EXISTS console066_studio_projects (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 name varchar(160) NOT NULL,
 type varchar(12) NOT NULL CHECK(type IN ('cine','ads')),
 description varchar(3000) NOT NULL DEFAULT '',
 version integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS console066_studio_shots (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 project_id bigint NOT NULL REFERENCES console066_studio_projects(id) ON DELETE RESTRICT,
 title varchar(160) NOT NULL,
 script varchar(4000) NOT NULL DEFAULT '',
 reference_notes varchar(3000) NOT NULL DEFAULT '',
 aspect varchar(8) NOT NULL DEFAULT '9:16' CHECK(aspect IN ('9:16','16:9','1:1','1.91:1')),
 resolution varchar(8) NOT NULL DEFAULT '1080p' CHECK(resolution IN ('720p','1080p','2k','4k')),
 duration_seconds smallint NOT NULL DEFAULT 5 CHECK(duration_seconds IN (3,5,8,10,15,20)),
 fps smallint NOT NULL DEFAULT 24 CHECK(fps IN (24,30,60)),
 variants smallint NOT NULL DEFAULT 2 CHECK(variants BETWEEN 1 AND 4),
 provider varchar(12) NOT NULL DEFAULT 'pendiente' CHECK(provider IN ('pendiente','wan','ltx','kling','veo','firefly')),
 version integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS console066_studio_shots_project ON console066_studio_shots(project_id,updated_at DESC);
COMMIT;
