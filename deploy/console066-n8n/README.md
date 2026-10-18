# Respaldo n8n de Operación 066

Estado: preparado para importar; **no hay una instancia n8n instalada ni un flujo activo**.
Houston conserva su servicio, datos y commit fijado. Este contenedor necesita un servicio y un volumen independientes; no se monta en Houston.

El flujo llama cada 15 minutos a un endpoint con permiso limitado a renovar métricas y preparar tareas internas. No llama modelos, no publica, no envía correos y no cambia campañas. La cola Postgres arbitra la ejecución: si Houston tiene una reserva válida, n8n no la duplica; si vence, puede recuperarla. Los límites de tres intentos y las barreras de versión siguen aplicando. Una caída de Vercel/Neon afecta a ambos: esto proporciona independencia del ejecutor, no de toda la infraestructura.

## Activación pendiente

1. Revisar el coste mensual y fijar el límite de gasto en Railway antes de crear cómputo/volumen. Falta el importe autorizado; el presupuesto de anuncios no autoriza infraestructura adicional.
2. Desplegar este Dockerfile en un servicio separado, con una sola réplica y volumen en `/home/node/.n8n`. Mantener una clave `N8N_ENCRYPTION_KEY` estable y privada; no versionarla. Configurar hostname HTTPS/proxy de la instancia y completar el propietario inicial.
3. Crear un token aleatorio exclusivo de 32 bytes o más. Configurar `N8N_BACKUP_TOKEN` y `N8N_BACKUP_ENABLED=1` en Vercel, desplegar y guardar el mismo token como credencial n8n **Header Auth**, nombre `Authorization`, valor `Bearer …`. No reutilizar el token de Houston, no entregar la base de datos a n8n y no desactivar el bloqueo de acceso a variables desde nodos.
4. Importar `operations-backup.json`, sustituir la referencia de credencial y ejecutar manualmente. `complete` o `partial` indican ciclo terminado; `already_reserved` solo indica que otro ejecutor tiene o terminó el trabajo. `lost_lease` y `retry_pending` requieren revisar la cola.
5. Probar una tarea interna sintética con una reserva vencida y verificar en Postgres `owner=n8n-backup`, dos intentos y un único evento completed. Las pruebas de integración incluidas cubren esto en Postgres aislado; falta repetirlo con la instancia real.
6. Publicar el workflow y comprobar una ejecución programada real antes de anunciar respaldo conectado. Mantener el cron diario de Vercel como tercer ejecutor.

La imagen está fijada a 2.43.7 (registro npm consultado el 18-oct-2026); falta comprobar la descarga y el arranque del contenedor en Railway. El workflow se distribuye inactivo y sin credenciales. Documentación oficial: https://docs.n8n.io/hosting/installation/docker/ y https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.scheduletrigger/.
