-- Estudio 066: servidor guarda SOLO fichas de generación y referencias a archivos locales.
-- Apply to isolated Neon preview branch only. Never automatic on main.
BEGIN;
CREATE TABLE IF NOT EXISTS console066_studio_generations (
 id uuid PRIMARY KEY,
 project_id bigint NOT NULL REFERENCES console066_studio_projects(id) ON DELETE RESTRICT,
 request jsonb NOT NULL,
 results jsonb NOT NULL DEFAULT '[]'::jsonb,
 status varchar(12) NOT NULL DEFAULT 'prepared' CHECK (status IN ('prepared','imported')),
 version integer NOT NULL DEFAULT 0 CHECK (version >= 0),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT studio_gen_request_json CHECK (jsonb_typeof(request) = 'object'),
 CONSTRAINT studio_gen_result_json CHECK (jsonb_typeof(results) = 'array')
);
CREATE INDEX IF NOT EXISTS console066_studio_generations_project
 ON console066_studio_generations(project_id,updated_at DESC,id DESC);
COMMIT;
