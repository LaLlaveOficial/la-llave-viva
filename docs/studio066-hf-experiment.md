# Wan gratuito: conexión experimental desde el navegador

El panel de Generar medios puede llamar directamente al Space público
`zerogpu-aoti/wan2-2-fp8da-aoti-faster`. El procesamiento usa GPU remota;
el navegador envía la imagen y el prompt, descarga el MP4, comprueba sus
metadatos y lo guarda en la biblioteca local. Puede añadirlo a V1.

El token se mantiene solamente en la memoria de la vista, nunca en
localStorage, IndexedDB, Neon, el historial ni los mensajes. Se borra al
desconectar o salir. El campo no acepta la contraseña de la cuenta.
El cliente verifica una cuenta personal gratuita sin organizaciones y
rechaza cuentas Pro o perfiles cuya elegibilidad no pueda verificar.
No llama a Inference Providers ni a endpoints de pago. No reintenta trabajos.

La CSP permite únicamente Hugging Face y el origen exacto del Space,
además de los destinos anteriores del estudio. No incorpora scripts remotos.
El cliente prohíbe redirecciones y descargas desde otros orígenes.

Estado: código preparado; no publicado ni validado todavía con una cuenta
autenticada en producción. La prueba anterior de Wan sin autenticación
produjo un MP4 H.264 de 3,5625 s, 832×480 y 16 FPS. LTX y Hunyuan no han
completado una generación: las últimas solicitudes fueron rechazadas por cuota.

Antes de publicar: comprobar el flujo completo en navegador, CORS y conexión
con una cuenta gratuita; verificar que se reproducen y montan los resultados.
No afirmar continuidad de los personajes a partir del ejemplo lunar.
