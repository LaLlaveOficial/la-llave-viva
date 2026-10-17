# Cola persistente y respaldo · 17-oct-2026

## Alcance

La cola usa Neon, compartida por el disparador horario de Houston y el respaldo
Vercel. Este último tiene un cron diario a las 10:15 UTC, compatible con el límite
diario de Hobby; la precisión depende del plan de Vercel. También se puede
ejecutar desde Gerencia 066, incluso si Houston está caído. No requiere un modelo.
No es un respaldo horario ni protección contra caída de Neon o Vercel.

Solo ejecuta lecturas de métricas y preparación interna deduplicada. n8n, OpenCode
como ejecutor de negocio, proveedores alternativos, publicaciones y mailing no
se han migrado a esta cola. Sus aprobaciones y comportamientos siguen vigentes.

## Garantías y recuperación

- Clave de deduplicación por tarea y contenido inmutable comprobado por hash.
- Reserva atómica con `FOR UPDATE SKIP LOCKED`; cinco minutos de lease para
  trabajos acotados por la duración máxima de 120 segundos de la función.
- Cada reserva y recuperación incrementa la versión de control (fence).
  Un ejecutor vencido no puede completar ni fallar la nueva reserva.
- Hasta tres intentos. Fallos transitorios esperan un minuto; cuota y permisos
  bloquean la tarea en vez de cambiar de proveedor o ampliar el gasto.
- El resultado y su proyección en el historial operativo se confirman en una
  sola sentencia SQL. Las reservas incompletas conservan estado running.
- La recuperación de una acción externa incierta exige revisión. Los ejecutores
  actuales solo reclaman tareas `internal`; no ejecutan acciones externas.
- El cron requiere un secreto separado de al menos 32 caracteres, solo servidor.
  No acepta la sesión de navegador ni la credencial de Houston como sustituto.

## Prueba repetible

`node tests/queue066-integration.mjs` prueba concurrencia, lease vencido, cambio
de ejecutor, rechazo de resultado tardío, máximo de intentos, cuota bloqueada,
resultado externo incierto y confirmación atómica. Usa Postgres local de prueba,
sin credenciales ni servicios reales. CI verifica la interfaz con navegador.

El botón «Probar caída simulada» crea una tarea de diagnóstico por día de Chile.
El ejecutor primario falla de manera intencional, el respaldo la completa y se
rechaza un resultado tardío del primario. No apaga Houston ni cambia datos de
clientes. El historial conserva `simulatedFailure: true`; no demuestra una caída
real ni una conmutación entre proveedores de IA.

## Operación

En Gerencia 066 se ven las últimas 30 tareas y 40 eventos. «Ejecutar respaldo
interno» atiende una tarea de supervisión; no envía correos, publica ni modifica
campañas. Un HTTP 200 por sí solo no prueba éxito: revisar status, executor,
finished_at y los estados de cada fuente. Parcial se conserva como parcial.

Antes de usar n8n o cambiar automáticamente motores de IA faltan adaptadores,
proveedor independiente con presupuesto, supervisión de capacidad y pruebas
de caída específicas. No reutilizar esta garantía de idempotencia para prometer
exactly-once en servicios externos sin su propio mecanismo de confirmación.
