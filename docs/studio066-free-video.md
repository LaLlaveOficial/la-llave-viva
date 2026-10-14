# Estudio 066: generación gratuita con LTX-2.3 y Wan

LTX-2.3 es el candidato principal para evaluar Caso 066: permite una imagen inicial, una final opcional y audio generado. Wan 2.2 14B se conserva como alternativa de animación desde una imagen, sin audio. Esto no certifica continuidad de personajes ni equivalencia a Kling.

## Prueba real del 14 de octubre de 2026

Se consultaron las APIs y fuentes actuales de ambos Spaces. LTX estaba RUNNING sobre ZeroGPU; ZeroCollabs/LTX-2.3-turbo estaba pausado y akhaliq/LTX-2.5-workflow tenía error de ejecución. Una única generación anónima en `linoyts/LTX-2-3-First-Last-Frame`, usando su imagen pública de demostración `pinkknit.jpg`, produjo un MP4 real: H.264, 1024×1024, 24 FPS, 73 fotogramas, 3,041667 segundos, audio AAC estéreo 48 kHz, 923.320 bytes. El archivo decodifica completamente. Se inspeccionaron fotogramas inicial, medio y final: la cámara avanza y la composición general se conserva. Esto verifica funcionamiento, no identidad de los personajes de La Llave. No se usaron credenciales, depósito, Runpod ni una API pagada.

## Integración preparada

- LTX seleccionado inicialmente; modo anónimo gratuito disponible sin introducir claves. Cuenta personal gratuita opcional para mayor cuota, verificada antes de usar token.
- Perfil LTX: vertical 576×1024, horizontal 1024×576, cuadrado 1024×1024, 24 FPS previstos; 3 o 5 segundos solicitados. Se valida resolución y duración en el navegador antes de importar. El FPS previsto es una capacidad del motor; el navegador no mide FPS del MP4.
- Inicio y final opcional para LTX. No se simula un prompt negativo separado que LTX no admite. Seed fijo; mejora automática del prompt desactivada.
- Wan: máximo 832 px, 16 FPS, imagen inicial, pasos 4/6/8 y prompt negativo. El fuente actual confirma 16 FPS pese a una explicación interna desactualizada que menciona 24.
- El contrato de componentes de la API se verifica antes de subir referencias. Un contrato cambiado bloquea la solicitud.
- Una solicitud simultánea por cliente; sin reintento ni cambio automático de motor. Los errores de cuota se muestran al usuario. Detener la espera no cancela una tarea ya enviada.
- Tokens solo en memoria, sin almacenamiento en proyecto ni navegador. Destinos exactos autorizados; no redirecciones con credenciales. No hay ruta de cobro en el cliente gratuito.
- MP4 reproducible, descarga, biblioteca local e inserción al timeline conservadas. Audio generado debe revisarse antes de publicar.

## Pendiente

Validar en navegador desplegado la autenticación opcional y CORS real; probar un fotograma autorizado de Caso 066, revisar identidad, lluvia, ropa, movimiento y montaje/exportación. No se debe presentar como producción publicada hasta aprobar ese paso. GPU privada Runpod sigue desactivada y no es un requisito de esta ruta gratuita.

La cuota pública puede agotarse, incluir cola o cambiar. Documentación consultada: https://huggingface.co/docs/hub/en/spaces-zerogpu. Fuentes ejecutables: https://huggingface.co/spaces/linoyts/LTX-2-3-First-Last-Frame/blob/0c5fe0edd9fc660a563f31e2df25fe36ab41a4d0/app.py y https://huggingface.co/spaces/zerogpu-aoti/wan2-2-fp8da-aoti-faster/blob/1ff7432a88d7827eb787ef10c15cbc5c85c841a2/app.py.
