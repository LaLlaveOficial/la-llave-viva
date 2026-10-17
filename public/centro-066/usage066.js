const date=v=>v?new Date(v).toLocaleString('es-CL',{timeZone:'America/Santiago'}):'no informado';
export function usageDialog(result){
 const d=document.createElement('dialog');d.setAttribute('aria-label','Cupo de IA y supervisión');
 const h=document.createElement('h2');h.textContent='Cupo de IA y supervisión';d.append(h);
 for(const p of result.providers||[]){
  const title=document.createElement('h3');title.textContent=`ChatGPT/Codex · ${p.status} · ${p.plan||'plan sin informar'}`;d.append(title);
  for(const w of p.windows||[]){const line=document.createElement('p');line.textContent=`${w.id==='week'?'Semana':'Sesión'}: ${w.usedPercent==null?'uso sin confirmar':w.usedPercent+'% usado'} · Reinicio: ${date(w.resetsAt)}`;d.append(line);}
 }
 const note=document.createElement('p');note.textContent=result.note||'El proveedor no confirmó ventanas de uso.';d.append(note);
 const ops=result.operations||{status:'unavailable'},line=document.createElement('p');
 const labels={complete:'Completada',partial:'Parcial: revisa las fuentes',running:'En curso; si supera diez minutos, la ejecución puede haberse interrumpido',not_started:'Sin ejecución registrada',unavailable:'Sin lectura disponible'};
 line.textContent=`Supervisión sin IA: ${labels[ops.status]||ops.status}. Último inicio: ${date(ops.started_at)}. Último cierre: ${date(ops.finished_at)}.`;d.append(line);
 for(const source of ops.detail?.metrics?.sources||[]){const row=document.createElement('p');row.textContent=`${source.source}: ${source.status==='updated'?'actualizada':'no disponible'}`;d.append(row);}
 const close=document.createElement('button');close.textContent='Cerrar';close.onclick=()=>d.close();d.append(close);d.onclose=()=>d.remove();document.body.append(d);d.showModal();
}
