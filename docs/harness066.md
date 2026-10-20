# Harness de OP066

El control se aplica en el servidor `api/agent-066.js`, detrás de la autenticación existente, y funciona con el cliente Houston ya instalado. No se agrega un modelo, proveedor ni servicio de pago.

## Comportamiento

- El contexto se selecciona por rol, conserva fechas, estados y registros aprobados sin reescribirlos, y elimina entradas completas cuando no caben. Devuelve los contadores de omisión; no presenta una memoria parcial como completa. Máximo 48.000 bytes. La estimación de tokens no es una medición de facturación.
- El agente solo recibe un catálogo breve de las herramientas de su rol. Los límites y permisos se validan en código al invocarlas, sin adjuntar catálogos MCP externos ni sus esquemas.
- Los cupos diarios persistentes se reservan mediante UPSERT atómico en Postgres: 24 lecturas de contexto y 12 guardados por agente, 6 búsquedas por rol habilitado y 24 búsquedas para todo el equipo. Facebook tiene 6 candidatos y 6 borradores por día. Los intentos fallidos también consumen cupo. El día se calcula en Santiago.
- Tres fallos consecutivos de una herramienta la pausan 15 minutos. Las respuestas 403/429 indican detenerse; no se compran créditos ni se cambia de proveedor para sortear el límite.
- Antes de guardar se validan el formato permitido al rol, posibles secretos, marcadores incompletos y URLs públicas. Una oportunidad debe incluir fuente o indicar explícitamente el bloqueo o ausencia de novedades. Los guardados genéricos idénticos reutilizan el comprobante mediante una huella única; los encargos conservan su barrera de entrega única. Se conserva una comprobación fechada junto al borrador; **no es comprobación independiente de los hechos**. El estado continúa `pending_review`; nunca equivale a envío o publicación.
- La cola existente conserva deduplicación, recuperación tras reinicio, máximo de tres intentos y bloqueo de resultados externos inciertos. El estado del harness y sus contadores aparecen en Cola y respaldo.
- Las métricas conservan la caché de 24 horas, incluidos resultados parciales. Una reserva atómica impide que agentes simultáneos dupliquen la consulta. Si el proceso se interrumpe, se conserva la última evidencia y la reserva no se reintenta dentro de las 24 horas. Metricool permanece desactivado.

## Activación y límites

Aplicar `migrations/20261020_harness066.sql` antes de desplegar. Es aditiva e idempotente y conserva las búsquedas del día anterior a la activación. Si la tabla no está disponible, las herramientas fallan sin ejecutar el proveedor. El mantenimiento de la cola y el checkout no dependen de estos cupos.

Este harness controla la API y los datos de OP066. No controla herramientas de terminal fuera del puente, el prompt interno del proveedor, su compresión de conversaciones ni el coste global de Houston/Codex. No promete que todos los componentes del sistema queden libres de errores. Las barreras que ya existen para acciones externas siguen siendo necesarias.
