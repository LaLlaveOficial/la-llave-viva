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

**Estado comprobado en rama al 11-oct-2026:** pruebas DOM y Chrome cubren importación, movimiento, cambio de duración, undo, cuchilla, desplazamiento horizontal, y split de un clip desplazado; validación de exportación y rendimiento premium completo **pendiente**. Los cambios en Preview no implican aprobación para producción.

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
