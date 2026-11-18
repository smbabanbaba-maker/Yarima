import {sql,ensureSchema,json,currentUser} from '../lib/db.js';
export default async function handler(req,res){
 if(req.method!=='GET'){res.setHeader('Allow','GET');return json(res,405,{error:'Method not allowed'});}
 try{
  await ensureSchema();
  const user=await currentUser(req);
  if(!user)return json(res,401,{error:'Please sign in to check this payment.'});
  const ref=String(req.query?.reference||'');
  if(!/^yrfund_[a-f0-9]{32}$/.test(ref))return json(res,400,{error:'Invalid payment reference'});
  const rows=await sql`SELECT reference,amount_kobo,status,created_at FROM yarima_app.funding_intents WHERE reference=${ref} AND user_id=${user.id} LIMIT 1`;
  if(!rows.length)return json(res,404,{error:'Payment reference not found for this account.'});
  let status=rows[0].status;
  // Reconcile a pending payment on the customer's return. The signed webhook remains an independent fallback.
  if(status==='pending'&&/^sk_(test|live)_/.test(process.env.PAYSTACK_SECRET_KEY||'')){
   try{
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),9000);
    let verified;
    try{
     const response=await fetch('https://api.paystack.co/transaction/verify/'+encodeURIComponent(ref),{headers:{Authorization:'Bearer '+process.env.PAYSTACK_SECRET_KEY,Accept:'application/json'},signal:controller.signal});
     if(!response.ok)throw Error('verification_unavailable');
     const body=await response.json();verified=body?.data;
    }finally{clearTimeout(timer)}
    if(verified?.status==='success'&&verified?.reference===ref&&verified?.currency==='NGN'&&Number.isSafeInteger(verified?.amount)&&verified.amount===Number(rows[0].amount_kobo)){
     // One atomic SQL statement claims the pending intent and credits once, even if the webhook races.
     await sql`
      WITH claimed AS (
       UPDATE yarima_app.funding_intents f SET status='successful',updated_at=now()
       WHERE f.reference=${ref} AND f.user_id=${user.id} AND f.amount_kobo=${verified.amount} AND f.status='pending'
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
    }
   }catch(e){console.error('Paystack return reconciliation deferred',e?.name||'Error')}
   const fresh=await sql`SELECT status FROM yarima_app.funding_intents WHERE reference=${ref} AND user_id=${user.id} LIMIT 1`;
   status=fresh[0]?.status||'pending';
  }
  return json(res,200,{reference:ref,amountKobo:String(rows[0].amount_kobo),status,createdAt:rows[0].created_at,message:status==='successful'?'Payment verified. Your wallet has been credited.':'Payment is awaiting verification. Do not pay again; contact support with your reference if it remains pending.'});
 }catch(e){console.error('Paystack status',e?.name||'Error');return json(res,503,{error:'Payment status unavailable. Please do not pay again until confirmed.'})}
}
