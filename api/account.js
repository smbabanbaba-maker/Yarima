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
if(b.action==='update-profile'){
const fullName=String(b.fullName||'').trim().replace(/\\s+/g,' '),email=String(b.email||'').trim().toLowerCase(),phone=String(b.phone||'').replace(/[^0-9]/g,''),current=String(b.currentPassword||'');
if(fullName.length<2||fullName.length>100)return json(res,400,{error:'Sunan cikakken suna ya kasance tsakanin haruffa 2 zuwa 100.'});
if(!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)||email.length>254)return json(res,400,{error:'Shigar da ingantaccen email address.'});
if(phone&& !/^0\\d{10}$/.test(phone))return json(res,400,{error:'Lambar waya ta kasance lambobi 11, tana farawa da 0, ko a bar ta babu komai.'});
const existing=await sql`SELECT password_hash FROM yarima_app.users WHERE id=${u.id} LIMIT 1`;
if(!existing[0]||!(await verifyPassword(current,existing[0].password_hash)))return json(res,401,{error:'Password na yanzu bai dace ba.'});
try{
const rows=await sql`UPDATE yarima_app.users SET full_name=${fullName},email=${email},phone=${phone||null},updated_at=now() WHERE id=${u.id} RETURNING id,full_name,email,phone,created_at`;
const updated=rows[0];
await sql`INSERT INTO yarima_app.audit_logs(user_id,action) VALUES(${u.id},'account.profile_updated')`;
return json(res,200,{ok:true,user:{id:updated.id,fullName:updated.full_name,email:updated.email,phone:updated.phone,createdAt:updated.created_at}});
}catch(e){if(e.code==='23505')return json(res,409,{error:'Wannan email ko lambar waya tana da wani account.'});throw e;}
}
if(b.action==='change-password'){const current=String(b.currentPassword||''),next=String(b.newPassword||'');if(next.length<6||next.length>128)return json(res,400,{error:'Sabon password ya kasance tsakanin haruffa 6 zuwa 128.'});const rows=await sql`SELECT password_hash FROM yarima_app.users WHERE id=${u.id} LIMIT 1`;if(!rows[0]||!(await verifyPassword(current,rows[0].password_hash)))return json(res,401,{error:'Password na yanzu bai dace ba.'});await sql`UPDATE yarima_app.users SET password_hash=${await hashPassword(next)},updated_at=now() WHERE id=${u.id}`;await sql`INSERT INTO yarima_app.audit_logs(user_id,action) VALUES(${u.id},'account.password_changed')`;return json(res,200,{ok:true});}
if(b.action==='save-notifications'){const n=b.notifications||{};const prefs={transactions:n.transactions===true,security:n.security===true,promotions:n.promotions===true};await sql`INSERT INTO yarima_app.account_preferences(user_id,notifications,updated_at) VALUES(${u.id},${JSON.stringify(prefs)}::jsonb,now()) ON CONFLICT(user_id) DO UPDATE SET notifications=EXCLUDED.notifications,updated_at=now()`;return json(res,200,{ok:true,notifications:prefs});}
return json(res,400,{error:'Unknown account action.'});
}catch(e){console.error('account endpoint error',e?.message||e);return json(res,500,{error:'Account service is unavailable. Please try again.'});}}
