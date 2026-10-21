# Sincronización privada del estudio · preparación 18-oct-2026

El montaje guarda un snapshot versionado por proyecto. Antes de confirmar un snapshot, todos sus originales deben estar verificados como `ready` en ese mismo proyecto. La biblioteca usa un bucket privado; las URLs firmadas vencen en 120 segundos y nunca incluyen el secreto del servidor. Conserva los límites existentes: 50 MB por original, 80 archivos y 256 MB por proyecto remoto. El respaldo nativo local sigue admitiendo sus límites mayores.

Al abrir Montaje, un dispositivo vacío puede recuperar el snapshot y descargar todos los originales tras verificar tamaño y SHA-256. Si ya hay un montaje o trabajo de generación local de otra versión, exige recuperación manual y conserva copia de los datos anteriores. Si falla una descarga o el almacenamiento, revierte los archivos recién incorporados; no sobrescribe originales existentes. Las escrituras concurrentes usan compare-and-swap y devuelven conflicto. El editor redibuja su interfaz sin detener el sincronizador; solo lo desecha al salir.

El guardado automático se dispara desde Montaje, tres segundos después del último cambio, e incluye el estado de generación disponible en ese navegador. Editar exclusivamente en Generación todavía no activa guardado automático remoto: abrir Montaje y usar Archivo y respaldos → Sincronizar proyecto ahora. No hay colaboración simultánea ni fusión automática de versiones.

## Activación pendiente

- Aplicar `20261018_studio066_project_state.sql` en la rama de producción seleccionada. Migración aditiva: no modifica pedidos ni campañas.
- Aprobar y aplicar CORS del bucket `studio066-production`: orígenes exactos `https://www.lallaveoficial.com` y `https://lallaveoficial.com`; métodos GET, HEAD y PUT; headers content-type y x-amz-checksum-sha256; exponer ETag y Content-Length; caché 300 s. No usar origen comodín ni hacer público el bucket.
- El cambio de CSP preparado permite conectar solo al endpoint exacto de esa rama, conservando las restricciones restantes.
- Mantener `STUDIO_CLOUD_ENABLED=0` hasta esos pasos. Las variables del conector están preparadas en Vercel; no se incluyen en Git.
- Tras desplegar, comprobar con un archivo sintético: subir y confirmar, abrir un dispositivo vacío, recuperar, verificar SHA-256 y provocar un conflicto entre dos versiones. El circuito real de navegador todavía no se ha probado; las pruebas incluidas usan Postgres aislado y transferencias simuladas.

## Respaldo de ejecución y modelos

El flujo n8n está en `deploy/console066-n8n`, inactivo y sin token. La prueba aislada verifica que recupera una reserva vencida de Houston sin aceptar luego su resultado atrasado. Falta desplegar una instancia independiente y comprobar su ejecución programada real.

El respaldo de modelos sigue sin conectar. OpenCode ya está instalado en Houston, pero no tiene un proveedor independiente habilitado. Habilitar Neon AI Gateway no conecta por sí solo un motor de respaldo ni establece un presupuesto. Antes de activarlo faltan: proveedor/modelo, tope de gasto autorizado, reserva transaccional de presupuesto antes de llamar, límites de entrada/salida, reconciliación del consumo y una prueba de fallo real que termine un borrador sin publicarlo. No se debe anunciar sustitución automática de agentes hasta completar ese circuito.
