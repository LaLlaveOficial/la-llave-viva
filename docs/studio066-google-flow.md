# Google Flow y montaje en Estudio 066

La generación se realiza en la interfaz de Google Flow con la cuenta personal Santibáñez. El estudio prepara el prompt y las referencias, permite descargar cada referencia y abre Flow sin enviar archivos ni ejecutar APIs. En Flow se selecciona la cuenta, el modelo, el formato, la duración y x1. El MP4 descargado se importa a la ficha de la escena y se monta en el timeline.

Las fichas nuevas usan una sola muestra. No se ofrecen variantes paralelas; si la indicación falla se corrige antes de otra generación. Se conservan las fichas antiguas para no alterar resultados históricos.

La preparación parte en Veo, 4 segundos, 720p y 24 FPS. Veo en Flow admite 4, 6 u 8 segundos con fotogramas y 8 segundos con imágenes de referencia; 9:16 o 16:9. Copiar el prompt comprueba estas restricciones y conserva las instrucciones explícitas de continuidad y negativas. No fija el modelo dentro de Flow ni verifica automáticamente su saldo. Las suscripciones de Google no cubren la facturación separada de la API.

La importación lee los metadatos reales antes de guardar el video. El resultado conserva la duración en la ficha local y en sus metadatos remotos; las fichas antiguas la obtienen del archivo al insertarlo. El timeline mantiene su límite existente de ocho segundos iniciales por inserción y puede recortarse para el montaje.

## Validación del 14 de octubre de 2026

Una única generación real en Keloke con Veo 3.1 Lite consumió 10 créditos incluidos y produjo un MP4 H.264 1280×720, 24 FPS, ocho segundos, audio AAC estéreo 48 kHz. El archivo decodificó completo. Chrome verificó importación manual, inserción al timeline y recuperación tras recargar. La regresión se probó con una ficha que solicita cuatro segundos y el video real de ocho: se usó la duración del archivo. No se gastaron créditos adicionales en estas pruebas locales.

La cuenta personal Santibáñez mostró nivel Pro y 1.050 créditos en Flow; Keloke quedó en 40. Son saldos observados, no un contador conectado al estudio. No certifican continuidad de Paula, Rosa o Enrique.

17 pruebas de generación, contrato y DOM y el build pasaron; la importación real también comprobó copia del prompt y enlaces de referencias. La integración permanece en una rama de vista previa. PR 18 mantiene conflictos con main que deben resolverse antes de una publicación autorizada.
