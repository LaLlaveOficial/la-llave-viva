# Respaldo de motores · Operación 066

## Estado comprobado el 17 de octubre de 2026

Houston conserva los siete roles existentes y sus rutinas. Las métricas horarias
ya corren sin modelo. Facebook tiene búsqueda indexada y registro de grupos y
borradores; no tiene un navegador desatendido conectado para unirse o publicar.

OpenCode oficial v2.0.32 se instala en la imagen de Houston y se comprueba con
`opencode --version` durante el build. Dos perfiles de revisión y planificación
residen en `/houston/llave-opencode/opencode.json`. No se inicia un servicio ni
se abre un puerto. Los proveedores están bloqueados en esa configuración hasta
elegir y autorizar uno. Instalar la CLI no conecta OpenCode con las rutinas de
Houston ni crea un respaldo operativo. No se migran credenciales de Houston.

## Diseño propuesto para n8n, todavía sin desplegar

n8n coordina horarios, alertas, reintentos y llamadas a ejecutores. OpenCode
ejecuta tareas de desarrollo/revisión; Houston conserva los agentes de negocio.
No son tres fuentes independientes de capacidad de IA. Si comparten proveedor
y cuenta, comparten su cuota. El respaldo ante agotamiento necesita otro
proveedor autorizado y límite de gasto explícito, o un modelo local con recursos
y calidad comprobados. No activar servicios de pago por defecto.

Antes de activar un respaldo:

1. Cola compartida persistente con clave única por tarea, estado, lease con
   vencimiento y fencing token para impedir resultados de un ejecutor vencido.
2. Clasificar fallos: error transitorio, caída de motor, cuota, autorización y
   resultado externo incierto. No reintentar errores de permisos o cuota en bucle.
3. Solo un propietario de cada tarea. Un timeout no prueba que el primer motor
   se haya detenido. Para publicaciones/envíos, comprobar el resultado antes de
   cambiar de ejecutor. Sin confirmación, bloquear y revisar.
4. Aprobaciones exactas y registro de resultado siguen siendo comunes a todos
   los motores. Los motores de respaldo no amplían permisos.
5. Aislar n8n del proceso de Houston. Compartir máquina o proveedor no protege
   contra caída de esa misma infraestructura. Queue mode de n8n requiere Redis,
   base de datos y workers; no añadirlos sin dimensionamiento y costo.
6. Probar caída antes de reclamar, caída después de reclamar, lease vencido,
   cuota agotada y caída después de un envío externo. Cero duplicados y un
   historial visible en OP066 son criterios de aceptación.

## Pendientes reales

- Elegir proveedor/modelo independiente, presupuesto y autorización segura.
- Instalar n8n en un servicio persistente separado y verificar recursos/costo.
- Implementar cola y adaptadores; ejecutar pruebas de conmutación.
- Conectar canales externos que faltan, incluido el navegador de Facebook.
- Mostrar estado y límites por motor en la consola. No presentar un binario
  instalado como agente disponible ni una tarea aceptada como completada.

Fuentes oficiales consultadas:
- https://opencode.ai/v2/docs
- https://opencode.ai/v2/docs/config/
- https://opencode.ai/v2/docs/agents/
- https://docs.n8n.io/hosting/scaling/queue-mode/
