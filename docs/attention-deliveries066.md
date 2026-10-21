# Atención y comprobantes OP066

## Correo

En Centro de marketing → Correo y CRM, autorizar Google y realizar la primera lectura. El servidor usa Vercel Connect con `GMAIL_CONNECTOR_UID`; nunca recibe tokens desde el cliente. Se puede vincular el conector Google ya instalado en producción. Si coincide con GA4, el consentimiento conserva también `analytics.readonly`.

Permisos: `gmail.readonly` y `gmail.send`. Google concede acceso a la cuenta; el importador limita su consulta y cada mensaje importado al alias `contacto@lallaveoficial.com`. Antes de leer o enviar verifica `users/me/profile` y que ese alias figure aceptado en `settings/sendAs`. No cambia aliases ni lee adjuntos. Gmail API debe estar habilitada en el proyecto OAuth y la cuenta debe estar autorizada en su pantalla de consentimiento.

Cada lote importa hasta cinco hilos de los últimos 90 días, con un máximo persistente de 20 hilos por ciclo móvil de 24 horas. La reserva impide consultas simultáneas; los mensajes y casos se deduplican por identidad estable. Un error conserva los registros y cierra el ciclo. Tras la primera lectura confirmada, el mantenimiento existente realiza la siguiente lectura cuando vence el ciclo; no utiliza modelos. El cupo puede dejar hilos fuera y no equivale a una importación completa del buzón.

Cada conversación con entrada crea un caso comercial. Es posible vincular explícitamente el hilo a un contacto existente del CRM; no se infieren identidades por nombres. Los mensajes preservan identificadores del proveedor, fechas, asunto, Message-ID y References. Respuestas en texto plano, con remitente fijo, threadId original e In-Reply-To/References. Preparar no envía: se revisa y aprueba la versión exacta. Una nueva entrada invalida un borrador anterior. Un envío con resultado desconocido queda bloqueado para evitar duplicarlo; comprobarlo directamente en Gmail antes de resolverlo. Aceptación por Gmail no acredita entrega.

## Instagram

El adaptador existente recibe webhooks firmados y permite respuestas revisadas dentro de su ventana admitida. Cada mensaje entrante vincula su conversación a un caso único, sin sobrescribir el seguimiento del propietario. La bandeja muestra configuración faltante, endpoint y última entrada confirmada.

Para habilitar recepción real se necesita una app Meta con Instagram API / Instagram Login, cuenta profesional, permiso de mensajes y suscripción del webhook `https://www.lallaveoficial.com/api/instagram-066`. Configurar de forma privada `INSTAGRAM_ACCOUNT_ID`, `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_APP_SECRET`, `INSTAGRAM_VERIFY_TOKEN` y `INSTAGRAM_INBOX_ENABLED=1`. El token de verificación debe tener al menos 32 caracteres; el secreto de app, al menos 16. No reutilizar el token de anuncios sin comprobar permisos. No solicitar secretos por chat. Configurar no acredita recepción: verificar un mensaje entrante real y su caso en CRM. Revisión de Meta o autorización del titular puede impedir el cierre inmediato.

## Publicaciones y producción audiovisual

La pantalla Publicaciones y entregas reemplaza el panel de programación que dependía de Metricool. Lee los comprobantes de grupos Facebook y mensajes, junto al registro persistente de exportaciones de Estudio 066. No activa nuevos servicios ni programa publicaciones por aprobar una pieza.

Estados diferenciados: montaje recibido, MP4 generado confirmado por Houston, descarga comprobada por el navegador, enviado a moderación, publicación documentada, mensaje aceptado y resultado desconocido. El registro del MP4 incluye identificador, SHA-256 del montaje, tamaño, duración solicitada, FPS, calidad y resolución. Tras descargar y comprobar la cabecera MP4, el navegador autenticado registra tamaño y SHA-256 de salida; ese hash es una comprobación del cliente, no una validación independiente del servidor. El archivo de Houston sigue siendo temporal: conservar el MP4 descargado. Se pueden descargar los comprobantes en JSON.

Los comprobantes de Facebook son observaciones documentadas y requieren evidencia y permalink cuando el estado es publicado. Una propuesta de agente, una captura pendiente o un envío a moderación no se presentan como publicación. No se modifica el circuito de aprobación de grupos ni se duplica una publicación pendiente.

## Validación

Aplicar `migrations/20261021_attention_deliveries066.sql` antes del despliegue; es aditiva y repetible. Pruebas: `node tests/attention-deliveries066-integration.mjs`, `node tests/marketing-delivery-integration.mjs` y pruebas de consola, marketing, GA4, cola y mantenimiento. Los proveedores se simulan; las pruebas no envían correos reales.
