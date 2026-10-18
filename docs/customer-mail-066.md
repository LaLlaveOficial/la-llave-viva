# Clientes y mailing 066

Ruta privada: `/operaciones-066` → **Clientes y mailing**. Fuente: Neon, consultada al abrir/actualizar; búsqueda hasta 500 registros por tipo. No se publican los datos personales ni se incorporan al contexto de los agentes.

## Clientes y pedidos

- Compradores agrupados por correo; suscripción separada de la compra. No se crea consentimiento desde una venta.
- Contacto, dirección y detalle de importes; el pago se conserva separado del seguimiento manual de preparación, transportista, despacho y entrega. No hay integración con transportistas ni confirmación automática de recepción.
- Los registros clasificados como prueba, modo test y nombre `abc` se ocultan por defecto y pueden verse. Un pago live no demuestra por sí solo que sea una venta real: aún requiere revisar las pruebas históricas sin clasificación.
- Pendiente por más de dos horas = **posible** abandono. Un pago en proceso no se presenta como abandonado. El motivo debe venir del proveedor o ser informado por el cliente, registrando su fuente. La vista muestra las confirmaciones y recuperaciones de checkout ya existentes, sin crear otro recuperador duplicado.

## Campañas

1. Crear o usar **Preparar Halloween · 10%**. Editar asunto, preheader, mensaje, botón, fechas y segmento. Variables del cuerpo: `{{nombre}}`, `{{codigo}}`, `{{vence}}`. Bases opcionales para comunicar concursos; no ejecuta sorteos.
2. Guardar borrador y revisar vista previa. Congelar contenido y destinatarios; la audiencia incluye consentimiento vigente, excluye bajas y se deduplica por correo. Las campañas congeladas se duplican para cambios.
3. Aprobar la versión exacta activa su cupón, si existe. No envía mensajes. El cupón es válido para la audiencia congelada que conserve una suscripción activa, usando el mismo correo; 10% del libro físico, envío aparte, fechas inclusive según Chile. AJRAZ10 anterior sigue con su vencimiento original.
4. Confirmar **Enviar siguiente lote** (hasta 5 correos). Cada destinatario se reclama una sola vez y se revisa otra vez su consentimiento. Repetir para procesar los lotes restantes. No hay envío masivo automático en segundo plano ni programación de campañas en esta entrega.

Estados: `prepared`, `sending`, `sent`, `excluded`, `failed`, `unknown`. `sent` significa aceptado por Resend; no acredita entrega ni lectura. `sending` que no termina y `unknown` requieren revisar el proveedor antes de cualquier reenvío. No se reintentan automáticamente. No se implementan tracking de aperturas/clics, rebotes, segmentación por navegación, editor gráfico de arrastrar bloques ni respuesta automática a motivos de abandono. Los enlaces de compra incluyen UTM.

Servidor usa `RESEND_API_KEY` existente, sin exponerla al navegador, remitente de contacto del dominio y baja del Archivo 066. Preparar y aprobar por sí solos no envían correos. El borrador de Halloween debe revisarlo el propietario antes de su aprobación y envío.

## Infraestructura y pendientes relacionados

No se instaló n8n. Houston y servicios propios mantienen la orquestación existente. Los adaptadores de publicación Metricool y bandeja Instagram son módulos distintos; requieren sus propias autorizaciones, configuración y comprobación de lectura/escritura. Este módulo no afirma que esos permisos estén concedidos ni los activa.

Migración aditiva y repetible: `migrations/20261016_customer_mail.sql`. No modifica pagos, compradores ni consentimientos existentes. Verificación: integración PostgreSQL/API autenticada, UI sintética y compilación en CI.

## Cierre comercial y recibos (18-oct-2026)

Aplicar `migrations/20261018_mail_receipts066.sql` antes del despliegue.

Clientes muestra un resumen por fecha de creación del pedido en Santiago y moneda, separando `real`, `test` y `unknown`; solo pagos aprobados aportan importes, con libro y despacho separados. Modo live no acredita venta real. La clasificación se guarda desde el detalle con evidencia, versión y auditoría, conservando los pagos originales. No se clasifica automáticamente por nombre o UTM.

`mail-reconcile` es una operación POST privada de consulta a Resend: hasta cinco IDs únicos por lote, solo GET, plazo de seis segundos por consulta y enfriamiento de 24 horas por ID. Incluye pedidos, secuencia de suscriptores y campañas. Guarda únicamente ID, evento y fechas de observación; descarta destinatarios/cuerpos de la respuesta. Un fallo posterior conserva la última evidencia y muestra error de consulta. No envía, cancela ni reintenta correos. Estados originales y sus fechas no se sobrescriben. La fecha observada no se presenta como fecha real de entrega. Aperturas/clics son señales del proveedor, no lectura humana demostrada.

La reconciliación se inicia desde Campañas de email. Todavía no hay webhook ni cron automático para ella. No activar campañas o reenviar por un estado local `scheduled` antiguo.

Referencia del contrato: https://resend.com/docs/api-reference/emails/retrieve-email y especificación oficial https://github.com/resend/resend-openapi/blob/main/resend.yaml.

Verificación: `node tests/customer-mail-reconciliation.mjs` y `node tests/customer-mail-integration.mjs`, con Postgres aislado y proveedor simulado.
