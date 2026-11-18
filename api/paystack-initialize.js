import {randomBytes} from 'node:crypto';
import {sql,ensureSchema,json,currentUser} from '../lib/db.js';
export default async function handler(req,res){
 if(req.method!=='POST'){res.setHeader('Allow','POST');return json(res,405,{error:'Method not allowed'});}
 if(process.env.PAYSTACK_FUNDING_ENABLED!=='true')return json(res,503,{error:'Wallet funding is not enabled yet. No charge was made.'});
 const secret=process.env.PAYSTACK_SECRET_KEY||'';
 if(!/^sk_(test|live)_/.test(secret))return json(res,503,{error:'Paystack is not configured.'});
 const origin=String(req.headers.origin||'');const host=String(req.headers.host||'');
 if(!origin||new URL(origin).host!==host||new URL(origin).protocol!=='https:')return json(res,403,{error:'Invalid origin'});
 try{
  await ensureSchema();const user=await currentUser(req);if(!user)return json(res,401,{error:'Please sign in.'});
  const amount=Number(req.body?.amountKobo);
  if(!Number.isSafeInteger(amount)||amount<10000||amount>10000000)return json(res,400,{error:'Amount must be between ₦100 and ₦100,000.'});
  const w=await sql`SELECT id FROM yarima_app.wallets WHERE user_id=${user.id} AND status='active' LIMIT 1`;if(!w.length)return json(res,403,{error:'Wallet unavailable'});
  await sql`CREATE TABLE IF NOT EXISTS yarima_app.funding_intents(reference TEXT PRIMARY KEY,user_id UUID NOT NULL REFERENCES yarima_app.users(id),amount_kobo BIGINT NOT NULL CHECK(amount_kobo>0),status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','successful')),created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
  const reference='yrfund_'+randomBytes(16).toString('hex');
  await sql`INSERT INTO yarima_app.funding_intents(reference,user_id,amount_kobo) VALUES(${reference},${user.id},${amount})`;
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),9000);let response;
  try{response=await fetch('https://api.paystack.co/transaction/initialize',{method:'POST',headers:{Authorization:'Bearer '+secret,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({email:user.email,amount,currency:'NGN',reference,callback_url:'https://www.alyarimasub.com.ng/?reference='+encodeURIComponent(reference),metadata:{source:'el_yarima_wallet'}}),signal:controller.signal})}finally{clearTimeout(timer)}
  if(!response.ok)return json(res,502,{error:'Paystack could not initialize checkout. No charge was made.'});
  const body=await response.json();
  const url=body?.data?.authorization_url;
  if(body?.status!==true||typeof url!=='string'||!url.startsWith('https://checkout.paystack.com/'))return json(res,502,{error:'Invalid checkout response. No charge was made.'});
  return json(res,200,{authorizationUrl:url,reference,amountKobo:amount});
 }catch(e){console.error('Paystack funding initialization',e?.name||'Error');return json(res,503,{error:'Wallet funding is temporarily unavailable. No charge was made.'})}
}
