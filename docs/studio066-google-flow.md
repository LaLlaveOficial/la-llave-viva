# Google Flow y montaje en Estudio 066

La generación se realiza en la interfaz de Google Flow con la cuenta personal Santibáñez. El estudio prepara el prompt y las referencias, permite descargar cada referencia y abre Flow sin enviar archivos ni ejecutar APIs. En Flow se selecciona la cuenta, el modelo, el formato, la duración y x1. El MP4 descargado se importa a la ficha de la escena y se monta en el timeline.

Las fichas nuevas usan una sola muestra. No se ofrecen variantes paralelas; si la indicación falla se corrige antes de otra generación. Se conservan las fichas antiguas para no alterar resultados históricos.

La preparación parte en Veo, 4 segundos, 720p y 24 FPS. Veo en Flow admite 4, 6 u 8 segundos con fotogramas y 8 segundos con imágenes de referencia; 9:16 o 16:9. Copiar el prompt comprueba estas restricciones y conserva las instrucciones explícitas de continuidad y negativas. No fija el modelo dentro de Flow ni verifica automáticamente su saldo. Las suscripciones de Google no cubren la facturación separada de la API.

La importación lee los metadatos reales antes de guardar el video. El resultado conserva la duración en la ficha local y en sus metadatos remotos; las fichas antiguas la obtienen del archivo al insertarlo. El timeline mantiene su límite existente de ocho segundos iniciales por inserción y puede recortarse para el montaje.

## Validación del 14 de octubre de 2026

Una única generación real en Keloke con Veo 3.1 Lite consumió 10 créditos incluidos y produjo un MP4 H.264 1280×720, 24 FPS, ocho segundos, audio AAC estéreo 48 kHz. El archivo decodificó completo. Chrome verificó importación manual, inserción al timeline y recuperación tras recargar. La regresión se probó con una ficha que solicita cuatro segundos y el video real de ocho: se usó la duración del archivo. No se gastaron créditos adicionales en estas pruebas locales.

La cuenta personal Santibáñez mostró nivel Pro y 1.050 créditos en Flow; Keloke quedó en 40. Son saldos observados, no un contador conectado al estudio. No certifican continuidad de Paula, Rosa o Enrique.

17 pruebas de generación, contrato y DOM y el build pasaron; la importación real también comprobó copia del prompt y enlaces de referencias. La integración permanece en una rama de vista previa. La rama integra la versión principal con los conflictos resueltos. La publicación en producción requiere revisar las pruebas de integración y autorizarla.

## Recuperación y controles compartidos

El panel LTX/Wan integrado lee el prompt, las restricciones, los fotogramas, la duración, el formato y seed de la escena principal. Solo mantiene los controles específicos de conexión y motor. Los perfiles incompatibles se rechazan antes de enviar archivos, sin acortar ni cambiar la petición automáticamente. Cada resultado se registra con la petición capturada al iniciar, para que editar el formulario durante la espera no cambie el historial de ese resultado.

La selección, vista previa y pestaña se recuperan al reabrir. Las fichas locales pendientes de sincronización se conservan cuando se descarga una versión remota anterior.

El respaldo `.studio066` contiene un manifiesto limitado a 2 MB seguido de los archivos binarios usados por las referencias, los resultados y el timeline del proyecto (máximo 500 MB de medios, 150 MB por archivo). No usa base64 ni incluye tokens. La importación valida estructura, tamaños, IDs, formatos, referencias y parámetros antes de escribir medios. Asigna IDs nuevos para conservar los archivos originales y elimina solo las nuevas copias si falla la restauración. Es un respaldo local de los medios y parámetros audiovisuales; no una copia de la consola comercial ni del servidor.

19 pruebas unitarias/DOM y el build pasaron. Chrome comprobó el formulario compartido y el respaldo completo/restauración en un contexto vacío, incluida recuperación del video después de recargar. La generación en esa prueba usa una respuesta simulada; no consume cuota. La prueba anterior del MP4 real de Flow sigue pasando.
