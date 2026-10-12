# MP4 del montaje · Estudio 066

La salida MP4 del timeline usa el compositor y mezclador existentes: el navegador captura los cortes, capas, transiciones, subtítulos y keyframes a WebM. Houston codifica esa captura con H.264 y AAC, verifica los códecs y la duración con ffprobe, y devuelve el archivo por partes. La edición conserva sus originales.

Esto elimina la dependencia del codificador H.264/AAC del navegador. La captura del montaje sigue ocurriendo en el navegador y requiere mantener la pestaña abierta; todavía no es un compositor remoto de originales por fotograma.

Límites: hasta 120 segundos, 128 MiB por captura/salida, 24 o 30 fps, 720p/1080p y las cuatro orientaciones del editor. Cada petición transporta como máximo 512 KiB de bytes en base64, por debajo del límite de respuesta de Vercel. El servidor comprueba tamaño, orden de partes, firma WebM y SHA-256 completo antes de invocar herramientas con argumentos fijos, sin shell, URLs ni credenciales de proveedores.

Un candado compartido impide codificar el montaje al mismo tiempo que HyperFrames captura otra pieza. FFmpeg usa un hilo, límite de diez minutos y cierre forzado tras cancelar. Los archivos de exportación son temporales: se eliminan después de descargar/cancelar, vencen tras una hora y no se conservan al reiniciar el contenedor. No se elimina ningún original ni proyecto del usuario.

Validación: contratos y autorización, partes desordenadas/incompletas, límite de tamaño, exclusión mutua y cancelación. Las pruebas Chrome del editor vuelven a exportar transiciones, subtítulos, keyframes visuales/volumen y fragmentos de video con audio a través del codificador real. Se comprueban píxeles, silencios, frecuencias y niveles en los archivos descargados; no se simula FFmpeg.
