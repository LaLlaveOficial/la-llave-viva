import {videoPanel} from '/public/centro-066/video-066.js';
const escape=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const request=async(op,body)=>{const response=await fetch('/api/console-066?op='+op,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});const data=await response.json();if(!response.ok)throw new Error(data.error||'Error del servidor');return data;};
window.stopVideo=videoPanel(document.querySelector('#video-panel'),request,escape);
