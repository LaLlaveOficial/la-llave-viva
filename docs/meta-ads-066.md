# Meta Ads directo, solo lectura

App: La Llave Operaciones 066 (1969258493746034), portfolio La Llave Saga Oficial (27822578767331413). Permiso aprobado: ads_read; no ads_management. Cuenta verificada con campañas de La Llave: act_372446716166842, CLP, America/Santiago. La cuenta también contiene campañas ajenas: nunca sumar toda la cuenta como ventas/gasto de La Llave.

Variables privadas en Production:

- META_ADS_ACCESS_TOKEN: Secret, sin prefijos públicos ni repositorio.
- META_ADS_ACCOUNT_ID: act_372446716166842.
- META_ADS_CAMPAIGN_IDS: lista explícita de los IDs de campañas de La Llave; nuevas campañas requieren incorporación verificada.

La consola autentica sesiones y comprueba origen antes de POST meta-ads-sync. GET meta-ads muestra la última observación guardada. El servidor llama a Marketing API v25.0 con Bearer en cabecera, solo GET. La paginación usa cursores sobre el origen fijo, nunca la URL next que puede incluir un token. No se guardan tokens en auditoría ni se devuelven al cliente. Se confirma CLP y cuenta; otras campañas quedan fuera.

Métricas: gasto, impresiones, clics, alcance, CPC, CPM, CTR y compras web del píxel. No sumar compras omni/pixel superpuestas. Ausencia de informe/acción es null. CPA/ROAS se calculan únicamente con denominadores válidos; no equivalen a pagos del sitio ni ventas reales. El estado ACTIVE de campaña no demuestra entrega: mostrar effective_status y periodo.

La lectura verificada del 1–8 octubre 2026 devuelve para 52615160195464 gasto 6134 CLP, 1607 impresiones, 106 clics. No representa resultados finales ni disponibilidad perpetua del token. El token de usuario debe renovarse antes de su vencimiento y puede ser revocado antes. No registrar su valor.

La integración está preparada; su publicación y conexión del secreto en Production requieren resolver el acceso al equipo Vercel la-llave-oficial-s-projects. El plugin devuelve 403; CLI sin credenciales. No afirmar despliegue/guardado remoto completado hasta verificarlo.
