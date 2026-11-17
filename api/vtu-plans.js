import {ensureSchema,json,currentUser} from '../lib/db.js';
const allowed=new Set(['mtn','airtel','glo','t2mobile','smile']);
export default async function handler(req,res){
 if(req.method!=='GET'){res.setHeader('Allow','GET');return json(res,405,{error:'Method not allowed'});}
 try{
  await ensureSchema();if(!await currentUser(req))return json(res,401,{error:'Please sign in.'});
  const network=String(req.query?.network||'').toLowerCase();
  if(!allowed.has(network))return json(res,400,{error:'Invalid network.'});
  const key=process.env.VTU_NG_SECRET_KEY;
  if(!key||!/^vtu_sk_(live|test)_/.test(key))return json(res,503,{error:'VTU API key is not configured.'});
  const base=key.startsWith('vtu_sk_test_')?'https://sandbox.vtu.ng/v1':'https://api.vtu.ng/v1';
  const ctrl=new AbortController();const timeout=setTimeout(()=>ctrl.abort(),9000);
  let response;try{response=await fetch(base+'/bills/data-plans?network='+encodeURIComponent(network),{headers:{Authorization:'Bearer '+key,Accept:'application/json'},signal:ctrl.signal});}finally{clearTimeout(timeout)}
  if(!response.ok){let code='provider_unavailable';try{const e=await response.json();code=String(e?.error?.code||code).slice(0,70)}catch{};return json(res,502,{error:'VTU.ng could not provide data plans.',providerStatus:response.status,providerCode:code})}
  const body=await response.json();const list=Array.isArray(body?.data)?body.data:Array.isArray(body?.data?.plans)?body.data.plans:Array.isArray(body?.plans)?body.plans:[];
  const plans=list.filter(p=>p&&typeof p.variation_code==='string'&&Number.isFinite(Number(p.amount))&&Number(p.amount)>0).map(p=>({variation_code:p.variation_code,name:String(p.name||p.variation_code),amount:Number(p.amount),fixed_price:!!p.fixed_price}));
  return json(res,200,{network,provider:'VTU.ng',mode:'read-only',plans});
 }catch(e){console.error('VTU data plans error',e?.name||'Error');return json(res,503,{error:'Unable to load live plans right now.'})}
}
