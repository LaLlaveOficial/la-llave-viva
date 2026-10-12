# HyperFrames: render y respuesta de interfaz

Diagnóstico del 12-oct-2026: el servidor recibió la solicitud con HTTP 202. El log `[video-066]` confirma cancelación por SIGTERM a los 241.126 ms, con 43 de 240 fotogramas. El límite fijo de cuatro minutos incluía compilación y captura; no era un botón sin solicitud ni un MP4 ya terminado.

Corrección del worker: presupuesto por duración (6 s: 10 min; 10 s: 14 min; 15 s: 19 min), con máximo 20 minutos para compilación/captura, un worker y bitrate existente. El lint conserva un límite separado de un minuto y la codificación tiene dos minutos. Se conserva el flujo reciente de Houston: capturar PNGs primero y codificar MP4 después de cerrar Chrome, con FFmpeg de un solo hilo. No aumenta memoria, CPU, plan ni proveedores. Al vencer el límite se termina el proceso y se informa como fallo; no se declara éxito sin archivo.

Se conservan estado, fase, porcentaje tomado de los fotogramas reportados por HyperFrames y última actualización. Las escrituras se serializan para impedir que un progreso atrasado sobrescriba el resultado terminado.

Corrección del cliente: respuesta inmediata al pulsar Crear MP4, botón bloqueado durante envío/render, tiempo transcurrido y progreso cuando el servidor lo provee, actualización cada cinco segundos, error visible, reintento como nueva versión tras fallo terminal, y consulta del listado tras perder una respuesta. El ID pendiente evita crear otro proyecto al reintentar una solicitud incierta. Las respuestas antiguas del listado no reemplazan el estado nuevo.

Validación: seis pruebas de contrato/worker con proceso controlado; prueba de Chrome del formulario, progreso, fallo/reintento, acuse perdido y descarga. El archivo usado para descarga fue producido por HyperFrames 0.8.149 real con portada local: H.264, 1080×1080, 24 fps, seis segundos, 1.096.735 bytes. Compilación y captura tardaron aproximadamente 98 segundos en ese entorno; no establece tiempo garantizado en Houston ni confirma el despliegue del parche allí.

El cambio está separado del editor en la rama de reparación. Para cerrar el flujo real debe desplegarse el worker en Houston y comprobar un proyecto privado hasta `ready` y su MP4 descargable. Cambiar solo el cliente muestra el fallo, pero no corrige el plazo del servidor que ya está desplegado.
