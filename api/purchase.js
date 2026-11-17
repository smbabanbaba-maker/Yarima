import {randomUUID} from 'node:crypto';
import {sql,ensureSchema,json,currentUser} from '../lib/db.js';
const networks=new Set(['mtn','airtel','glo','t2mobile']);
export default async function handler(req,res){
 if(req.method!=='POST'){res.setHeader('Allow','POST');return json(res,405,{error:'Method not allowed'});}
 if(process.env.VTU_PURCHASES_ENABLED!=='true')return json(res,503,{error:'Purchases are temporarily unavailable. No wallet debit was made.'});
 const origin=String(req.headers.origin||'');
 try{if(!origin||new URL(origin).host!==req.headers.host||new URL(origin).protocol!=='https:')return json(res,403,{error:'Invalid origin'});}catch{return json(res,403,{error:'Invalid origin'});}
 const kind=String(req.body?.kind||'');const network=String(req.body?.network||'').toLowerCase();const phone=String(req.body?.phone||'');
 if(!['data','airtime'].includes(kind)||!networks.has(network)||!/^0[789][01]\d{8}$/.test(phone))return json(res,400,{error:'Invalid purchase details'});
 const code=String(req.body?.variationCode||'');
 if(kind==='data'&&(!code||code.length>100))return json(res,400,{error:'Select a valid bundle'});
 const amount=Number(req.body?.amount);
 if(kind==='airtime'&&(!Number.isSafeInteger(amount)||amount<100||amount>50000))return json(res,400,{error:'Invalid airtime amount'});
 const key=process.env.VTU_NG_SECRET_KEY||'';
 if(!/^vtu_sk_(live|test)_/.test(key))return json(res,503,{error:'Purchase service is not configured'});
 const base=key.startsWith('vtu_sk_test_')?'https://sandbox.vtu.ng/v1':'https://api.vtu.ng/v1';
 try{
  await ensureSchema();const user=await currentUser(req);if(!user)return json(res,401,{error:'Please sign in'});
  let priceKobo=amount*100;let name='Airtime';
  if(kind==='data'){
   const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),9000);let response;
   try{response=await fetch(base+'/bills/data-plans?network='+encodeURIComponent(network),{headers:{Authorization:'Bearer '+key,Accept:'application/json'},signal:controller.signal})}finally{clearTimeout(timer)}
   if(!response.ok)return json(res,503,{error:'Unable to verify bundle price. No debit was made'});
   const body=await response.json();const plans=Array.isArray(body?.data)?body.data:Array.isArray(body?.data?.plans)?body.data.plans:Array.isArray(body?.plans)?body.plans:[];
   const plan=plans.find(p=>p?.variation_code===code);
   if(!plan||!Number.isSafeInteger(Math.round(Number(plan.amount)*100))||Number(plan.amount)<=0)return json(res,409,{error:'Bundle unavailable. No debit was made'});
   priceKobo=Math.round(Number(plan.amount)*100);name=String(plan.name||code).slice(0,120);
  }
  if(!Number.isSafeInteger(priceKobo)||priceKobo<10000||priceKobo>10000000)return json(res,400,{error:'Invalid purchase amount'});
  const ref=randomUUID();
  const reserved=await sql`
   WITH debited AS (
    UPDATE yarima_app.wallets SET balance_kobo=balance_kobo-${priceKobo},updated_at=now()
    WHERE user_id=${user.id} AND status='active' AND balance_kobo>=${priceKobo}
    RETURNING id,user_id,balance_kobo
   ), logged AS (
    INSERT INTO yarima_app.transactions(user_id,wallet_id,reference,type,category,amount_kobo,balance_before_kobo,balance_after_kobo,status,description,provider)
    SELECT user_id,id,${ref},'debit',${kind},${priceKobo},balance_kobo+${priceKobo},balance_kobo,'pending',${name},'VTU.ng' FROM debited RETURNING id
   ), ordered AS (
    INSERT INTO yarima_app.orders(user_id,transaction_id,reference,service_type,network,recipient,product_code,product_name,amount_kobo,status,provider)
    SELECT ${user.id},id,${ref},${kind},${network},${phone},${kind==='data'?code:null},${name},${priceKobo},'pending','VTU.ng' FROM logged RETURNING id
   ) SELECT count(*)::int AS count FROM ordered`;
  if(Number(reserved[0]?.count)!==1)return json(res,409,{error:'Insufficient wallet balance or wallet unavailable. No debit was made'});
  const body=kind==='data'?{network,phone,variation_code:code}:{network,phone,amount};
  try{
   const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);let response;
   try{response=await fetch(base+'/bills/'+kind,{method:'POST',headers:{Authorization:'Bearer '+key,'Idempotency-Key':ref,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(body),signal:controller.signal})}finally{clearTimeout(timer)}
   if(response.status===201){
    const result=await response.json();const transaction=result?.transaction;
    const providerRef=String(transaction?.reference||'').slice(0,150);
    await sql`UPDATE yarima_app.orders SET status='processing',provider_reference=${providerRef},updated_at=now() WHERE reference=${ref} AND status='pending'`;
    return json(res,202,{reference:ref,status:'processing',message:'Purchase submitted. Check transaction status before trying again.'});
   }
   // A definitive validation/authentication failure did not submit a purchase.
   if([400,401,403,404,422].includes(response.status)){
    await sql`WITH claimed AS (
     UPDATE yarima_app.orders SET status='failed',updated_at=now() WHERE reference=${ref} AND status='pending' RETURNING user_id,amount_kobo
    ), restored AS (
     UPDATE yarima_app.wallets w SET balance_kobo=w.balance_kobo+c.amount_kobo,updated_at=now() FROM claimed c WHERE w.user_id=c.user_id RETURNING w.id,w.user_id,w.balance_kobo,c.amount_kobo
    ) INSERT INTO yarima_app.transactions(user_id,wallet_id,reference,type,category,amount_kobo,balance_before_kobo,balance_after_kobo,status,description,provider)
    SELECT user_id,id,${ref+'-refund'},'reversal',${kind},amount_kobo,balance_kobo-amount_kobo,balance_kobo,'successful','Purchase rejected - wallet restored','VTU.ng' FROM restored ON CONFLICT(reference) DO NOTHING`;
    return json(res,502,{reference:ref,status:'failed',message:'Purchase rejected. Wallet debit reversed.'});
   }
  }catch(e){console.error('Purchase submission uncertain',e?.name||'Error');}
  return json(res,202,{reference:ref,status:'pending',message:'Purchase outcome is being checked. Do not retry or pay again.'});
 }catch(e){console.error('Purchase processing error',e?.name||'Error');return json(res,503,{error:'Unable to complete purchase request. Check wallet history before retrying.'})}
}
