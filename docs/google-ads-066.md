# Google Ads directo — La Llave

Verificado el 8 de octubre de 2026 a las 16:53 de Santiago. Cuenta `3149885754`,
La Llave Oficial, moneda CLP y zona horaria America/Santiago.

La autorización de la consola, el servidor oficial y la consulta de la cuenta real
funcionaron. Se guardaron métricas del 2 al 8 de octubre y cinco recomendaciones.
El bloqueo inicial de acceso Test dejó de impedir la consulta después del trámite
realizado por el propietario en Google Cloud. No se aplicaron cambios en campañas.

## Conexión

- Proyecto Google Cloud: `la-llave-operaciones-066`.
- Servicio independiente de Railway: Google Ads MCP 066.
- MCP: `https://google-ads-mcp-066-production.up.railway.app/mcp`.
- UID Vercel Connect: `google-ads-mcp-066-production.up.railway.app/google-ads-la-llave-066`.
- Sujeto de la consola: `console066-owner`.
- Callback OAuth: `https://google-ads-mcp-066-production.up.railway.app/auth/callback`.
- Fuente oficial fijada a `8efbd2e2b56da755cd0b3e642149ed8ad96b44b5`.
- Volumen persistente cifrado y claves privadas estables. No guardar secretos en Git.

La rama `google-ads-mcp-runtime-066` contiene únicamente el servicio de Railway.
No debe fusionarse con main: su árbol sustituiría el sitio.

## Lectura y verificación

La consola valida metadatos, comprueba la cuenta fijada y consulta campañas y
recomendaciones. No acepta GAQL arbitrario ni expone modificaciones de campañas.
OAuth usa el scope adwords; la restricción de lectura la impone la implementación.

Las observaciones guardadas incluyen fecha, periodo, moneda y zona horaria. No
representan un estado vivo. Consultar ahora realiza una nueva consulta directa;
Google mantiene sus propios retrasos de procesamiento. El último día es parcial.

Si Google devuelve la restricción de cuentas de prueba, se explica la solicitud
Explorer sin guardar una observación ni mostrar detalles internos del proveedor.

Fuentes oficiales:
- https://developers.google.com/google-ads/api/docs/developer-toolkit/mcp-server
- https://developers.google.com/google-ads/api/docs/oauth/cloud-project
- https://github.com/googleads/google-ads-mcp
- https://vercel.com/docs/connect

## Ampliación del centro Google Ads

Informes separados por campaña y periodo: campañas/presupuestos, evolución diaria,
palabras clave, términos de búsqueda, negativas, anuncios, catálogo de recursos,
recursos por campaña, conversiones por acción, configuración de conversiones,
recomendaciones detalladas, dispositivos/redes, ubicaciones, segmentación y cambios.
Cada informe valida campos con Google, conserva fechas y muestra campos omitidos
y límites de filas. Los informes no se combinan como si fueran el mismo periodo.

El análisis numérico calcula CTR/CPC/CPA/ROAS con denominadores válidos; el agente
Houston recibe un resumen limitado con fechas, cobertura y reglas de atribución.
CSV usa escape contra fórmulas. No se incluyen compradores privados ni credenciales.

### Extensión propia de cambios aprobados

`llave_changes.py` es código de La Llave, separado de las herramientas oficiales
de Google que son de lectura. Admite estado de campaña/anuncio, presupuesto diario
no compartido en CLP y negativa de campaña. No admite operaciones arbitrarias.

Valida el token OIDC firmado de Vercel, proyecto, equipo, audiencia y ambiente
producción. La propuesta se valida con Google `validate_only`, conserva estado
anterior, motivo y caduca en 30 minutos. La sesión privada y el origen de la
consola son obligatorios. Aprobar reclama atómicamente la propuesta; el estado
actual debe coincidir. SQLite persistente impide repetir un intento incierto.
La ejecución se confirma leyendo de nuevo el estado en Google. Ante pérdida de
respuesta, se registra resultado incierto y se exige revisar, sin reintento.
No se ejecutan campañas ni se genera gasto al instalar o probar validaciones.

La capacidad de ejecutar requiere también que Google autorice mutaciones para
la cuenta y ese usuario. La comprobación inicial usa únicamente validaciones
sin escritura; no se cambia una campaña real para probar.
