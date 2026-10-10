# Estudio Creativo 066 — Fase 1 (rama aislada)

Estado: interfaz de trabajo disponible en **Vercel Preview aislado**. Generación IA y render remoto **no conectados**. Publicación y migraciones de producción **no ejecutadas**.
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
- La biblioteca **local de navegador** admite arrastrar/importar archivos PNG/JPEG/WebP, MP4/WebM/MOV y MP3/WAV/otros audios compatibles; los blobs se guardan en IndexedDB de este navegador, NO en servidor remoto. Máximo 150 MB por archivo; la cuota depende del navegador. Cerrar pestaña conserva archivos si no se borran datos del sitio. Exportar JSON no incorpora medios.
- La pestaña **Montaje y efectos** tiene timeline funcional V1/V2/A1/A2, recorte y desplazamiento horizontal por arrastre, orden por pista, inspector de entrada/duración/volumen, zoom y posición, brillo/contraste/saturación/desenfoque, títulos sobreimpresos, campo de prompt de cada plano, deshacer/rehacer y reproducción previa. Acepta pistas de voz/Foley importadas localmente. No es todavía un reemplazo de Adobe Premiere.
- Guardado de proyectos/planos validado manualmente por el propietario en Vercel Preview y verificado en la rama Neon de ensayo. Tests CI con PostgreSQL efímero, JSDOM e IndexedDB simulada. El render de video con MediaRecorder todavía requiere prueba manual en Chrome con archivos reales antes de aprobar calidad y sincronización.

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

## Editor local funcional (fase experimental)

Ruta: `/operaciones-066` en la vista previa de `feature/estudio-creativo-066-fase1` → `Estudio Creativo` → `Montaje y efectos`.

1. Crear/seleccionar un proyecto en **Proyectos**. Cada proyecto guarda su montaje local de forma separada en el navegador.
2. Importar medios desde el panel Biblioteca. No se suben a la nube ni se transfieren a proveedores externos. Guardar copias originales fuera del navegador.
3. Añadir medios al timeline. Las imágenes entran en V1, los audios en A1; las pistas se ajustan en el inspector. Añadir títulos en V2.
4. Seleccionar un bloque y editar inicio, entrada del original, duración, volumen, color, posición o su prompt. Arrastrar un bloque para moverlo; utilizar el asa derecha para ajustar su duración. Deshacer/re-hacer cambios del montaje.
5. Reproducir en el visor. Exportar **WebM** de 720p o 1080p, 24/30 FPS, vertical/horizontal/cuadrado/panorámico. La exportación ocurre a velocidad real sobre el propio navegador, solo para proyectos de hasta 120 segundos, si `MediaRecorder` y los códecs del navegador lo admiten. La calidad y el audio se deben revisar manualmente antes de publicar.
6. Exportar proyecto JSON para recuperar su timeline en otro momento. **El JSON no incluye video, audio o fotogramas**; los assets seguirán vinculados por sus IDs locales y requieren conservar el navegador original y su almacenamiento.

**Limitaciones relevantes:** no hay exportación MP4 nativa, 2K/4K, interpolación de 60 FPS, automatización de prompts a clip, proxy de alta resolución, máscaras/seguimiento complejos, catálogo ElevenLabs conectado, exportación en la nube, render distribuido, autosincronización multi-dispositivo, ni monitor de costos de IA. Los renders locales usan CPU/GPU del navegador (no cumplen el objetivo de cero carga del PC); el procesamiento profesional de larga duración deberá trasladarse a un worker remoto autorizado. La interfaz de voces y los botones de generación permanecen deshabilitados hasta que exista un proveedor verificado y un presupuesto autorizado.

**Seguridad:** la API privada original mantiene sesiones y validación de origen. La rama usa una `DATABASE_URL` restringida a la rama Neon de ensayo, sin modificar producción. Los blobs locales solo se leen desde el origen web con permiso del navegador. El CSP privado autoriza URLs `blob:` para reproducir medios. No poner credenciales de OpenAI/ElevenLabs en JS público.

## Criterios para pasar a producción

- Usuario revisa visualmente la interfaz en Vercel Preview con medios de prueba.
- Validar exportación WebM real desde Chrome (video 9:16, 16:9, audio A1, título V2) y consistencia temporal, duración y calidad.
- Confirmar que se recupera un timeline tras recargar sin perder archivos locales.
- Confirmar explícitamente si se acepta temporalmente biblioteca local o es obligatorio almacenamiento remoto y backups antes del lanzamiento.
- Publicación a `main`, cambios de producción y proveedores IA solo con autorización nueva.
