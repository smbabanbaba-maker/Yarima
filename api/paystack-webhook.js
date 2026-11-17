import {createHmac,timingSafeEqual} from 'node:crypto';
import {sql,ensureSchema,json} from '../lib/db.js';
export const config={api:{bodyParser:false}};
async function rawBody(req){const parts=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>131072)throw Error('too_large');parts.push(chunk)}return Buffer.concat(parts)}
export default async function handler(req,res){
 if(req.method!=='POST'){res.setHeader('Allow','POST');return json(res,405,{error:'Method not allowed'});}
 const secret=process.env.PAYSTACK_SECRET_KEY;
 if(!secret)return json(res,503,{error:'Payment verification is not configured'});
 let raw;try{raw=await rawBody(req)}catch{return json(res,413,{error:'Payload too large'})}
 const signature=String(req.headers['x-paystack-signature']||'');
 const digest=createHmac('sha512',secret).update(raw).digest('hex');
 if(!/^[a-f0-9]{128}$/i.test(signature)||!timingSafeEqual(Buffer.from(signature,'hex'),Buffer.from(digest,'hex')))return json(res,401,{error:'Invalid signature'});
 let event;try{event=JSON.parse(raw.toString('utf8'))}catch{return json(res,400,{error:'Invalid JSON'})}
 if(event?.event!=='charge.success')return json(res,200,{ok:true,ignored:true});
 const ref=String(event?.data?.reference||'');
 if(!/^yrfund_[a-f0-9]{32}$/.test(ref))return json(res,200,{ok:true,ignored:true});
 // Verify directly against Paystack, not just the webhook payload.
 let verified;
 try{
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),9000);
  try{const response=await fetch('https://api.paystack.co/transaction/verify/'+encodeURIComponent(ref),{headers:{Authorization:'Bearer '+secret,Accept:'application/json'},signal:controller.signal});if(!response.ok)throw Error('verification_failed');const result=await response.json();verified=result?.data;}finally{clearTimeout(timer)}
 }catch(e){console.error('Paystack verification unavailable',e?.name||'Error');return json(res,503,{error:'Verification temporarily unavailable'})}
 if(verified?.status!=='success'||verified?.reference!==ref||verified?.currency!=='NGN'||!Number.isSafeInteger(verified?.amount)||verified.amount<=0)return json(res,200,{ok:true,ignored:true});
 try{
  await ensureSchema();
  await sql`CREATE TABLE IF NOT EXISTS yarima_app.funding_intents(reference TEXT PRIMARY KEY,user_id UUID NOT NULL REFERENCES yarima_app.users(id),amount_kobo BIGINT NOT NULL CHECK(amount_kobo>0),status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','successful')),created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
  // A single database statement claims the reference exactly once and credits the wallet.
  const result=await sql`
   WITH claimed AS (
    UPDATE yarima_app.funding_intents f SET status='successful',updated_at=now()
    WHERE f.reference=${ref} AND f.amount_kobo=${verified.amount} AND f.status='pending'
    AND EXISTS(SELECT 1 FROM yarima_app.wallets w WHERE w.user_id=f.user_id AND w.status='active')
    RETURNING f.reference,f.user_id,f.amount_kobo
   ), credited AS (
    UPDATE yarima_app.wallets w SET balance_kobo=w.balance_kobo+c.amount_kobo,updated_at=now()
    FROM claimed c WHERE w.user_id=c.user_id AND w.status='active'
    RETURNING w.id AS wallet_id,w.user_id,w.balance_kobo,c.amount_kobo,c.reference
   ), recorded AS (
    INSERT INTO yarima_app.transactions(user_id,wallet_id,reference,type,category,amount_kobo,balance_before_kobo,balance_after_kobo,status,description,provider,provider_reference)
    SELECT c.user_id,c.wallet_id,c.reference,'credit','wallet_funding',c.amount_kobo,c.balance_kobo-c.amount_kobo,c.balance_kobo,'successful','Paystack wallet funding','Paystack',c.reference FROM credited c
    ON CONFLICT(reference) DO NOTHING RETURNING id
   ) SELECT count(*)::int AS processed FROM recorded`;
  return json(res,200,{ok:true,processed:Number(result[0]?.processed||0)});
 }catch(e){console.error('Paystack wallet credit error',e?.name||'Error');return json(res,503,{error:'Unable to record payment'})}
}
