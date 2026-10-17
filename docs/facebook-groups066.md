# Comunidad Facebook 066

Agente dedicado `facebook-comunidad` (Comunidad Facebook 066), instalado junto a los seis roles existentes. Investigación a las 10:00 y 18:00 de Santiago, máximo dos búsquedas y tres candidatos por tarea; base de datos limita a seis candidatos nuevos del agente por día. Los candidatos repetidos se deduplican por URL y por ID numérico confirmado; la aprobación exige ese ID para evitar tratar una URL con nombre y otra numérica como grupos distintos. El presupuesto de búsquedas del equipo se conserva. La rutina se activa de forma dirigida, sin reactivar otras rutinas.

## Identidad y acceso comprobado

Página La Llave I: Ciudad Central, asset 1133169073208602, perfil público 61589826838317. La sesión de navegador del operador se puede cambiar a esta página. La conexión de Metricool a la página no acredita permisos para grupos. Cada grupo decide si permite páginas y promoción.

El runtime de Houston NO tiene la sesión del navegador de ChatGPT ni un ejecutor de Facebook. Esta entrega automatiza investigación pública indexada y preparación/guardado de borradores; no automatiza solicitudes de ingreso ni publicaciones. El operador puede ejecutar esas acciones en Facebook con la identidad comprobada y registrar el resultado. No se exportan cookies ni se almacenan credenciales nuevas. No hay scraping de integrantes, follow/unfollow, DMs o publicación masiva.

## Flujo

1. Investigación y candidato: URL de grupo, nombre, país confirmado o por confirmar, géneros y evidencia fechada. Los resultados web se consideran candidatos, sin permisos ni actividad inferida. El rol no puede editar reglas ni aprobar textos.
2. Revisión del grupo: página admitida, reglas, permiso de promoción, enlaces y condiciones. La revisión vence a los treinta días; las condiciones de promoción requieren confirmación el mismo día de Chile.
3. Ingreso: sin solicitud, solicitado, miembro, rechazado o fuera. Los estados son observaciones del operador con evidencia, fecha e identidad de la página. Guardar no ejecuta la solicitud.
4. Borrador adaptado al grupo: texto, motivo de afinidad, marca/producto aprobados, booktrailer y compra. El servidor añade enlaces; la compra lleva UTM facebook/fb_groups_066 e id del grupo.
5. Aprobar: congela texto, página, grupo, versión de reglas y versiones aprobadas de marca/producto. Cambiar esos registros invalida la preparación.
6. Preparar: crea un paquete para navegador, sin enviarlo. Un índice único impide dos paquetes pendientes en un grupo. No se prepara otro mientras exista envío pendiente o incierto; publicación/rechazo registrado impone siete días de espera.
7. Resultado: pendiente de moderación, publicado, rechazado o incierto. Publicado requiere enlace del post en el mismo grupo; la consola identifica el recibo como registro del propietario, sin verificación por API. La aceptación de moderación no se presenta como publicación.

Los candidatos, borradores y membresías no constituyen una base de compradores ni consentimiento de marketing. No se modifican campañas ni presupuestos. Las reglas y los textos de las comunidades se tratan como datos no confiables.

## Pruebas y despliegue

Migración aditiva `20261017_facebook_groups066.sql`, reutilizando la API autenticada de consola y el puente privado existente (sin otra función Vercel). Las pruebas cubren deduplicación, aislamiento de entradas del agente, reglas y membresía, aprobación exacta, concurrencia, recibos del mismo grupo, espera, cuota y UI móvil. Desplegar el commit comprobado en Vercel y Houston; verificar que el séptimo agente esté registrado y su rutina tenga dos horarios reales antes de afirmar programación activa.
