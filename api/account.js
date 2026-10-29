import {promisify} from 'node:util';
import {scrypt as scryptCb,randomBytes,timingSafeEqual} from 'node:crypto';
import {sql,ensureSchema,json,currentUser} from '../lib/db.js';
const scrypt=promisify(scryptCb);
async function verifyPassword(p,stored){const [salt,hash]=String(stored||'').split(':');if(!salt||!hash)return false;const key=Buffer.from(await scrypt(p,salt,64));const expected=Buffer.from(hash,'hex');return key.length===expected.length&&timingSafeEqual(key,expected);}
async function hashPassword(p){const salt=randomBytes(16).toString('hex');return salt+':'+Buffer.from(await scrypt(p,salt,64)).toString('hex');}
const defaults={transactions:true,security:true,promotions:false};
export default async function handler(req,res){try{await ensureSchema();const u=await currentUser(req);if(!u)return json(res,401,{error:'Ka sake shiga account ɗinka.'});
if(req.method==='GET'){const rows=await sql`SELECT notifications FROM yarima_app.account_preferences WHERE user_id=${u.id} LIMIT 1`;return json(res,200,{notifications:{...defaults,...(rows[0]?.notifications||{})}});}
if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return json(res,405,{error:'Method not allowed'});}
const b=req.body&&typeof req.body==='object'?req.body:{};
if(b.action==='change-password'){const current=String(b.currentPassword||''),next=String(b.newPassword||'');if(next.length<6||next.length>128)return json(res,400,{error:'Sabon password ya kasance tsakanin haruffa 6 zuwa 128.'});const rows=await sql`SELECT password_hash FROM yarima_app.users WHERE id=${u.id} LIMIT 1`;if(!rows[0]||!(await verifyPassword(current,rows[0].password_hash)))return json(res,401,{error:'Password na yanzu bai dace ba.'});await sql`UPDATE yarima_app.users SET password_hash=${await hashPassword(next)},updated_at=now() WHERE id=${u.id}`;await sql`DELETE FROM yarima_app.sessions WHERE user_id=${u.id} AND token_hash<>(SELECT token_hash FROM yarima_app.sessions WHERE user_id=${u.id} AND expires_at>now() ORDER BY created_at DESC LIMIT 1)`;await sql`INSERT INTO yarima_app.audit_logs(user_id,action) VALUES(${u.id},'account.password_changed')`;return json(res,200,{ok:true});}
if(b.action==='save-notifications'){const n=b.notifications||{};const prefs={transactions:n.transactions===true,security:n.security===true,promotions:n.promotions===true};await sql`INSERT INTO yarima_app.account_preferences(user_id,notifications,updated_at) VALUES(${u.id},${JSON.stringify(prefs)}::jsonb,now()) ON CONFLICT(user_id) DO UPDATE SET notifications=EXCLUDED.notifications,updated_at=now()`;return json(res,200,{ok:true,notifications:prefs});}
return json(res,400,{error:'Unknown account action.'});
}catch(e){console.error('account endpoint error',e?.message||e);return json(res,500,{error:'Account service is unavailable. Please try again.'});}}
