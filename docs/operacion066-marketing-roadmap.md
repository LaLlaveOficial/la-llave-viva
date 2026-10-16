# OP066 — Plan maestro de marketing y agentes

Fecha: 16 de octubre de 2026, America/Santiago.
Responsable editorial: Enrique Garrido Santibañez (Kike), Keloke SpA.
Objetivo: convertir el contenido de La Llave I: Ciudad Central en conversaciones, compras y comunidad medibles.

## Estado y alcance

Investigación de documentación pública y especificación funcional. No es una auditoría de código privado, una prueba de rendimiento de los proveedores ni una implementación desplegada. Kike confirmó las correcciones de nombres: TryCrush, Meet Millie AI, Visibly AI, Plixi y StoryLab.ai. Se incorporan además Hyper, n8n y Chatwoot.

Repositorio canónico confirmado: LaLlaveOficial/la-llave-viva, rama main. Se inspeccionaron el árbol de archivos, docs/console066.md, las métricas privadas, las misiones de marketing y la interfaz. Ya existen CRM, agregados de pagos, conexiones Ads/GA4/Metricool, Houston y estudio. Se amplía esa base; los permisos actuales de producción aún necesitan comprobación específica.

El documento previo «autogerente-066-estado-y-mandato.txt», leído durante esta revisión, registra verificaciones del 12 de octubre. Se trata como antecedente histórico: ni permisos, ni integraciones, ni estados de ejecución se consideran revalidados hoy.

## Inventario de referencias

Las capacidades siguientes son las descritas por los proveedores. La selección para OP066 es una propuesta propia y no implica contratar o copiar sus sistemas privados.

| Referencia | Capacidad descrita | Aplicación propuesta | Decisión inicial |
| --- | --- | --- | --- |
| TryHolo | Contexto de marca, estrategia y creación multicanal | Memoria de marca y brief único de campaña | Desarrollar el flujo propio |
| Soro — trysoro.com | Investigación y producción SEO | Cola editorial basada en intención de búsqueda | Evaluar junto con RankPill, sin duplicar flujos |
| TryCrush | Creación y operación de anuncios Meta | Propuestas publicitarias conectadas a resultados | Estudiar patrón; cambios con autorización |
| Meet Millie AI | Asistencia de estrategia y redes | Planificación contextual y borradores | Desarrollar con memoria compartida |
| Visibly AI — getvisibly.ai | Presencia de marca en respuestas de IA | Preguntas de descubrimiento del libro y seguimiento de menciones | Fase posterior a conversión |
| Madgicx | Análisis de campañas, creatividad y MCP | Diagnóstico publicitario con evidencia | Comparar integración frente a API directa |
| Plixi | Crecimiento de Instagram mediante automatización | Referencia para estudiar método y calidad de audiencia | Sin activación: seguidores no prueban ventas |
| Explee | Prospección, personalización y reuniones | Librerías, distribuidores y alianzas editoriales | B2B, con revisión de contactos y mensajes |
| Respond.io | Bandeja omnicanal, agentes y CRM | Atención, clasificación y traspaso a Kike | Comparar con Chatwoot y canales actuales |
| RankPill | Investigación, redacción y publicación SEO | Contenido útil orientado a descubrimiento y compra | No copiar promesas de ranking ni priorizar volumen |
| Copywriters.cl | Agencia, estrategia, contenido y agentes de marca | Briefs, metodología de campaña y revisión | Referencia de proceso |
| Manychat | Comentarios y automatizaciones de DM | Comentario «LLAVE» y conversación de compra | Prioridad alta; verificar permisos y reglas del canal |
| Buzzfy.co | Analítica y reutilización de reels, comentarios y MCP | Evaluación y recuperación de activos aprobados | Evaluar lectura analítica antes de pagar por acciones |
| Sintra.ai | Especialistas, memoria y tareas recurrentes | Roles con herramientas, historial y resultados | Desarrollar coordinación propia |
| Saleads.ai | Estrategias, creatividades y conexión publicitaria | Preparación de campañas y revisión antes del lanzamiento | Integrar capacidades existentes cuando convenga |
| Vilma.ai | Agentes y procedimientos de marketing | Tareas con entradas, revisión y entregable definido | Diseñar procedimientos propios |
| Fliki | Guion a video, voz, subtítulos y traducción | Adaptaciones del material aprobado | Integrar solo si resuelve una necesidad concreta |
| StoryLab.ai | Campañas, guiones, ganchos y textos | Derivar piezas desde una idea central | Desarrollo propio apoyado en modelos disponibles |
| Clicky Vicky | Planificación, creación, publicación y Model Studio | Calendario y selección de motor por tarea | Adaptar al estudio existente |
| Hyper | Agentes conectados a herramientas de marketing | Orquestación y uso de herramientas por rol | Referencia arquitectónica |
| n8n | Flujos y conexiones entre servicios | Automatizaciones internas y eventos | Candidato; revisar licencia para el uso concreto |
| Chatwoot | Atención omnicanal, contactos, API y autoalojamiento | Bandeja comercial integrada | Candidato frente a desarrollar toda la mensajería |

## Hoja de ruta en orden de valor

### P0 — Inventario técnico y medición confiable

Antes de agregar agentes, identificar repositorio, despliegue, base de datos, integraciones y trabajos existentes. Registrar por conector: cuenta, permisos solicitados y comprobados, operaciones de lectura/escritura, última comprobación y error actual. No mostrar «operativo» por tener una cuenta vinculada.

Definir una vista comercial por canal y período: gasto, visitas, conversaciones, pedidos y pagos aprobados. Separar compra real, prueba, atribución publicitaria y estado del pago. Las pruebas de septiembre y octubre son compras distintas; no fusionarlas por compartir precio. Las ventanas de atribución de plataformas no se suman como ventas únicas.

Datos mínimos: provider, account_id, campaign_id, event_id, order_id cuando exista, event_time, timezone, currency, amount, source, medium, campaign, attribution_window, is_test, evidence_ref. Guardar «desconocido» cuando falte la fuente.

Criterios de aceptación:
- Un pedido con varios eventos del proveedor cuenta una sola vez como compra.
- Un pago pendiente o rechazado no aparece como venta aprobada.
- Una prueba puede excluirse del resultado comercial sin borrar su registro.
- Fuentes con fechas, monedas o atribuciones diferentes permanecen identificadas.
- Las ventas internacionales sin acceso a datos del comercio quedan sin atribución confirmada.

### P1 — Atención de interesados y seguimiento comercial

Flujo inicial propuesto: interacción del usuario → apertura de conversación → consulta sobre país y formato cuando haga falta → respuesta con datos vigentes → enlace de compra con UTM → registro de estado → derivación a Kike cuando corresponda.

Usar el precio, stock, disponibilidad de formatos y condiciones de despacho desde una fuente validada. No inventar importes ni afirmar que el libro está disponible en un país sin verificarlo. El estado «compró» requiere evidencia de pedido o pago; un clic no basta.

Estados: nuevo, consulta respondida, enlace enviado, pendiente de respuesta, compra verificada, derivado, cerrado. Conservar consentimiento/contexto, historial y exclusión de seguimientos. Los seguimientos dependen de reglas y permisos del canal.

Criterios de aceptación:
- Eventos repetidos no producen mensajes duplicados.
- Rechazos y bajas detienen seguimientos.
- Falta de información o permiso genera bloqueo visible y no una respuesta inventada.
- Una consulta compleja se deriva con resumen y evidencia.
- Un timeout obliga a consultar el resultado antes de reintentar un envío.

### P2 — Analista publicitario

Leer campañas autorizadas y relacionarlas con la medición comercial. Informar gasto, entrega y resultados por objetivo: compras para ventas; visitas de perfil y seguidores cuando la plataforma los suministre para comunidad. No llamar lead a una reproducción.

Preparar propuestas con dato observado, período, limitaciones, motivo, cambio exacto y presupuesto afectado. La publicación o modificación exige autorización aplicable a la versión exacta. No cambiar las campañas existentes como parte de esta investigación.

La rentabilidad debe usar margen real: ingreso neto menos impresión, comisión, embalaje, despacho subsidiado y demás costos aplicables. No fijar un CPA objetivo universal sin estos datos. Con poca evidencia, declarar incertidumbre.

### P3 — Memoria de marca y estudio coordinado

Crear un expediente versionado: título, autor, sinopsis aprobada, universo narrativo, personajes, spoilers, ediciones, enlaces, activos autorizados, permisos de reseñas, voz editorial y restricciones.

Reglas iniciales: Santibañez sin tilde en la a; Ciudad Central no es Santiago; conservar portada real y continuidad; correo de la obra contacto@lallaveoficial.com; no repetir saludos en hilos continuados. Las voces originales y sincronía deben respetarse. Generación de video: una muestra por solicitud y revisión del prompt antes de gastar en nuevas generaciones.

El calendario utilizará activos aprobados y enlazará cada pieza a su brief, proyecto editable, versión exportada y resultados. Flujo: idea → guion → revisión → producción → revisión → programación → confirmación del proveedor → medición. Un borrador preparado nunca se presenta como publicado.

### P4 — SEO, visibilidad en IA y alianzas

Construir un calendario de contenidos con intención clara y fuentes. Revisar indexación, enlaces y datos del libro antes de producir artículos en volumen. Para visibilidad en IA: fijar preguntas, fecha, país/idioma cuando sea controlable, motor, repetición y fuentes citadas; una sola respuesta no es una medición estable.

Prospección editorial: verificar librerías, distribuidores, medios y derechos; registrar afinidad, fuente, canal profesional, historial y propuesta. Deduplicar contra el CRM. Preparar contactos para aprobación; no enviar mensajes por el mero hecho de existir un resultado de búsqueda.

## Arquitectura funcional propuesta

1. Contexto de marca y catálogo validado.
2. Conectores con permisos y estados comprobables.
3. Registro comercial y de eventos normalizados.
4. Agentes especializados con herramientas y entregables definidos.
5. Cola persistente, reintentos seguros, deduplicación y pausa.
6. Revisiones y autorizaciones vinculadas a versiones exactas.
7. Registro de acciones con evidencia del proveedor.
8. Panel operativo y exportación del informe de actividad.

Cada tarea tendrá task_id, módulo, objetivo, fuente, versión de entrada, estado, intentos, costo observado cuando exista, autorización aplicable, resultado y evidencia. Estados: pendiente, ejecutando, pendiente de revisión, aprobado, completado, bloqueado, fallido, resultado desconocido y cancelado. «Completado» requiere cumplir el criterio del tipo de tarea.

Los agentes propuestos son: gerente coordinador, atención comercial, analista de campañas, editor de contenido, productor audiovisual y relaciones editoriales. Son roles funcionales; no requieren seis modelos distintos ni seis suscripciones.

## Construir, integrar y costos

Construir: memoria, procedimientos, panel, registros, briefs, evaluación y coordinación. Integrar: mensajería, publicación, anuncios, pagos y modelos mediante capacidades oficiales disponibles. Evaluar reaprovechar la infraestructura existente antes de agregar n8n o Chatwoot.

Costos que deben medirse por separado: hosting y base de datos, uso de modelos, video/voz/imagen, mensajería, enriquecimiento y suscripciones opcionales. Una suscripción de usuario no implica acceso API incluido. No se ha fijado presupuesto nuevo ni contratado servicios.

n8n es fair-code bajo Sustainable Use License; no debe presentarse como licencia abierta irrestricta. Chatwoot ofrece autoalojamiento, pero se deben comprobar edición, funciones incluidas y costo operativo. Las condiciones se revisarán antes de seleccionar componentes.

REA queda como herramienta opcional de investigación sobre software accesible y autorizado. No recupera por sí sola backend privado, instrucciones internas, datos o pesos de modelos de un SaaS. No es una dependencia necesaria para desarrollar estos módulos.

## Primera entrega de implementación propuesta

Resolver el código canónico y auditar rutas existentes. Después implementar una sección aislada de «Estado comercial» con contratos de conectores y estados verificables. Empezar con lectura y datos reales; si se usan fixtures en desarrollo, marcarlos como demostración y nunca mezclarlos con métricas reales. Añadir el flujo comercial después de validar fuentes y permisos. La publicación en producción tendrá una revisión del cambio concreto.

## Fuentes públicas consultadas

- https://tryholo.ai/
- https://trysoro.com/
- https://trycrush.ai/
- https://www.meetmillie.ai/
- https://getvisibly.ai/
- https://mcp-docs.madgicx.com/docs
- https://plixi.com/
- https://explee.com/
- https://respond.io/help/quick-start/what-is-respondio
- https://rankpill.com/seo-content-writer
- https://copywriters.cl/
- https://help.manychat.com/hc/en-us/articles/16654065283100-Quick-Automation-Auto-DM-links-from-comments
- https://buzzfy.co/
- https://help.sintra.ai/en/articles/12638328-sintra-workspace-features-and-their-interaction
- https://help.saleads.ai/es/docs/conectar-plataformas
- https://vilma.ai/
- https://fliki.ai/features
- https://storylab.ai/
- https://help.clickyvicky.io/en/articles/16169614-what-clicky-vicky-does
- https://www.hyperfx.ai/
- https://support.n8n.io/article/can-i-use-your-license-for-my-use-case
- https://www.chatwoot.com/features

Revisión documental: 16 de octubre de 2026. Las promesas de rendimiento de proveedores no se consideran resultados comprobados para La Llave.


## Primer cambio preparado

Se añade evidencia fechada de Google Ads, Meta Ads, GA4, Instagram y TikTok mediante Metricool a la vista de métricas. Distingue lectura reciente (24 h), histórica y sin fecha verificable. Una importación manual no acredita lectura OAuth. No afirma vigencia de permisos ni habilita publicaciones. Pruebas de límites temporales, falta de datos e importaciones incluidas. El cambio está pendiente de revisión y despliegue.
