import {sql,ensureSchema,json,currentUser} from '../lib/db.js';
export default async function handler(req,res){
 if(req.method!=='GET'){res.setHeader('Allow','GET');return json(res,405,{error:'Method not allowed'});}
 try{
  await ensureSchema();const user=await currentUser(req);
  if(!user)return json(res,401,{error:'Please sign in'});
  const ref=String(req.query?.reference||'');
  if(!/^yrfund_[a-f0-9]{32}$/.test(ref))return json(res,400,{error:'Invalid payment reference'});
  const rows=await sql`SELECT reference,amount_kobo,status,created_at FROM yarima_app.funding_intents WHERE reference=${ref} AND user_id=${user.id} LIMIT 1`;
  if(!rows.length)return json(res,404,{error:'Payment reference not found'});
  return json(res,200,{reference:ref,amountKobo:String(rows[0].amount_kobo),status:rows[0].status,createdAt:rows[0].created_at,message:rows[0].status==='successful'?'Wallet has been credited.':'Payment has not yet been verified. Do not pay again until status is confirmed.'});
 }catch(e){console.error('Paystack status',e?.name||'Error');return json(res,503,{error:'Payment status unavailable'})}
}
