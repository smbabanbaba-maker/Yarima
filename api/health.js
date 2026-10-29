import {sql,ensureSchema,json} from '../lib/db.js';
export default async function handler(req,res){
 if(req.method!=='GET'){res.setHeader('Allow','GET');return json(res,405,{status:'method_not_allowed'});}
 try{await ensureSchema();const rows=await sql`SELECT table_name FROM information_schema.tables WHERE table_schema='yarima_app' ORDER BY table_name`;return json(res,200,{status:'ok',database:'connected',schema:'yarima_app',tables:rows.map(r=>r.table_name)});}
 catch(e){console.error('health check failed',e?.message||e);return json(res,503,{status:'unavailable',database:'not_ready'});}
}