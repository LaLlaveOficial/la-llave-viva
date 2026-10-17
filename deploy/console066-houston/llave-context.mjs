// No credentials in this client. The loopback gateway owns server authentication.
const [command,agent,...rest]=process.argv.slice(2);
const allowed=['radar-lectores','contactos','prensa','contenidos','analitica','crecimiento','facebook-comunidad'];
if(!allowed.includes(agent)||!['context','search','save','facebook-candidate','facebook-draft'].includes(command))throw Error('Usa context/search/save y un agente válido.');
const url=new URL('http://127.0.0.1:'+Number(process.env.PORT||8080)+'/agent-data');url.searchParams.set('agent',agent);url.searchParams.set('op',command);
if(command.startsWith('facebook-')&&agent!=='facebook-comunidad')throw Error('Operación reservada al agente de Facebook.');
let body;if(command==='search')url.searchParams.set('q',rest.join(' '));
if(['save','facebook-candidate','facebook-draft'].includes(command)){let text='';for await(const chunk of process.stdin){text+=chunk;if(text.length>14000)throw Error('Propuesta demasiado grande.');}body=JSON.stringify({...JSON.parse(text),agent});}
const r=await fetch(url,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body,signal:AbortSignal.timeout(115000),redirect:'error'});
const value=await r.json();console.log(JSON.stringify(value));if(!r.ok)process.exitCode=1;
