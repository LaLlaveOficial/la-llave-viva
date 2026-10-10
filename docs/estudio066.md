# Estudio Creativo 066 — Fase 1 (rama aislada)

Estado: código preparado para revisión técnica. **No desplegado y no conectado a motores**.
Rama: `feature/estudio-creativo-066-fase1`.

## Alcance implementado

- Nuevo menú `Estudio Creativo` dentro del Centro de Operaciones 066 con la sesión privada existente.
- Biblioteca de proyectos de cine o publicidad: crear, seleccionar, renombrar y editar descripción.
- Fichas de planos y guion: título, dirección de cámara, notas de continuidad, resolución de salida solicitada (720p/1080p/2k/4k), orientación (9:16/16:9/1:1/1.91:1), duración (3,5,8,10,15,20 s), FPS (24/30/60), 1–4 variantes y motor previsto.
- Validación de servidor y control de versiones: rechaza valores inválidos y ediciones obsoletas (409).
- Persistencia prevista mediante dos tablas aisladas, con registro de cambios en el audit existente. No guarda imágenes, audio, videos ni archivos grandes todavía.
- Vistas claramente identificadas como pendientes: ElevenLabs (catálogo, preview, voces), motor de video, postproducción y adaptaciones Ads. Sin botones falsos ni requests a proveedores.
- Responsive y controles de accesibilidad básicos. No se modifica la web de compra.

## Archivos

- `public/centro-066/studio.js`, `public/centro-066/studio.css`: interfaz.
- `public/centro-066/app.js`, `public/centro-066/index.html`: integración mínima con el menú existente.
- `api/console-066.js`: nuevos `studio` (GET), `studio-project` y `studio-shot` (POST). Todas las operaciones pasan por la autenticación actual y validación de Origin.
- `lib/studio066.js`: esquema de configuraciones y sanitización.
- `migrations/20261010_studio066.sql`: nuevas tablas, *no ejecutada*.
- `tests/studio066.test.mjs`: validación unitaria de configuraciones.

## Qué todavía NO existe

- No hay acceso a API de OpenAI Images, ElevenLabs, Adobe, Kling, Veo, Wan ni LTX.
- No hay créditos, videos ni audios generados, ni renders de pago.
- No hay generación por lotes, ni exportación 4K/60 FPS ni escalado activo. Las preferencias no equivalen a capacidad garantizada del motor.
- No hay subida, persistencia de archivos ni biblioteca visual. Las referencias se registran como notas, no como imágenes.
- No hay timeline funcional, filtros, Foley, mezcla ni subtítulos procesados.
- No se ha comprobado comportamiento en navegador real ni en un entorno con Postgres operativo.

## Puesta a prueba segura — requiere aprobación separada

1. Ejecutar `node --test tests/studio066.test.mjs tests/console066.test.mjs`, `npm run build` y verificar la consola con navegador móvil/escritorio en un entorno local o de vista previa.
2. Crear rama aislada en Neon; aplicar únicamente allí `migrations/20261010_studio066.sql` (requiere tener primero las tablas existentes de Centro 066).
3. Configurar credenciales de prueba en Vercel Preview, autenticar, guardar dos proyectos y dos planos; comprobar 400/401/403/409, persistencia real y ausencia de llamadas a proveedores.
4. Verificar `/comprar`, checkout, GA4 y Ads por regresiones antes de autorizar despliegue.
5. Pedir consentimiento explícito antes de merge, migración o despliegue en producción.

## Próximas fases propuestas

- **Recursos:** biblioteca privada de fotogramas maestros y subida autorizada a almacenamiento de objetos, no blobs enormes en Postgres. Historial de versiones y referencias.
- **OpenAI Images:** adaptador de generación/edición con llave de API **solo en servidor**, presupuesto por llamada y aprobación antes de consumir créditos.
- **ElevenLabs:** API en servidor para lista real de voces, muestras `preview_url`, texto-a-voz con voice ID autorizado, límites y costos. No subir voces ajenas sin consentimiento.
- **Video:** conectores intercambiables con consulta de capacidades del motor (resoluciones, duración, FPS, costo) y cola asíncrona remota. 1–4 variantes si se autorizan.
- **Editor:** timeline multipista, Foley, color, transiciones y exportaciones con FFmpeg/servicios especializados. Guardar el proyecto editable.

La seguridad, la continuidad de personajes, la claridad de costos y la aprobación humana son requisitos del diseño.
