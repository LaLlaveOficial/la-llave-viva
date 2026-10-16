// Initial context only: facts already supplied by the owner and purchase links
// and base price verified in the current repository. No stock or foreign price is inferred.
import {payloadHash,validateRecord} from './marketing-workspace.js';
export function initialMarketingRecords(){
 const common={title:'La Llave I: Ciudad Central'};
 const items=[
  {id:'brand',kind:'brand',data:{...common,author:'Enrique G. Santibañez',synopsis:'Primer libro de la saga La Llave. Thriller distópico de misterio y suspenso ambientado en Ciudad Central, un universo propio.',tone:'Español natural, profesional y cercano. Mantener continuidad de las conversaciones, sin saludos repetidos.',rules:'Ciudad Central no es Santiago. Usar la portada real y activos aprobados. Santibañez no lleva tilde en la a. No inventar escenas ni revelar spoilers. Conservar voces originales y sincronía. Una muestra de video por solicitud; mejorar el prompt antes de gastar otra generación. Correo de la obra: contacto@lallaveoficial.com. No prometer ventas ni viralidad.'}},
  {id:'physical-chile',kind:'product',data:{...common,country:'Chile',format:'físico',url:'https://www.lallaveoficial.com/comprar',price:15990,currency:'CLP',stock:null,shipping:'El despacho se calcula en el checkout. Confirma disponibilidad antes de comprometer una entrega.'}},
  {id:'amazon-kindle',kind:'product',data:{...common,country:'Internacional · según disponibilidad de Amazon',format:'Kindle',url:'https://www.amazon.com/dp/B0GX31SRTT',price:null,currency:'',stock:null,shipping:'Consulta precio y disponibilidad de tu país en Amazon.'}},
  {id:'amazon-physical',kind:'product',data:{...common,country:'Internacional · según disponibilidad de Amazon',format:'físico en Amazon',url:'https://www.amazon.com/dp/9564237246',price:null,currency:'',stock:null,shipping:'Amazon informa el precio, costo de envío y disponibilidad para tu dirección.'}}
 ];
 return items.map(item=>{const record=validateRecord({...item,version:0,status:'draft'});if(!record)throw Error('Contexto inicial inválido.');return {...record,status:'approved',version:1,approved_hash:payloadHash(record.data)};});
}
