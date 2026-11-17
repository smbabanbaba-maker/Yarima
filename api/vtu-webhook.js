import {createHmac,timingSafeEqual} from 'node:crypto';
import {sql,ensureSchema,json} from '../lib/db.js';
export const config={api:{bodyParser:false}};
async function readRaw(req){const chunks=[];let n=0;for await(const c of req){n+=c.length;if(n>128*1024)throw Error('payload_too_large');chunks.push(c)}return Buffer.concat(chunks)}
export default async function handler(req,res){
 if(req.method!=='POST'){res.setHeader('Allow','POST');return json(res,405,{error:'Method not allowed'})}
 const secret=process.env.VTU_WEBHOOK_SECRET;
 if(!secret)return json(res,503,{error:'Webhook not configured'});
 let raw;try{raw=await readRaw(req)}catch{return json(res,413,{error:'Invalid payload'})}
 const expected=Buffer.from('sha256='+createHmac('sha256',secret).update(raw).digest('hex'));
 const signature=Buffer.from(String(req.headers['x-vtu-signature-256']||''));
 if(expected.length!==signature.length||!timingSafeEqual(expected,signature))return json(res,401,{error:'Invalid signature'});
 const ts=Number(req.headers['x-vtu-timestamp']);if(!Number.isFinite(ts)||Math.abs(Date.now()/1000-ts)>300)return json(res,401,{error:'Expired delivery'});
 let payload;try{payload=JSON.parse(raw.toString('utf8'))}catch{return json(res,400,{error:'Invalid JSON'})}
 const event=String(payload.event||'');const d=payload.data||{};
 if(event==='ping')return json(res,200,{ok:true});
 if(!['transaction.completed','transaction.failed','transaction.refunded','transaction.cancelled'].includes(event))return json(res,200,{ok:true,ignored:true});
 const key=String(d.idempotency_key||'');
 if(!/^[a-f0-9-]{36}$/i.test(key))return json(res,200,{ok:true,ignored:true});
 try{
  await ensureSchema();
  // Correlate by our immutable order reference. Never create a credit or debit from a webhook.
  const status=event==='transaction.completed'?'successful':event==='transaction.refunded'?'refunded':event==='transaction.cancelled'?'failed':'failed';
  await sql`UPDATE yarima_app.orders SET status=CASE WHEN status IN ('successful','refunded') THEN status ELSE ${status} END,provider_reference=COALESCE(provider_reference,${String(d.reference||'').slice(0,150)}),updated_at=now() WHERE reference=${key} AND provider='VTU.ng' AND status IN ('pending','processing','successful','refunded')`;
  return json(res,200,{ok:true});
 }catch(e){console.error('VTU webhook error',e?.name||'Error');return json(res,503,{error:'Unable to process event'})}
}
