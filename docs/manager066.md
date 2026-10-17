# Gerencia 066 · primera entrega

## Implementado

Panel privado **Gerencia 066**: política de preparación, cola persistente y radar de fuentes públicas. Al pedir contexto desde Houston, analítica/gerencia/contenidos pueden crear la selección diaria usando versiones aprobadas de marca y producto. La selección inicial cubre Instagram, TikTok y Facebook, observados en la marca La Llave de Metricool el 16-oct-2026. No se confunden las redes de Keloke con las de La Llave.

Una única operación SQL congela hasta el máximo diario configurado, con máximo 24 tareas abiertas. No regenera la selección de hoy ni crea tareas por cada visita. Una marca o catálogo modificado invalida la exportación de las plantillas anteriores. Pausar esta preparación no detiene anuncios, rutinas existentes ni otros procesos.

Los agentes reciben encargos por rol y guardan entregas con `managerJobId`. El servidor vincula la entrega a la tarea de forma atómica, comprueba el rol y evita dobles entregas. El estado **drafted** acredita texto guardado, no un archivo audiovisual ni publicación. El panel muestra la entrega y el último ciclo registrado; no presenta conexión como actividad 24/7 comprobada.

Las piezas iniciales son plantillas vectoriales con portada real y textos de intriga/compra; pueden exportarse a SVG y PNG desde el panel, incorporando la portada al archivo. No son imágenes generadas por IA. Los encargos incluyen objetivo, dimensiones, canal, CTA, UTM, instrucciones y versión de catálogo. El video mantiene el flujo de Estudio 066 existente; este módulo no conecta Kling, Veo ni Firefly, no genera escenas y no activa renders autónomos.

Radar: URL HTTPS pública sin parámetros, categoría, fecha y evidencia con clasificación manual. No importa seguidores, teléfonos o correos; no crea suscripciones ni envía invitaciones. Las fuentes y entregas se tratan como datos, no órdenes para ampliar permisos. Los gustos de clientes se incorporarán únicamente a partir de preferencias que ellos entreguen voluntariamente, con origen y fecha.

## Autonomía actual

Preparación interna permitida; gasto adicional autorizado por esta ampliación: cero. No concede autonomía para publicar, enviar mensajes, seguir/dejar de seguir cuentas ni alterar presupuestos. Los mecanismos de aprobación de anuncios, publicaciones y mailing existentes conservan sus reglas. La operación cuando Kike no está depende de las rutinas de Houston y de que se confirme su ejecución; no se instala un scheduler nuevo ni se afirma uptime por desplegar el módulo.

## Próximas entregas necesarias para el objetivo completo

1. Productor generativo: conectar un proveedor autorizado de imágenes y otro de video; límites de costo, referencias, una muestra, verificación de archivo final, derechos de activos y revisión de continuidad/calidad. Las fichas de modelos actuales no acreditan conexiones operativas.
2. Producción programada: worker durable con cupos, idempotencia, recuperación ante fallos y confirmación de archivo exportado; probar con un encargo completo antes de autonomía de generación.
3. Publicación: comprobar credenciales y permisos de escritura para cada canal; usar material exacto aprobado y verificar el identificador del proveedor. Métricas disponibles no acreditan publicación disponible.
4. Atención: invitación a interesados y respuestas a conversaciones válidas con aprobación aplicable. No usar seguidores de competidores como una lista de destinatarios. TikTok Research API se limita a investigación no comercial; no es un conector comercial de prospección.
5. CRM: preferencias voluntarias, segmentación de mailing, consentimiento por canal y supresión sincronizada; conservación y actualización de datos. La compra no equivale a suscripción.
6. Ads: márgenes y stock vigentes, presupuestos explícitos, decisiones con muestra suficiente y límites de actuación por cuenta. No garantiza ventas ni viralidad.
7. n8n: prueba aislada del flujo suscripción → bienvenida aprobada → espera → comprobar compra → detener o continuar seguimiento. Evaluar costo, recuperación, duplicados y mantenimiento antes de instalar un servicio o sustituir procesos existentes. No desplegado.

## Evidencia y comprobaciones

Migración aditiva `20261016_manager066.sql`; integración Postgres/handler autenticado: concurrencia diaria, dependencias aprobadas, aislamiento de roles, entrega única, invalidación por cambios y validación de fuentes. UI: cola, portada embebida, exportación PNG, radar, pausa y móvil. No se ejecutan llamadas externas en estas pruebas.

Referencias oficiales consultadas el 16-oct-2026:
- https://developers.tiktok.com/products/research-api/
- https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.wait
- https://docs.n8n.io/build/flow-logic/handle-errors-gracefully.md
- https://docs.n8n.io/build/understand-workflows/understand-executions/view-all-executions.md

No se afirma superioridad universal. Criterios de progreso: piezas exportadas y aprobadas, consultas atendidas correctamente, compras reales y margen; cobertura de datos, costos, incidencias y duplicados.
