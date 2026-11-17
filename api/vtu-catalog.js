import {ensureSchema,json,currentUser} from '../lib/db.js';

const BASE='https://api.vtu.ng/v1';
export default async function handler(req,res){
  if(req.method!=='GET'){res.setHeader('Allow','GET');return json(res,405,{error:'Method not allowed'});}
  try{
    await ensureSchema();
    const user=await currentUser(req);
    if(!user)return json(res,401,{error:'Sign in to view available VTU services.'});
    const key=process.env.VTU_NG_SECRET_KEY;
    if(!key)return json(res,503,{error:'VTU provider is not configured.'});
    if(!key.startsWith('vtu_sk_live_'))return json(res,503,{error:'Invalid VTU live key configuration.'});
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),9000);
    let response;
    try{response=await fetch(BASE+'/bills/catalog',{headers:{Authorization:'Bearer '+key,Accept:'application/json'},signal:controller.signal});}
    finally{clearTimeout(timeout);}
    if(!response.ok){
      console.error('VTU catalog request failed',response.status);
      return json(res,502,{error:'VTU provider is temporarily unavailable.',providerStatus:response.status});
    }
    const data=await response.json();
    return json(res,200,{provider:'VTU.ng',mode:'read-only',catalog:data});
  }catch(e){
    console.error('VTU catalog endpoint error',e?.name||'Error');
    return json(res,503,{error:'Could not load VTU services. Please try again.'});
  }
}
