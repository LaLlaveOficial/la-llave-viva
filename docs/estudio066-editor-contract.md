# Contrato técnico de Estudio Creativo 066 — Edición NLE en Preview

**Estado:** diseño de referencia e invariantes de calidad; no es declaración de funcionalidades terminadas. Aislar siempre en `feature/estudio-creativo-066-fase1`. Sin publicación en main, sin habilitar motores que consuman créditos sin autorización explícita.

## Referencias contrastadas (flujos públicos, no código propietario)

- Adobe Premiere: trim por extremos del clip, Razor en el punto exacto, snapping a otros clips y cabezal, inspector contextual, separación del original y edición no destructiva.
  https://helpx.adobe.com/premiere/desktop/edit-projects/trim-clips/trim-a-clip.html
  https://helpx.adobe.com/premiere/desktop/edit-projects/trim-clips/cut-clips.html
  https://helpx.adobe.com/premiere/desktop/edit-projects/change-clip-sequence/snap-clips.html
- CapCut: biblioteca -> timeline -> herramienta Split junto a las pistas -> preview -> exportador, controles sencillos y reversibles.
  https://www.capcut.com/resource/how-to-use-capcut
- Adobe Firefly: un espacio para historial de generaciones, clips, keyframes primera/última imagen, prompts, referencias, secuencia y arrastre a timeline.
  https://helpx.adobe.com/firefly/web/firefly-video-editor/generate-videos/generate-video-using-firefly-models.html
  https://helpx.adobe.com/sg/firefly/web/firefly-video-editor/set-up-your-project/change-view-of-panels.html

**Límite:** la arquitectura interna de Premiere/CapCut/Firefly no es pública; se replica una interacción interoperable propia, no se presenta ningún proveedor como conectado sin API realmente autorizada.

## Flujo de información y único origen de verdad

```
Medios originales (IndexedDB / biblioteca privada)
     | assetId y tipo
     v
Proyecto workspace.clips[] (pista, posición, duración, inicio del medio, estilo)
     | comando editar (mover | extender | dividir | borrar | duplicar)
     v
Gestor de interacciones Pointer + historial undo/redo
     | confirmar únicamente en pointerup; cancelar sin mutar
     v
Renderer de timeline <---> Escala común segundos <-> píxeles <-> fotogramas
     | render no debe reiniciar scrollLeft ni cambiar la selección
     +--> Compositor visor canvas / sincronía sonido
     +--> Exportador browser (capability-check) / futuro render remoto
     +--> Guardado no destructivo y respaldo portable
```

Contrato geométrico:
1. La selección solo cambia selección, no `start` ni escala ni scroll.
2. La posición de cada bloque y su ancho en píxeles deben corresponder a `start` y `duration` calculados con **la misma escala** usada por la regla. También después de zoom y scroll.
3. Un corte con cuchilla usa la posición del puntero relativa al clip real visible. Nunca emplea las coordenadas de otra pista o el cabezal antiguo.
4. Un `pointerdown` inicializa gesto; `pointermove` produce previsualización; `pointerup` registra transacción con historial; `pointercancel` revierte.
5. Los handles deben ser distinguibles y tener área suficiente tanto en ratón como en pantalla táctil.
6. Al modificar un clip que queda fuera del viewport horizontal, desplazar el timeline hasta dejarlo visible; conservar el desplazamiento cuando se cambia de herramienta o pestaña.
7. Bloqueo y mute de pista se comprueban al iniciar la operación. La duración no puede ser inferior al mínimo admitido ni exceder la secuencia.
8. Dos fragmentos de un split conservan la referencia al original y sus In/Out, sin sobrescribir el archivo.

## QA obligatoria para aceptar hitos, no solo verificar que se muestra la página

**P0 — base operativa:** importar PNG/MP4/audio desde UI; click en tarjeta sin superposiciones; arrastrar contenido; extender extremos; mover a 17.63s; confirmar inspector+posición real; activar cuchilla sin perder scroll; cortar punto visible; deshacer, rehacer; cargar respaldo; exportar y abrir el archivo resultante; recargar y recuperar originales.

**P1 — uso editorial:** drag and drop real entre biblioteca y varias pistas; zoom/snap playhead; orden, solapes y ajuste de clipping en reproducción; miniaturas y waveforms; comportamiento móvil/tablet; títulos, audios en A1/A2, transiciones, fades y color; proyecto largo bajo estrés.

**P2 — premium real y servicios:** media panel y búsqueda, markers, multi-selección, atajos, waveform seek, subtítulos, plantillas, keyframes, colas de render, MP4 H.264/AAC verificable y salida remota alta resolución, roles/permisos de medios; motores de video externos y voz ElevenLabs conectados solo tras aprobación y pruebas de costo.

**Estado comprobado en rama al 11-oct-2026:** pruebas DOM y Chrome cubren importación, movimiento, cambio de duración, undo, cuchilla, desplazamiento horizontal y split de un clip desplazado. Exportación WebM comprobada con archivos reales: imagen, transiciones, sonido, recortes, silencios y audio extraído. Rendimiento con proyectos largos, compatibilidad entre dispositivos y render universal siguen pendientes. Los cambios en Preview no implican aprobación para producción.

## Criterio para pasar a producción

- GitHub Actions en verde en último commit (unitarias, integración DB, Chromium y build).
- Revisión móvil y desktop; sin errores de consola ni desajustes de timeline reproducibles.
- Exportación descargada, reproducida y comprobada en dispositivos destino.
- Recuperación de proyecto/medios y protección de datos confirmadas.
- Demo humana aceptada explícitamente por usuario, autorización separada de merge/deploy.

## Pistas y herramientas (11-oct-2026)

- Pistas ordenadas persistidas en `workspace.tracks`, con identificadores estables y un máximo de 12 pistas en total. Migración automática de proyectos anteriores con V2, V1, A1 y A2.
- Arrastre vertical: video, imagen y texto solo en pistas V; audio solo en A. Un destino bloqueado o incompatible cancela el cambio.
- Soltar entre pistas crea una pista del mismo tipo en una única transacción junto con el movimiento; cancelar o superar el límite conserva el proyecto. Deshacer/Rehacer incluye las pistas.
- Barra de iconos SVG con nombre/atajo en tooltip: selección V, cuchilla C, dividir S, duplicar D, quitar Supr, imán M, ajustar F, fundidos de video I/O, fundidos de audio Shift+I/Shift+O y volumen G.
- Botones de fundido alternan una entrada/salida de hasta un segundo y abren su duración en el inspector. La duración se limita a media longitud del clip. El volumen admite 0–2 con Web Audio y 0–1 con reproducción HTML sin ganancia.
- Fundidos a transparencia y a silencio calculados por el mismo compositor/mezclador de reproducción y exportación local. No representan disoluciones cruzadas entre pares de clips.
- QA Chrome: arrastre arriba/abajo, inserción de video y audio entre pistas, rechazo de tipo incompatible, doce pistas, undo/redo, recuperación al recargar, fundidos y volumen.

## Transiciones entre clips — 11-oct-2026

- Video (T): disolución entre dos imágenes/videos solapados en una misma pista. Audio (Shift+T): mezcla cruzada de audio o del sonido de dos videos, separada del efecto visual.
- Se selecciona el clip entrante. No se mueven clips automáticamente: debe existir al menos 0,1 s de solape. Duración máxima: 10 s, limitada al solape y al material original disponible. No se admiten solapes ambiguos de tres fuentes.
- Cada efecto conserva `fromId` y `duration` en el clip entrante; no se duplican ni alteran archivos. Inspector contextual y región visible en timeline utilizan la misma escala temporal que los bloques, bajo CSP estricta.
- Disolución: composición ponderada en una superficie transparente antes de mezclar con las demás pistas. Evita la pérdida de brillo que produciría dibujar dos clips semitransparentes directamente sobre negro.
- Audio: ganancias seno/coseno de potencia constante. No se promete volumen constante para fuentes correlacionadas ni normalización/límite de picos; el usuario mantiene el control de volumen.
- Cambiar pistas, separar o borrar una fuente elimina los efectos que pierden su relación válida. Deshacer recupera el estado anterior completo. JSON y respaldo portable conservan efectos válidos.
- Exportación: se bloquea la edición mientras captura, se permite cancelar, y se restaura/guarda el cabezal previo. Las transiciones se ejecutan mediante el mismo compositor y mezcla de preview.
- QA real: PNG rojo/azul y dos WAV originales de 440/880 Hz; lectura del pixel del visor, región de timeline, bloqueo, undo/redo, recuperación al recargar, cancelación y descarga de WebM. FFmpeg decodifica el archivo y verifica la mezcla de colores y ambas frecuencias en el tramo cruzado.
- Alcance: WebM validado con Chromium. No declara validación de MP4/AAC, Windows, Safari, exportación remota ni equivalencia con render offline de precisión constante.

## Originales reales, reproducción y extracción de audio

- Video/audio: al insertar se obtiene la duración del decodificador. Duración y Entrada original del inspector, y el trim por extremos, se limitan al material disponible. Imágenes y títulos siguen siendo extensibles.
- Antes de exportar se valida **cada fragmento** del original, aunque otros clips utilicen el mismo archivo. Un recorte fuera de rango o una duración ilegible bloquea la descarga y señala la corrección.
- Se espera a que los medios decodifiquen su entrada original antes de iniciar la captura. Al restaurar un clip con el mismo ID y otro original, se desconecta y libera la fuente anterior. Undo/redo y recarga preparan las fuentes del montaje vigente.
- Extraer audio (Shift+E): crea un clip A con el mismo original, posición, entrada, duración, volumen y fundidos de audio; el video se silencia para evitar duplicación. Busca una pista A libre y desbloqueada; si falta, crea una hasta el máximo de doce. La extracción es reversible; no modifica ni duplica los bytes del original.
- Después de extraer, imagen y sonido se editan de forma independiente. No se declara vinculación automática ni reproducción de sonido para un video que no lo contiene. No se trasladan automáticamente crossfades entre pistas.
- El límite de 120 clips se comprueba al insertar, cortar, duplicar, extraer sonido y añadir títulos. Impide crear montajes que el parser rechazaría después de recargar. También se rechazan identificadores de clip duplicados y valores no finitos.
- QA real: video WebM VP8/Opus de seis segundos con tres segmentos rojo/verde/azul y sonidos 440/880/1320 Hz. Entrada 2 s; duración 3 s; corte a 1,5 s; segundo fragmento movido a 3 s; recuperación del original, undo/redo, extracción de audio y volumen independiente; recarga; descarga; decodificación FFmpeg de colores y frecuencias, con silencio durante el hueco.
- Prueba MP4 condicional: solo se ejecuta si el navegador anuncia H.264 **y AAC**; comprueba ambos códecs con FFprobe. Que otro navegador admita el formato no establece compatibilidad universal.

## Pendientes para cerrar el estudio completo

1. Render MP4 H.264/AAC independiente del navegador, control de sincronía por fotograma y pruebas con material de producción largo. Render remoto no conectado.
2. Edición avanzada: keyframes, multiselección, vincular imagen/audio, medidores y control de picos. Transcripción automática de voz pendiente; subtítulos manuales y SRT/VTT ya operativos.
3. Generación IA y voz: las funciones que necesitan proveedor/créditos permanecen deshabilitadas hasta conexión autorizada. No se presentan como operativas.
4. Prueba humana con clips reales del Caso 066 y dispositivos de destino antes de aprobar producción.

## Subtítulos locales — 11-oct-2026

- Icono Añadir subtítulo (Shift+L): crea un bloque de dos segundos en V2 en el cabezal. La pestaña Texto de Biblioteca permite importar SRT/WebVTT y descargar SRT.
- La importación respeta tiempos absolutos del montaje y saltos de línea; elimina etiquetas de formato conocidas, no interpreta HTML ni ejecuta scripts. NOTE/STYLE/REGION de VTT se ignoran. Posicionamiento VTT se sustituye por el estilo local editable.
- Cada cue admite hasta 500 caracteres; máximo 120 cues y 250 KB por archivo, sin superar los 120 clips del proyecto. Duración 0,1–120 s; tiempos hasta 600 s, con el límite de exportación local de 120 s todavía vigente. Errores de formato, capacidad o bloqueo de V2 cancelan la operación sin modificar el montaje.
- Inspector: texto, Inicio, Duración, pista, tamaño relativo al lado corto, posición vertical y opacidad del fondo. El renderer ajusta líneas al ancho seguro y reduce el tamaño en textos largos; mismo compositor para visor y video exportado.
- JSON/respaldo portable y undo/redo conservan texto, tiempos y estilo. El SRT exportado utiliza los tiempos actuales y solo bloques marcados como subtítulo; no incluye estilos ni títulos normales. El archivo SRT no incluye medios.
- QA Chrome: importación, 269 caracteres sin truncar, ajustes de estilo/tiempo, vertical/horizontal, bloqueo de pista, rechazo atómico de archivo inválido, creación manual, undo/redo, recuperación al recargar y lectura de SRT descargado. FFmpeg cuenta píxeles de texto blanco en el WebM para confirmar presencia durante ambas cues y ausencia antes, entre ellas y después.
- Sin transcripción automática, generación de voz ni llamadas a proveedores.
