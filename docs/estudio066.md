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


## Generación IA — preparación visual (octubre 2026, fase experimental)

Se incorpora la pestaña **Generación IA** al menú del Estudio Creativo 066. Su layout sigue el flujo visual de Firefly pero no incorpora ni imita sus APIs.

Funciones efectivamente programadas:
- Panel izquierdo: historial de solicitudes **preparadas** y clips **importados**, por proyecto y navegador.
- Visor central: previsualización local de imágenes de referencia y videos importados.
- Panel derecho: prompt positivo/negativo, notas de continuidad, formato, motor previsto, 720p/1080p/2K/4K solicitados, FPS, duración, audio, seed y 1–4 variantes.
- Referencias: modo **Frames** con fotograma de inicio obligatorio y final opcional, o modo **Images** con 1–3 imágenes y roles por imagen (personaje, escenario, composición, estilo o vestuario). Subida directa a IndexedDB local.
- **Guardar preparación** verifica todos los parámetros y guarda un registro local, sin simular video generado ni generar cobros.
- La ficha admite importar 1–4 videos creados fuera de OP 066, asociarlos al registro y previsualizarlos. Un resultado seleccionado se puede enviar a la pista V1 del timeline del mismo proyecto, junto a sus prompts de dirección.
- Exportar ficha JSON y reutilizar parámetros para nueva solicitud. Los registros no incluyen datos binarios.

**Limitaciones críticas antes de producción:**
- El botón **Generar clip** permanece deshabilitado porque no hay API de video configurada/autorizada. No existen jobs remotos, colas reales ni promesa de resultado gratuito equivalente a Kling Omni.
- Los medios y el historial permanecen localmente en el navegador, sin backup central ni sincronización entre computadoras. El usuario debe mantener copia de los originales; limpiar datos del sitio puede borrarlos.
- La resolución, FPS, seed, número de variantes, referencias o audio son la configuración **deseada**, no capacidades garantizadas de un proveedor. El futuro backend debe negociar capacidades y costo verificables antes de ejecutar una solicitud.
- Importar un clip no significa que OP 066 lo generó. Los registros usan estados "Preparado" y "Clips importados", nunca estados engañosos de generación.
- Persistencia en el equipo y render WebM local pueden utilizar CPU/GPU del computador. Para trabajos pesados en la nube se necesita almacenamiento protegido y procesador remoto.
- Faltan prueba real en Chrome de importación, selección de referencias, recarga, selección de variantes y colocación en timeline. Las pruebas automatizadas son necesarias, pero no sustituyen prueba visual real.

**Requisitos del siguiente gate:**
1. Revisar cuentas/API de Firefly, Kling, Veo u otro proveedor con autorización y documentación real de imagen-a-video/referencias. No asumir que la suscripción de Firefly incluye API.
2. Presupuesto, autorización explícita de créditos, colas asíncronas, control de concurrencia y cancelaciones.
3. Biblioteca de archivos y resultados cifrada/privada con URLs firmadas y copias de seguridad.
4. Procesamiento remoto de exportaciones MP4 y 2K/4K con calidad controlada.
5. Tests end-to-end reales de Chrome, aislamiento multicuenta, controles de acceso, conservación de identidad de personajes y regresiones en la consola existente.

La rama `main` y los servicios productivos deben mantenerse intactos hasta un consentimiento separado para merge y migraciones.

## Respaldos portables de estudio

La rama de desarrollo incluye **Respaldo completo con medios** y **Restaurar respaldo completo** en Montaje y efectos. El archivo JSON privado contiene los datos del timeline, las solicitudes de Generación IA guardadas localmente y los bytes de los archivos de imagen/video/audio referenciados. Límite: 40 archivos, 30 MiB por archivo y 48 MiB sumados. No sube a proveedores ni requiere créditos.

Restaurar exige estar dentro del MISMO proyecto ID en el segundo dispositivo, confirma el reemplazo del montaje e historial locales, valida integridad de los tamaños e identificadores de archivos y nunca sobrescribe archivos multimedia que ya están presentes.

**Seguridad:** los respaldos contienen imágenes y videos originales potencialmente privados o con derechos reservados. No compartirlos públicamente. No son copias cifradas; guardarlos con el mismo cuidado que los originales. El respaldo no incluye solicitudes que hayan quedado solo en Neon si todavía no fueron recuperadas al navegador, ni los recursos de otros proyectos o archivos huérfanos. Si supera los límites, falla con mensaje y no produce un archivo incompleto.

**Siguiente fase:** Neon Storage está disponible en la rama aislada, pero no hemos creado bucket ni activado tráfico o facturación. El respaldo manual es temporal mientras se diseña almacenamiento privado compartido entre PC y móvil. El módulo no se publica en producción sin pruebas de Chrome e intervención explícita.

## Biblioteca remota privada — implementación controlada (no activada)
Se implementan el contrato de multimedia remota, el registro SQL privado, un firmador S3 SigV4 de URLs temporales, verificación de tamaño y hash del original y componentes manuales para sincronizar/recuperar archivos del proyecto. Solo se intentan transferencias tras una acción explícita del usuario. No se muestra como conectado cuando faltan credenciales. No se consumen motores generativos.

Límites de seguridad de pruebas: 50 MiB por archivo, 256 MiB y 80 originales por proyecto. Bucket privado de Neon Storage vinculado exclusivamente a la rama Preview; el servidor deberá recibir `STUDIO_CLOUD_ENABLED=1`, `STUDIO_STORAGE_ENDPOINT`, `STUDIO_STORAGE_BUCKET`, `STUDIO_STORAGE_ACCESS_KEY_ID`, `STUDIO_STORAGE_SECRET_ACCESS_KEY`, `STUDIO_STORAGE_REGION`, `STUDIO_STORAGE_BRANCH_ID` (este último apuntando a `br-little-sound-av8vyecq`). Nunca colocar secretos en JavaScript público ni archivos del repositorio. Ninguna variable se ha configurado aún.

El navegador utiliza solicitudes autenticadas a la consola para crear intenciones, recibe URLs firmadas de corta duración, ejecuta subida PUT directa al storage, confirma mediante HEAD al servidor, y descarga sobre demanda con verificación de SHA-256 antes de almacenar una copia local. No se borran originales automáticamente. La API se niega a funcionar sin proveedor y credenciales completos.

**Requiere validación manual adicional antes de encender el servicio:** compatibilidad de Neon Storage con `x-amz-checksum-sha256`, CORS del bucket para la URL de Preview, correcta firma y verificación HEAD de la plataforma, aislamiento real entre ramas y costo de almacenamiento/transferencia de acuerdo al plan. No activar gastos ni crear buckets hasta obtener aprobación presupuestaria. El CSP en la rama de desarrollo permite solo el endpoint de almacenamiento de esta rama preview; al publicar otra rama ese host debe ajustarse, no copiarlo a producción.


## Corrección de exportación WebM (octubre 2026)

La exportación inicial falló en una prueba real de Chrome con un único PNG en V1: `El navegador no produjo un video válido`. Se reemplaza la captura automática por grabación WebM con fotogramas explícitos (`CanvasCaptureMediaStreamTrack.requestFrame`), `MediaRecorder`, finalización controlada e inspección del encabezado EBML. Para proyectos solo de imágenes y títulos, no se agrega una pista de audio vacía; con clips de audio o video, se mantiene la mezcla si existe. Se conserva la posición original del editor después de exportar y se aborta la captura al cerrar el módulo. Se corrige el visor para mostrar el último fotograma al llegar exactamente al final del clip.

Se ha comprobado el método en Chromium real con un lienzo estático generado para test (2 segundos, WebM válido). **Todavía falta repetir la exportación real con `rosa4.png` desde la vista previa del usuario**, verificar con reproductor externo su duración y códec, y probar A1/A2 antes de declarar estable el exportador. No afecta Neon ni la biblioteca original.

## Formato y calidad de exportación (Preview, octubre 2026)

WebM y MP4 nativo del navegador, SOLO cuando MediaRecorder.isTypeSupported confirma el códec correspondiente (H.264, y AAC cuando hay sonido). El sistema verifica firma EBML de WebM o ftyp de MP4 antes de descargar. Nunca se cambia simplemente la extensión. Cuando MP4 no esté disponible, se informa al usuario y permanece WebM.

720p/1080p y calidad Estándar / Alta / Máster, respectivamente 3/6/10 Mbps para 720p y 6/12/20 Mbps para 1080p: son bitrates solicitados al codificador, el valor efectivo podría variar. Proyectos anteriores reciben WebM/Alta sin perder datos. Los renders de Máster cargan CPU/GPU del navegador, 4K y codificación universal deben ir a render remoto.

Pendiente: prueba manual del MP4 con Chrome Windows, audio AAC, VLC, precisión de duración y calidad real antes de declarar el módulo listo para producción.

## Bloqueo seguro de exportación ante archivos ausentes (10 oct 2026)

Una prueba en Chrome móvil produjo MP4 H.264 de 1080 × 1920 y 5 segundos, pero sin el PNG de la pista V1: solo se veía el título en V2. La captura mostraba el PNG disponible en Neon Storage, pero no en la biblioteca local de ese navegador. El formato era MP4 válido, **el montaje exportado no era íntegro**. Se añade un preflight que comprueba presencia de cada original en IndexedDB, tamaño de bytes, carga del recurso y decodificación de imagen/video/audio. Bloquea con mensaje claro si falta el archivo y dirige a «Biblioteca privada → Recuperar al equipo». El visor advierte que faltan medios locales, y la descarga desde Neon actualiza la vista previa sin requerir borrar ni reimportar el original. Prohibido informar exportación completa si falta una pista.

El MP4 de ese ensayo mostró irregularidades de timestamps (DTS no monótono en algunos cuadros). Se pospone considerar producción profesional MP4 hasta normalización de timestamps y validación de audio/compatibilidad con reproducción real o FFmpeg remoto. El codec H.264 + dimensión 1080p no garantiza calidad visual del montaje ni tasa constante de 24 FPS.
