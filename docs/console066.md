# Centro 066: primera integración privada

Estado: preparado para revisión, sin despliegue ni migración en producción.

## Superficie

Ruta propuesta: `https://lallaveoficial.com/operaciones-066`.
La ruta no aparece en el sitio ni en el sitemap. La privacidad de los registros la proporciona la autenticación del servidor, no el nombre de la ruta. El HTML y su código de interfaz no contienen datos privados ni claves.

Esta entrega incorpora CRM persistente, filtros, notas, mensajes por destinatario, aprobación del texto exacto, estados de contacto, tablero de 17 pendientes, registro de cambios y estado real de herramientas. La migración prepara 31 candidatos públicos del archivo del 7-oct-2026. No incorpora direcciones personales ni seguidores extraídos. Los cinco DM aprobados previamente no se importan sin recuperar sus textos exactos.

## Habilitación posterior a aprobación

1. Aplicar `migrations/20261007_console066.sql` primero a una rama de prueba Neon y verificar los 31 registros y 17 tareas. La migración solo crea tablas `console066_*`; no altera orders, mailing_subscribers ni los flujos actuales.
2. Configurar en Vercel, solo en el servidor:
   - `DATABASE_URL`: conexión de la rama escogida.
   - `CONSOLE_ORIGIN`: origen HTTPS exacto, sin slash final, por ejemplo `https://lallaveoficial.com`. Las vistas previas deben configurar su propio origen.
   - `CONSOLE_PASSWORD_HASH`: scrypt, formato `saltHex:derivedKeyHex`, salt de 16 bytes y clave derivada de 64 bytes. Usar una contraseña aleatoria, única y de al menos 12 caracteres; no ponerla en el repositorio ni en este documento.
   - `CONSOLE_SESSION_SECRET`: secreto aleatorio de al menos 32 caracteres para seudonimizar límites de acceso.
3. Revisar el cambio y autorizar merge/despliegue en producción por separado. Comprobar login, logout, guardado y persistencia real antes de anunciar que está operativa.

Para generar el hash en una terminal segura sin mostrar la contraseña:

```js
// Introducir la contraseña mediante entrada segura; no como argumento de shell ni en el código.
import {randomBytes,scryptSync} from 'node:crypto';
const salt=randomBytes(16).toString('hex');
const encoded=salt+':'+scryptSync(passwordFromSecureInput,salt,64).toString('hex');
// Copiar encoded a la variable del servidor; nunca registrar passwordFromSecureInput.
```

## Controles

- La configuración incompleta devuelve 503 y mantiene los datos inaccesibles.
- Sesiones aleatorias persistentes por ocho horas, token SHA-256 en la base y cookie `__Host-`, HttpOnly, Secure, SameSite Strict.
- POST exige JSON y el Origin configurado; no se habilita CORS.
- Los intentos de login tienen límites persistentes por IP y globales cada hora; en Vercel se usa el header sobrescrito por la plataforma. Fuera de Vercel todos los intentos comparten el bucket desconocido, sin confiar en headers de un proxy no configurado.
- Las revisiones usan versión optimista y registro atómico de auditoría. Editar un mensaje desmarca la aprobación en la interfaz; el servidor únicamente guarda aprobación para el texto enviado explícitamente en esa revisión.
- No hay envío automático de DM, correo, campaña ni compras.
- Limpieza operativa futura: borrar sesiones vencidas y revisar límites/auditoría bajo una política de retención. No se ejecuta limpieza destructiva en esta entrega.
- Esta versión tiene un acceso compartido de propietario. Antes de añadir más personas, integrar cuentas individuales y MFA; no compartir la clave de Kike.

## Integraciones pendientes

Houston es un producto con motor, gateway y servicios propios; no se instala completo dentro de una función de Vercel. Hay que elegir su host privado y conectar sus servicios autorizados. Los conectores de ChatGPT no se transfieren automáticamente a esta web.

Faltan el motor Houston, investigación/importación automática del radar, proveedores email/WhatsApp, conexiones Ads/GA4 y los flujos de Green Glass. Se muestran como pendientes. El radar externo de ChatGPT conserva su programación de las 08:00 en Santiago; este código no crea otro cron.

## Validación

`node --test tests/console066.test.mjs` prueba cierre seguro, claves, cookies, rechazo por origen, límites persistentes, sesión inválida, conflictos y logout. `npm run build` compila el sitio actual y conserva la landing de compra. La prueba real de Postgres/Vercel y las conexiones externas requieren habilitación de entorno; los tests de handler usan un adaptador SQL simulado.

Prueba de integración opcional (dependencias solo de pruebas):

```bash
npm install --no-save --ignore-scripts @electric-sql/pglite jsdom
node tests/console066-integration.mjs
```

Se ejecutó contra Postgres local PGlite: migración repetible, 31 candidatos y 17 tareas, login, lecturas/guardados, aprobación exacta, retiro de aprobación al editar, conflicto entre versiones, duplicados y auditoría atómica. La interfaz se verificó con DOM simulado (filtro por país, edición, guardado y estados de conexión). No se logró inspección visual con navegador en este entorno; falta comprobar presentación móvil y escritorio en la vista previa antes de producción.

Fuentes técnicas consultadas: https://vercel.com/docs/headers/request-headers y https://vercel.com/docs/routing/rewrites.
