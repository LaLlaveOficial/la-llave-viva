# Google Ads directo — La Llave

Preparación del 8 de octubre de 2026. Cuenta fijada: `3149885754`.
**La conexión no está activada ni verificada contra la cuenta real.**

El cliente privado consulta exclusivamente el servidor oficial de Google Ads,
valida los metadatos antes de consultar, comprueba la identidad de la cuenta y
guarda observaciones con moneda, zona horaria y fecha. No acepta GAQL del cliente
ni expone herramientas que modifiquen campañas. Los permisos OAuth de Google
Ads incluyen el scope `adwords`; la limitación de lectura la imponen el servidor
oficial y el cliente, no un scope Google de solo lectura.

## Bloqueos observados

- Google Cloud muestra `Site Unavailable` en el navegador remoto, también tras
  recargar. No demuestra que Google Cloud esté caído ni que el PC del usuario falle.
- Vercel MCP devuelve 403 en el equipo `team_z4kBjgTzE68bW5vnitnmGZEi`
  (`la-llave-oficial-s-projects`); proyecto `prj_ZPjGSkXIoNQL9Bffl737UVQZ5363`.
- No hay variables Google en el servicio Houston de Railway. No modificar ese
  servicio para instalar este servidor, que necesita un proceso independiente.

## Activación pendiente

1. Crear o seleccionar el proyecto propio en Google Cloud, habilitar Google Ads
   API y verificar que tiene Explorer, Basic o Standard para consultar producción.
   No usar el proyecto OAuth de terceros, Gmail ni Windsor como sustituto.
2. Configurar consentimiento y cliente OAuth web para la cuenta
   `santibanez.luisenrique@gmail.com`. Registrar el callback que indique el
   servidor oficial (`/auth/callback` de su origen). Si Google exige aprobación,
   completar ese paso antes de afirmar acceso a producción. No poner secretos en
   el chat, Git ni el navegador cliente de La Llave.
3. Desplegar `deploy/google-ads-066/` en un servicio separado, con volumen
   persistente y las variables exigidas por `start.py`. El arranque falla si
   falta OAuth; no hay servidor público sin autenticación. JWT y clave de
   cifrado estables, privadas y generadas de forma aleatoria. OAuth se guarda en
   el volumen cifrado; no usar almacenamiento efímero.
4. Registrar su URL MCP en Vercel Connect, recuperar el UID **real** devuelto y
   adjuntarlo solo a producción del proyecto de La Llave. Configurar variables
   servidor `GOOGLE_ADS_MCP_URL=https://ORIGEN_REAL/mcp` y
   `GOOGLE_ADS_CONNECTOR_UID=UID_REAL`. No inventar el UID ni instalar Windsor.
5. En la consola: Google Ads directo → Autorizar Google Ads → Consulta ahora.
   Verificar customer, moneda, campañas y fechas devueltas. Si la cuenta no
   coincide, el cliente rechaza la consulta y no la guarda.

La vista muestra una observación anterior como anterior, nunca como estado vivo.
Cada consulta explícita va al servidor oficial, sin caché de dos horas. Google
mantiene sus propios retrasos de procesamiento; esto no promete datos instantáneos.

Fuentes oficiales:
- https://developers.google.com/google-ads/api/docs/developer-toolkit/mcp-server
- https://github.com/googleads/google-ads-mcp (commit revisado arriba)
- https://vercel.com/docs/connect
