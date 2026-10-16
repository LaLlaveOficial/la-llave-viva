// Observation age does not establish token validity or data-period coverage.
export function sourceEvidence(metrics, now = Date.now()) {
 const definitions = [
  ['googleAds', 'Google Ads directo', metrics.googleAds, 'Lectura observada; permisos de cambios se comprueban por separado.'],
  ['metaAds', 'Meta Ads directo', metrics.metaAds, 'Consulta de solo lectura desde esta integración.'],
  ['ga4', 'GA4 directo', metrics.ga4, 'Consulta de solo lectura desde esta integración.'],
  ...['instagram', 'tiktok'].map(network => [network, network === 'instagram' ? 'Instagram mediante Metricool' : 'TikTok mediante Metricool',
   metrics.snapshots?.find(s => s.network === network && s.collection === 'oauth'),
   'La lectura de métricas no acredita permisos de publicación o mensajes.'])
 ];
 return definitions.map(([id, name, observation, scope]) => {
  const value = observation?.checkedAt || observation?.importedAt;
  const timestamp = typeof value === 'string' ? Date.parse(value) : NaN;
  const valid = Number.isFinite(timestamp) && timestamp <= now;
  const ageHours = valid ? Math.floor((now - timestamp) / 3600000) : null;
  const recent = valid && now - timestamp <= 86400000;
  return {id, name, state: valid ? (recent ? 'recent' : 'historical') : 'unverified',
   label: valid ? (recent ? 'Lectura en las últimas 24 h' : 'Lectura histórica') : 'Sin lectura fechada verificable',
   observedAt: valid ? new Date(timestamp).toISOString() : null, ageHours, scope};
 });
}
