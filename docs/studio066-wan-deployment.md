# Wan para OP066 — prueba antes de integración

Estado: preparación de despliegue; todavía no hay endpoint GPU, credenciales,
generación real ni medición de calidad. No activar el botón de generación como
conectado hasta completar el recorrido con un video real.

Usar un worker GPU Runpod separado de Houston. Empezar con Wan2.2-TI2V-5B y una
GPU de al menos 24 GB VRAM, generación vertical 704×1280 desde una imagen.
El código oficial admite esta configuración con descarga parcial a CPU. Esta
prueba no valida la calidad de los modelos 14B ni equivalencia con Kling.

Configuración propuesta en `deploy/studio066-wan/deployment.json`: cero workers
permanentes, un worker máximo, cierre tras 5 segundos inactivo y 10 minutos
máximos por ejecución. No es un presupuesto global: controlar por separado
inicio del modelo, procesamiento, inactividad, almacenamiento y reintentos.
No activar recarga automática ni reservar GPU continua.

Flujo final: OP066 guarda solicitud y referencia → backend envía un trabajo
autenticado al worker GPU → consulta estado → guarda el MP4 verificado → muestra
el resultado en biblioteca → usuario añade el clip al montaje. La clave Runpod
queda únicamente en el servidor. Validar referencias, tamaños y parámetros;
no admitir comandos, rutas o URLs arbitrarias del usuario en el worker.

Antes de la primera ejecución falta: cuenta de proveedor, tarifa de la GPU
disponible, presupuesto autorizado, imagen de contenedor fijada a versiones,
pesos descargados, almacenamiento privado de referencias y resultados y prueba
GPU real. No existe una GPU comprobada del PC de Kike en esta sesión; no usar
la máquina del usuario para compensar la falta de servidor.

Fuentes oficiales consultadas el 13 de octubre de 2026:
- https://github.com/Wan-Video/Wan2.2
- https://docs.runpod.io/serverless/pricing
- https://docs.runpod.io/serverless/endpoints/endpoint-configurations

Comparar el resultado contra la referencia de Caso 066 antes de conectar el
motor en producción. Si identidad o movimiento fallan, evaluar una variante
14B y cotizar la GPU adecuada; no presentar un escalado de resolución como
mejora comprobada de continuidad o detalle.
