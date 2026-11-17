import {ensureSchema,json,currentUser} from '../lib/db.js';

// Read-only proxy. Financial purchases must use a separate, audited flow.
export default async function handler(req,res){
  if(req.method!=='GET'){res.setHeader('Allow','GET');return json(res,405,{error:'Method not allowed'});}
  try{
    await ensureSchema();
    const user=await currentUser(req);
    if(!user)return json(res,401,{error:'Please sign in.'});
    const key=process.env.VTU_NG_SECRET_KEY;
    if(!key||!key.startsWith('vtu_sk_live_'))return json(res,503,{error:'VTU live key is missing or invalidly configured.'});
    const type=typeof req.query?.type==='string'?req.query.type:'';
    if(type&&!['airtime','data','electricity','cable','education','epin','bet'].includes(type))return json(res,400,{error:'Unsupported catalog filter.'});
    const url='https://api.vtu.ng/v1/bills/catalog'+(type?'?type='+encodeURIComponent(type):'');
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),8000);
    let response;
    try{response=await fetch(url,{headers:{Authorization:'Bearer '+key,Accept:'application/json'},signal:controller.signal});}
    finally{clearTimeout(timeout);}
    if(!response.ok){
      let code='provider_error';
      try{const body=await response.json();code=String(body?.error?.code||code).slice(0,80);}catch{}
      return json(res,502,{error:'Unable to load VTU catalog.',providerStatus:response.status,providerCode:code});
    }
    return json(res,200,{provider:'VTU.ng',mode:'read-only',catalog:await response.json()});
  }catch(e){
    console.error('VTU catalog request failed',e?.name||'Error');
    return json(res,503,{error:'VTU catalog is temporarily unavailable.'});
  }
}
