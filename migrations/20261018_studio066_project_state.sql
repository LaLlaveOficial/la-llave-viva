CREATE TABLE IF NOT EXISTS console066_studio_project_state (
 project_id bigint PRIMARY KEY REFERENCES console066_studio_projects(id) ON DELETE RESTRICT,
 version integer NOT NULL DEFAULT 1 CHECK(version>0),
 data jsonb NOT NULL CHECK(octet_length(data::text)<=262144),
 updated_at timestamptz NOT NULL DEFAULT now()
);
