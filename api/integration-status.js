import {sql,ensureSchema,json,currentUser} from '../lib/db.js';

// Authenticated, read-only diagnostics. Never return secrets or provider response bodies.
export default async function handler(req,res){
 if(req.method!=='GET'){res.setHeader('Allow','GET');return json(res,405,{error:'Method not allowed'});}
 try{
  await ensureSchema();const user=await currentUser(req);if(!user)return json(res,401,{error:'Please sign in.'});
  const db=await sql`SELECT 1 AS ok`;
  const key=process.env.VTU_NG_SECRET_KEY||'';
  const report={database:db[0]?.ok===1?'connected':'unavailable',provider:{configured:!!key,environment:key.startsWith('vtu_sk_live_')?'live':key.startsWith('vtu_sk_test_')?'sandbox':'unknown',authenticated:false,permissions:'unverified'},purchasesEnabled:false};
  if(!/^vtu_sk_(live|test)_/.test(key))return json(res,200,report);
  const base=key.startsWith('vtu_sk_test_')?'https://sandbox.vtu.ng/v1':'https://api.vtu.ng/v1';
  const ctrl=new AbortController();const timeout=setTimeout(()=>ctrl.abort(),8000);
  try{
   const r=await fetch(base+'/bills/catalog',{headers:{Authorization:'Bearer '+key,Accept:'application/json'},signal:ctrl.signal});
   report.provider.httpStatus=r.status;
   report.provider.authenticated=r.ok;
   if(!r.ok){try{const body=await r.json();report.provider.errorCode=String(body?.error?.code||'unknown').slice(0,70)}catch{}}
  }catch(e){report.provider.errorCode=e?.name==='AbortError'?'timeout':'network_error'}finally{clearTimeout(timeout)}
  return json(res,200,report);
 }catch(e){console.error('Integration status error',e?.name||'Error');return json(res,503,{database:'unavailable',provider:{authenticated:false},purchasesEnabled:false})}
}
