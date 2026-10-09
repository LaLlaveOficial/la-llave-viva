export const SOCIAL_POST_FIELDS={
 instagram:['IGRE02','IGRE03','IGRE06','IGRE07','IGRE11','IGRE12','IGRE21','IGRE23','IGRE24'],
 tiktok:['TKPO02','TKPO03','TKPO05','TKPO07','TKPO08','TKPO09','TKPO10','TKPO15']
};
const number=v=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))&&Number(v)>=0?Number(v):null;
export function socialPostReport(network,rows,period){
 if(!SOCIAL_POST_FIELDS[network]||!Array.isArray(rows)||rows.length>1000)throw new Error('Informe social inválido.');
 const posts=rows.map(r=>{
  if(!Array.isArray(r)||r.length!==SOCIAL_POST_FIELDS[network].length)throw new Error('Columnas sociales no reconocidas.');
  const ig=network==='instagram',date=String(r[0]);
  if(!/^\d{14}$/.test(date))throw new Error('Fecha social no reconocida.');
  const url=new URL(r[ig?2:1]);
  if(url.protocol!=='https:'||!(ig?['instagram.com','www.instagram.com']:['tiktok.com','www.tiktok.com']).includes(url.hostname))throw new Error('Enlace social no reconocido.');
  const result={date,url:url.href,text:String(r[ig?1:2]||'').slice(0,1000),views:number(r[ig?7:3]),comments:number(r[ig?3:5]),shares:number(r[ig?6:6]),averageWatchSeconds:number(r[ig?8:7])};
  if(ig){result.reach=number(r[4]);result.saved=number(r[5]);}else result.likes=number(r[4]);
  return result;
 }).sort((a,b)=>b.date.localeCompare(a.date));
 return {network,brandId:'6252950',source:'Metricool',...period,posts,scope:network==='instagram'?'Reels; métricas orgánicas cuando el proveedor las distingue.':'Vídeos; el origen puede incluir difusión pagada. No equivale a alcance orgánico.',note:'Fechas de publicación tal como las entrega Metricool; no se reinterpretan como hora de Chile. Datos ausentes se conservan como null.'};
}
