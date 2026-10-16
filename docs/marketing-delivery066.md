# Entrega de publicaciones y bandeja privada

Implementación aditiva del Centro de marketing. No se ha publicado contenido ni enviado mensajes durante las pruebas.

## Programación

La pestaña Programación prepara una solicitud persistente desde una versión aprobada del calendario: copy, activo, red y fecha. Solo admite Instagram, TikTok y Facebook de la marca Metricool 6252950, America/Santiago. El propietario revisa el contenido exacto antes de ejecutar.

La conexión usa el OAuth existente de Metricool por Vercel Connect; nunca entrega tokens al navegador. `MARKETING_PUBLISH_ENABLED=1` habilita la comprobación de herramientas/marca y la ejecución revisada. Ausencia de la variable mantiene el adaptador apagado. El botón solo se habilita tras comprobar las herramientas de crear y consultar publicaciones. Una cuenta vinculada no garantiza permisos de todas las redes ni ausencia de límites del plan.

Se exige un activo público HTTPS estable (.mp4, .jpg, .jpeg o .png), sin parámetros temporales. No se suben archivos locales con este adaptador. Video obligatorio para REEL y TikTok. Fecha mínima cinco minutos. No se configura doblaje ni se replican opciones exclusivas de la aplicación de Instagram.

La reserva atómica por pieza/versión impide repetir una solicitud. Solo se declara programada tras leer de vuelta el identificador, copy, red, activo, fecha y estado PENDING del proveedor. AWAITING_CONFIRMATION exige confirmación en Metricool. Si Metricool transforma la URL del activo o la respuesta no permite comprobar todos los datos, se conserva resultado desconocido. Un timeout no genera reintento. Una modificación del calendario invalida la solicitud preparada. Programada no equivale a publicada.

## Instagram

Webhook público: `/api/instagram-066`. No utiliza la sesión de consola; autentica eventos con HMAC SHA-256 sobre el cuerpo original y exige cuenta/destinatario coincidentes. No admite importación de seguidores, envíos masivos, comentarios ni lectura histórica. Conserva únicamente entradas de texto recibidas por ese webhook.

Variables privadas necesarias: `INSTAGRAM_ACCOUNT_ID`, `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_APP_SECRET`, `INSTAGRAM_VERIFY_TOKEN` (mínimo 32 caracteres), `INSTAGRAM_INBOX_ENABLED=1`. Token dedicado de cuenta profesional con los permisos y suscripción de mensajes correspondientes al flujo Instagram Login. No reutilizar tokens de Ads o CAPI. Configurar y autorizar en Meta/Vercel de forma privada; no pegar secretos en documentos ni chats.

GET verifica el challenge de la suscripción. POST firmado almacena el identificador único del proveedor. Eventos repetidos no duplican entradas; el tiempo de respuesta procede del evento original, no de su recepción. El adaptador aplica un límite interno conservador de 24 horas desde el último mensaje entrante.

La respuesta queda pendiente de revisión e inmutable. El propietario aprueba ese texto concreto para enviarlo una sola vez. Una solicitud en curso o incierta bloquea nuevas respuestas de la conversación. Un borrador puede descartarse. La aceptación con message_id y destinatario coincidentes no acredita entrega ni lectura. Resultados inciertos requieren revisar Instagram; no existe botón de reintento ni resolución automática.

## Verificación y límites

`tests/marketing-delivery-integration.mjs` ejecuta Postgres real embebido, migraciones repetibles, firma/account isolation, deduplicación, aprobación, bloqueo ante timeout y lectura posterior de programación con proveedores simulados. El recorrido de navegador verifica además ambas pestañas con conexión apagada. No son una prueba de permisos externos ni una publicación real.

Migraciones: `20261016_instagram_inbox.sql` y `20261016_publication_outbox.sql`. Solo crean tablas e índices; no modifican pedidos ni borran datos. El historial contiene referencias de envío y estados. Los mensajes no se pasan al contexto general de agentes.

Fuentes técnicas:
- https://www.postman.com/meta/instagram/request/1rgmhuk/text-message
- https://help.metricool.com/schedule-and-edit-posts-through-an-llm-with-metricools-mcp-p8y4b
- https://help.metricool.com/mcp-limits-and-plan-requirements-h72jg
- https://app.metricool.com/api/swagger.json
