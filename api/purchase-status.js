import {sql,ensureSchema,json,currentUser} from '../lib/db.js';
export default async function handler(req,res){try{
if(req.method!=='GET'){res.setHeader('Allow','GET');return json(res,405,{error:'Method not allowed'});}
await ensureSchema();const u=await currentUser(req);if(!u)return json(res,401,{error:'Please sign in.'});
const ref=String(req.query?.reference||'');if(!/^[a-f0-9-]{36}$/i.test(ref))return json(res,400,{error:'Invalid reference.'});
const rows=await sql`SELECT status,reference,service_type,network,recipient,updated_at FROM yarima_app.orders WHERE user_id=${u.id} AND reference=${ref} LIMIT 1`;
if(!rows[0])return json(res,404,{error:'Transaction not found.'});
const order=rows[0];res.setHeader('Cache-Control','no-store');return json(res,200,{reference:order.reference,status:order.status,updatedAt:order.updated_at});
}catch(e){console.error('Purchase status error',e?.message||e);return json(res,503,{error:'Status temporarily unavailable.'});}}
