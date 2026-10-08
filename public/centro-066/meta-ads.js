export function metaAdsPanel(container,request,escape,format){
 container.innerHTML='<article class="card"><h2>Meta Ads · conexión directa</h2><label>Desde<input type="date" id="meta-since"></label><label>Hasta<input type="date" id="meta-until"></label><button id="meta-sync">Consultar campañas de La Llave</button><p id="meta-error" role="alert"></p><div id="meta-result">Consultando última lectura guardada…</div></article>';
 const result=container.querySelector('#meta-result'),error=container.querySelector('#meta-error');
 function render(r){
  if(!r?.rows){result.textContent='Todavía no hay una consulta directa guardada.';return;}
  container.querySelector('#meta-since').value=r.period.since;container.querySelector('#meta-until').value=r.period.until;
  result.innerHTML=`<p>${escape(r.period.since)} al ${escape(r.period.until)} · CLP · lectura del ${escape(new Date(r.checkedAt).toLocaleString('es-CL',{timeZone:'America/Santiago'}))}</p><p>${escape(r.scope)}</p><p class="note">${escape(r.note)}</p><div class="table-scroll"><table><thead><tr>${['Campaña','Estado efectivo','Gasto CLP','Impresiones','Clics','CTR %','Compras web','CPA CLP','ROAS'].map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${r.rows.map(x=>`<tr><td>${escape(x.name)}<small>${x.hasInsights?'':' · Sin informe en este periodo'}</small></td><td>${escape(x.effectiveStatus||x.status)}</td>${[x.spend,x.impressions,x.clicks,x.ctr,x.purchases,x.cpa,x.roas].map(v=>`<td>${escape(format(v))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
 }
 request('meta-ads').then(render).catch(e=>{error.textContent=e.message;result.textContent='';});
 container.querySelector('#meta-sync').onclick=async()=>{
  const b=container.querySelector('#meta-sync');b.disabled=true;error.textContent='';
  try{const since=container.querySelector('#meta-since').value,until=container.querySelector('#meta-until').value;render(await request('meta-ads-sync',{...(since?{since}:{}),...(until?{until}:{})}));}catch(e){error.textContent=e.message;}finally{b.disabled=false;}
 };
}
