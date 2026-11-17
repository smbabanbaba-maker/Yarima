import {json,currentUser} from '../lib/db.js';
export default async function handler(req,res){
 if(req.method!=='GET'){res.setHeader('Allow','GET');return json(res,405,{error:'Method not allowed'});}
 const user=await currentUser(req);if(!user)return json(res,401,{error:'Please sign in.'});
 const key=process.env.VTU_NG_SECRET_KEY||'';if(!/^vtu_sk_(live|test)_/.test(key))return json(res,503,{error:'VTU provider not configured.'});
 const base=key.startsWith('vtu_sk_test_')?'https://sandbox.vtu.ng/v1':'https://api.vtu.ng/v1';
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),8000);
 try{const response=await fetch(base+'/bills/catalog',{headers:{Authorization:'Bearer '+key,Accept:'application/json'},signal:controller.signal});
 if(!response.ok)return json(res,502,{error:'Unable to load provider services.'});
 const payload=await response.json();const rows=Array.isArray(payload?.data)?payload.data:[];
 res.setHeader('Cache-Control','private, max-age=120');
 return json(res,200,{services:rows.map(x=>({type:String(x.type||''),name:String(x.name||''),description:String(x.description||''),providers:(Array.isArray(x.providers)?x.providers:[]).map(p=>({slug:String(p.slug||''),name:String(p.name||'')}))}))});
 }catch{return json(res,503,{error:'Provider catalogue temporarily unavailable.'});}finally{clearTimeout(timer);}
}
