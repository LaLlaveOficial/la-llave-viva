import {createHash} from 'node:crypto';
export async function linkConversation(sql,channel,threadId,{title,question}){
 if(!['email','instagram'].includes(channel)||typeof threadId!=='string'||!threadId)throw Error('Conversación inválida.');
 const id='conversation-'+createHash('sha256').update(channel+':'+threadId).digest('hex');
 const data=JSON.stringify({title:String(title).slice(0,160),channel,question:String(question).slice(0,1500),nextStep:'Revisar conversación y responder desde su bandeja.',country:'',format:'',productId:'',orderRef:'',followupAt:''});
 const rows=await sql`WITH record AS (
  INSERT INTO console066_marketing_records(id,kind,data,status,version) VALUES(${id},'case',${data}::jsonb,'new',1)
  ON CONFLICT(id) DO NOTHING RETURNING id
 ) INSERT INTO console066_conversation_cases(channel,thread_id,case_id) VALUES(${channel},${threadId},${id})
 ON CONFLICT(channel,thread_id) DO UPDATE SET thread_id=EXCLUDED.thread_id RETURNING case_id`;
 return rows[0]?.case_id||id;
}
