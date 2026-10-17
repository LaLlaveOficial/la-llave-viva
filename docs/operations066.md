# Supervisión operativa sin IA

Houston ejecuta `operations-loop.mjs` treinta segundos después de iniciar y, al terminar cada intento, espera una hora antes del siguiente. Usa exclusivamente el token privado existente y la API propia; no llama al modelo, no publica, no envía mensajes, no modifica campañas ni contrata servicios.

La API `POST /api/agent-066?agent=analitica&op=maintenance` reserva atómicamente la hora UTC en `console066_operations_runs`. Dos procesos, reinicios o reintentos no duplican esa hora. Una reserva interrumpida queda visible como `running`; no se reintenta dentro de la misma hora. La siguiente hora puede continuar. No se recuperan ejecuciones omitidas durante una caída.

Las etapas son independientes: primero renueva las métricas directas (respetando la caché horaria existente); después prepara la cola diaria con la política y deduplicación de Gerencia 066. Una fuente fallida conserva su última lectura y produce estado `partial`; no se presenta como actualizada. La política de Gerencia puede pausar la creación de borradores sin detener la observación de métricas.

El resultado almacena fecha de inicio, cierre y estados de cada fuente. Agentes y conexiones → Consultar cupo de IA muestra el cupo comunicado por el proveedor y la última supervisión en un diálogo accesible. Un proveedor conectado no acredita cupo disponible ni resultados de agentes. La última supervisión no acredita que un borrador esté terminado.

## Activación

1. Aplicar `migrations/20261017_operations066.sql` (aditiva e idempotente).
2. Desplegar frontend/API en Vercel y el commit probado del gateway en el servicio Houston existente de Railway.
3. Confirmar despliegues terminales y una fila real de supervisión. Registrar por separado fuentes no disponibles.

No requiere n8n ni credenciales nuevas. Consume lecturas y cómputo de la infraestructura existente, aunque no consume turnos de IA. Los motores generativos, publicación, preferencias voluntarias y automatización de mailing siguen siendo entregas separadas.

## Consumo del análisis

La rutina de interpretación de analítica usa IA a las 09:00, 15:00 y 21:00 de Santiago (antes era cada hora). La sincronización operativa mantiene el ciclo horario sin modelo. La actualización del horario se aplica únicamente a `analitica` mediante setup dirigido; no reactiva ni modifica las otras rutinas. Esto evita 21 turnos programados de analítica al día, sin garantizar disponibilidad futura de la cuota compartida.

Las lecturas completas conservan caché de una hora. Una lectura parcial se reutiliza por quince minutos; una petición posterior puede renovar las fuentes para que un fallo de autorización ya corregido no quede retenido una hora adicional después de reiniciar Houston. No se crean reintentos en bucle.
