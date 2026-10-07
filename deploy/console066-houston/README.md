# Activación real de Houston para La Llave

Estado: preparación de despliegue; el motor no está instalado en un servidor.
Centro 066 está publicado en Vercel con sesión privada y CRM Neon. Houston se
ejecuta aparte: su perfil selfhost guarda agentes, rutinas, modelos y credenciales
en /data. Requiere almacenamiento persistente y un proceso permanente. No se
debe presentar la consola como plataforma completa antes de probar misiones.

## Destino y acceso

Railway es una opción documentada por Houston. Falta conectar la cuenta del
propietario y verificar plan/costo antes de crear un servicio facturable. Crear
un servicio desde gethouston/houston, revisión
597cba982c0cb725edc92237d9be7a40db69a6ff, Dockerfile selfhost/Dockerfile, contexto
raíz, volumen /data, puerto 4318, TLS administrado. Configurar HOUSTON_HOST_TOKEN
manualmente como secreto; añadir COMPOSIO_API_KEY solo tras conectar el proyecto
propio. El motor sin Composio no tiene integraciones externas habilitadas. La
pantalla web requiere además compilar packages/web o desplegarla separadamente.

Como alternativa en un VPS Linux autorizado, prepare.sh descarga esa revisión
y compila la pantalla web oficial. No crea cuentas, claves ni cambia DNS. Tras
configurar selfhost/.env manualmente y apuntar un subdominio al VPS, start.sh
levanta el compose oficial con Caddy, TLS y disco persistente. Solo expone Caddy;
no publicar el puerto 4318 directamente. No montar el socket Docker del host.
Estos scripts tienen validación sintáctica; el build completo y la ejecución
requieren el servidor destino y no se han probado en este entorno sin Docker.

## Agentes propios

La raíz del repositorio incluye workspace.json y agents/*/houston.json con sus
CLAUDE.md, formato documentado por Houston. Importar el repositorio
LaLlaveOficial/la-llave-viva mediante New Workspace > Import from GitHub en el
Houston real. Son definiciones preparadas; importar no equivale a ejecutar.
Conectar el proveedor de IA dentro de AI Models mediante el flujo seguro del
propietario. Ninguna clave de ChatGPT se transfiere a Houston.

## Integraciones y pruebas necesarias

- Investigación: conectar búsqueda pública, verificar una ejecución con
  fuentes/fechas y guardar en CRM sin duplicados. El radar de ChatGPT existente
  conserva 08:00 America/Santiago: no crear otro cron hasta migrarlo y evitar
  doble ejecución. Todavía no importa automáticamente.
- Instagram: conectar @lallavesagaoficial mediante OAuth autorizado. La API de
  mensajes requiere que el destinatario haya iniciado conversación; una cuenta
  pública no basta para enviar un primer DM. Los cinco textos previamente
  aprobados deben recuperarse completos y enlazarse a su destinatario exacto.
  Preparar borradores no prueba envío ni seguimiento de cuentas.
- Ads/GA4: conectar cuentas de lectura y contrastar cifras; no cambiar campañas
  ni presupuestos. No atribuir a una sola compra las pruebas separadas de
  septiembre y octubre.
- Email: conservar api/subscribe.js y api/unsubscribe.js y sus secuencias
  existentes. Consultar estado antes de agregar flujos; no duplicar bienvenida
  ni reactivar personas dadas de baja.
- WhatsApp: requiere proveedor, autorización, destinatarios inscritos y costos
  verificados. No convertir los leads públicos en suscriptores.
- Antes de anunciar funcionamiento completo: comprobar /health, autenticación,
  modelo, una misión real por agente, reinicio con persistencia, registros de
  aprobación y resultados. La publicación web no sustituye estas pruebas.

Fuentes oficiales consultadas 7-oct-2026:
https://github.com/gethouston/houston/blob/597cba982c0cb725edc92237d9be7a40db69a6ff/README.md
https://github.com/gethouston/houston/blob/597cba982c0cb725edc92237d9be7a40db69a6ff/selfhost/README.md
https://github.com/gethouston/houston/blob/597cba982c0cb725edc92237d9be7a40db69a6ff/selfhost/deploy-railway.md
https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api
