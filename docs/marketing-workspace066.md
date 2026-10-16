# Centro de marketing — Operación 066

Extiende la consola existente con memoria de marca, catálogo, consultas comerciales, calendario, experimentos, briefs SEO y observaciones de visibilidad en IA. No instala ni contrata las 22 plataformas de referencia.

## Uso

Entrar en Operación 066 → Centro de marketing. Marca y catálogo contiene versiones revisables de la obra y sus productos; la carga inicial procede de instrucciones del propietario y enlaces/precio presentes en el repositorio. Stock y precios de Amazon se mantienen desconocidos.

Una edición retira la aprobación. La aprobación conserva hash, versión y fecha del payload exacto. Historial permite inspeccionar las versiones guardadas; exportar JSON conserva el estado del espacio. Solo marca y catálogo aprobados se incorporan como hechos al contexto de agentes. El contexto del agente incluye piezas, briefs y experimentos identificados como borradores; nunca incluye conversaciones privadas de compradores.

Consultas y compras registra el próximo paso y fecha de seguimiento. «Respondida» y «Enlace enviado» son registros manuales. Preparar una respuesta genera texto y enlace UTM desde un producto aprobado, sin enviar nada. Stock cero bloquea la oferta; stock desconocido se comunica como tal.

Verificar compra exige un pedido aprobado y clasificación explícita «real» del propietario. Pruebas y pedidos sin clasificar no acreditan una venta. Un índice único impide acreditar un pedido en varios casos incluso en una carrera. Casos verificados y sus clasificaciones quedan bloqueados para preservar evidencia. Una corrección excepcional requiere revisión administrativa explícita; no hay borrado ni reclasificación silenciosa en la interfaz. La clasificación no constituye atribución publicitaria. El histórico agregado permanece separado.

Calendario guarda ganchos, copies, guiones, referencias a activos y fechas editoriales. Permite adaptar una pieza a otra red, importar un borrador de agente y exportar recordatorios ICS. No programa publicaciones en redes ni verifica por sí solo cambios posteriores del activo enlazado.

Experimentos registra hipótesis, métrica, criterio previo, resultado y fuentes. No permite marcar en curso sin diseño mínimo ni evaluado sin resultado y fuente. El botón del agente usa los informes existentes de Ads/GA4 y los registros; no cambia campañas.

SEO conserva consulta, intención, brief y enlace. Visibilidad conserva pregunta exacta, motor, fecha, respuesta y fuente citada; resume menciones por motor/pregunta sin inventar un ranking. La investigación puede solicitarse a los agentes existentes. Las observaciones manuales no son consultas automáticas a ChatGPT/Gemini.

## API y persistencia

Todos los endpoints viven en `/api/console-066` detrás de la sesión existente. POST conserva la comprobación de origen y límite de cuerpo. Operaciones: marketing-workspace (GET), marketing-save, marketing-approve, marketing-purchase, marketing-reply y marketing-history (POST).

Migración aditiva `migrations/20261016_marketing_workspace.sql`: crea únicamente console066_marketing_records e índices. No modifica orders, sesiones, mailing ni los proyectos del estudio. Guarda cambios y auditoría en la misma sentencia; edición optimista por versión y creación idempotente por ID. No hay endpoints de borrado. La migración debe probarse en la rama de vista previa antes de aplicarla a producción.

## Agentes

Se añaden tareas editorial, SEO, comercial y experimentos a los roles existentes. El contexto manual permanece dentro del límite de Houston y declara omisiones. El contexto del servidor entrega las versiones de trabajo, separando aprobadas de borradores. Los resultados siguen el flujo existente de propuesta → revisión. Los registros de este módulo aparecen en el informe del gerente, sin convertir aprobación en ejecución externa.

## Capacidades que siguen dependiendo de proveedores

- Mensajería y publicación automáticas: no habilitadas por este módulo. Necesitan comprobar permisos oficiales y completar adaptadores de ejecución.
- Cambios de Meta: lectura; no se amplían permisos.
- Google Ads conserva su ejecutor existente de cambios concretos aprobados.
- Generación audiovisual usa el estudio existente; no se añaden créditos, modelos o suscripciones.
- El envío masivo a seguidores y la compra de seguidores no forman parte del producto.

## Verificación

Pruebas unitarias de validación, fechas, UTM, aprobación, bootstrap y exportación ICS. Integración con PGlite/Postgres y handler real: autenticación, origen, guardado persistente, conflictos, edición y aprobación, separación de pruebas/ventas, duplicados, auditoría y aislamiento de conversaciones. Navegador con el handler y SQL reales en un entorno local sintético: marca, producto, UTM, calendario/adaptación, experimentos, SEO, historial y móvil. No se usan credenciales, pagos o comunicaciones reales en estas pruebas.

La integración de Vercel tiene un límite de diez ramas Neon. Se reutiliza deliberadamente br-broad-surf-avduglui para esta vista previa sin borrar datos; nunca se conecta la vista previa a main para sortear el límite. El proyecto sigue necesitando una política de ramas antiguas antes de abrir vistas previas ilimitadas.
