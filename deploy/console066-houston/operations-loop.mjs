// Uses the existing private bridge credential. Never starts model turns.
export function startOperationsLoop({env=process.env,fetcher=fetch,schedule=setTimeout,cancel=clearTimeout,log=console.info,initialDelay=30000,interval=3600000}={}){
 let stopped=false,timer,active;
 const later=delay=>{timer=schedule(run,delay);timer?.unref?.();};
 async function run(){
  if(stopped)return;
  active=new AbortController();
  try{
   if(!env.HOUSTON_HOST_TOKEN||env.HOUSTON_HOST_TOKEN.length<32)throw Error('Missing private credential');
   const r=await fetcher('https://www.lallaveoficial.com/api/agent-066?agent=analitica&op=maintenance',{method:'POST',headers:{Authorization:'Bearer '+env.HOUSTON_HOST_TOKEN,'Content-Type':'application/json'},body:'{}',redirect:'error',signal:AbortSignal.any([active.signal,AbortSignal.timeout(110000)])});
   if(!r.ok)throw Error('Maintenance unavailable');
   const result=await r.json();
   log(JSON.stringify({event:'operations066',status:['complete','partial','already_reserved'].includes(result.status)?result.status:'unknown'}));
  }catch{if(!stopped)log(JSON.stringify({event:'operations066',status:'unavailable'}));}
  finally{active=null;if(!stopped)later(interval);}
 }
 later(initialDelay);
 return ()=>{stopped=true;cancel(timer);active?.abort();};
}
