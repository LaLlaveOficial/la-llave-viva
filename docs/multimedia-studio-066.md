# Estudio multimedia 066

Authenticated project planning and manual clip review inside the existing console. No generation provider, paid consumption or publishing is enabled by this change.

Projects persist as `multimedia-project` records in `console066_audit`. Updates use a version comparison to prevent concurrent overwrites. The existing session and same-origin checks apply. No new migration or credentials are required.

Each project supports up to eight scenes: provider, target duration, prompt, caption, reference URL, clip URL and manual review status. HTTPS references are links, not uploaded copies. Source files must remain accessible; signed links may expire. The video preview requests the clip only when the user clicks it. JSON and text exports preserve the brief, not rendered video.

Provider catalog names denote user-selected workflows, not verified model versions or connected APIs. Kling/Veo/Firefly are manual generation/import workflows; Wan is unconfigured. An accepted clip records Kike's manual judgement, not an automated quality score. No claim of equivalence to Kling Omni is made.

Next integration gate: authorized account/API, exact supported model and input schema, cost/quota check, bounded asynchronous job execution, durable output storage, and comparison with an approved Caso 066 reference. ChatGPT Adobe/Higgsfield plugins do not transfer credentials to this app. Never fall back from free quota to paid consumption automatically.

Verification: `node --test tests/multimedia-studio.test.mjs tests/console066.test.mjs`; `npm run build`.
