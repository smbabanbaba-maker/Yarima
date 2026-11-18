import {promisify} from 'node:util';
import {scrypt as scryptCb,randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {sql,ensureSchema,json,currentUser,cookies} from '../lib/db.js';
const scrypt=promisify(scryptCb);
const publicUser=u=>({id:u.id,fullName:u.full_name,email:u.email,username:u.username,phone:u.phone,createdAt:u.created_at});
function setCookie(res,token,maxAge){res.setHeader('Set-Cookie',`yr_session=${token||''}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`);}
async function hashPassword(p){const salt=randomBytes(16).toString('hex');const key=await scrypt(p,salt,64);return salt+':'+Buffer.from(key).toString('hex');}
async function verifyPassword(p,stored){const [salt,hash]=String(stored).split(':');if(!salt||!hash)return false;const key=Buffer.from(await scrypt(p,salt,64));const expected=Buffer.from(hash,'hex');return key.length===expected.length&&timingSafeEqual(key,expected);}
export default async function handler(req,res){try{await ensureSchema();
if(req.method==='GET'){const u=await currentUser(req);return json(res,200,{user:u?publicUser(u):null});}
if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return json(res,405,{error:'Method not allowed'});}
const b=req.body&&typeof req.body==='object'?req.body:{};const action=String(b.action||'');
if(action==='forgot-password'){
 const identifier=String(b.identifier||'').trim().toLowerCase();
 if(!identifier||identifier.length>254)return json(res,400,{error:'Enter your email or username.'});
 if(!process.env.RESEND_API_KEY||!process.env.PASSWORD_RESET_FROM_EMAIL)return json(res,503,{error:'Password recovery email is not configured yet. Contact support.'});
 const rows=await sql`SELECT id,email FROM yarima_app.users WHERE (email=${identifier} OR username=${identifier}) AND status='active' LIMIT 1`;
 if(rows[0]){
  const token=randomBytes(32).toString('hex'),tokenHash=createHash('sha256').update(token).digest('hex');
  await sql`DELETE FROM yarima_app.password_resets WHERE user_id=${rows[0].id}`;
  await sql`INSERT INTO yarima_app.password_resets(user_id,token_hash,expires_at) VALUES(${rows[0].id},${tokenHash},now()+interval '15 minutes')`;
  const url='https://www.alyarimasub.com.ng/?reset='+encodeURIComponent(token);
  let sent=false;
  try{
   const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.PASSWORD_RESET_FROM_EMAIL,to:[rows[0].email],subject:'EL YARIMA — Reset your password',text:'Use this secure link to reset your password (expires in 15 minutes): '+url+'\\nIf you did not request this, ignore this email.'})});
   sent=response.ok;
  }catch(e){console.error('Password reset mail delivery failed',e?.name||'Error')}
  if(!sent){await sql`DELETE FROM yarima_app.password_resets WHERE token_hash=${tokenHash}`;return json(res,503,{error:'Unable to send recovery email right now. Try again later.'});}
 }
 return json(res,200,{ok:true,message:'If an active account matches, a password reset link has been sent to its registered email.'});
}
if(action==='reset-password'){
 const token=String(b.token||''),password=String(b.password||'');
 if(!/^[a-f0-9]{64}$/.test(token))return json(res,400,{error:'Invalid recovery link.'});
 if(password.length<10||password.length>128)return json(res,400,{error:'New password must contain at least 10 characters.'});
 const tokenHash=createHash('sha256').update(token).digest('hex');
 const rows=await sql`DELETE FROM yarima_app.password_resets WHERE token_hash=${tokenHash} AND expires_at>now() RETURNING user_id`;
 if(!rows[0])return json(res,400,{error:'Recovery link has expired or was already used.'});
 const hash=await hashPassword(password);
 await sql`UPDATE yarima_app.users SET password_hash=${hash},updated_at=now() WHERE id=${rows[0].user_id} AND status='active'`;
 await sql`DELETE FROM yarima_app.sessions WHERE user_id=${rows[0].user_id}`;
 await sql`INSERT INTO yarima_app.audit_logs(user_id,action) VALUES(${rows[0].user_id},'password.reset')`;
 return json(res,200,{ok:true,message:'Password changed. Sign in with your new password.'});
}
if(action==='logout'){const token=cookies(req).yr_session;if(token)await sql`DELETE FROM yarima_app.sessions WHERE token_hash=${createHash('sha256').update(token).digest('hex')}`;setCookie(res,'',0);return json(res,200,{ok:true});}
if(action==='register'){const fullName=String(b.fullName||'').trim().replace(/\s+/g,' '),email=String(b.email||'').trim().toLowerCase(),username=String(b.username||'').trim().toLowerCase(),phone=String(b.phone||'').replace(/\D/g,''),password=String(b.password||''),pin=String(b.pin||'');
if(fullName.length<2||fullName.length>100)return json(res,400,{error:'Enter your full name.'});
if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)return json(res,400,{error:'Enter a valid email address.'});
if(!/^[a-z][a-z0-9_]{2,29}$/.test(username))return json(res,400,{error:'Username must be 3-30 characters, start with a letter, and contain only letters, numbers or underscores.'});
if(phone&&!/^0\d{10}$/.test(phone))return json(res,400,{error:'Phone number must be 11 digits or leave it blank.'});
if(password.length<6||password.length>128)return json(res,400,{error:'Password ɗinka ya kasance aƙalla haruffa 6.'});
if(!/^\d{4}$/.test(pin))return json(res,400,{error:'Create a 4-digit purchase PIN.'});
let rows;try{rows=await sql`INSERT INTO yarima_app.users(full_name,email,username,phone,password_hash,pin_hash) VALUES(${fullName},${email},${username},${phone||null},${await hashPassword(password)},${await hashPassword(pin)}) RETURNING id,full_name,email,username,phone,created_at`;}catch(e){if(e.code==='23505')return json(res,409,{error:'An account with that email, username or phone already exists.'});throw e;}
const u=rows[0];await sql`INSERT INTO yarima_app.wallets(user_id) VALUES(${u.id})`;const token=randomBytes(32).toString('base64url');await sql`INSERT INTO yarima_app.sessions(user_id,token_hash,expires_at) VALUES(${u.id},${createHash('sha256').update(token).digest('hex')},now()+interval '30 days')`;await sql`INSERT INTO yarima_app.audit_logs(user_id,action) VALUES(${u.id},'account.registered')`;setCookie(res,token,2592000);return json(res,201,{user:publicUser(u)});}
if(action==='unlock-pin'){const u=await currentUser(req);if(!u)return json(res,401,{error:'Session expired. Sign in with your password.'});const pin=String(b.pin||'');if(!/^\d{4}$/.test(pin))return json(res,400,{error:'Enter your four-digit PIN.'});const rows=await sql`SELECT pin_hash,pin_attempts,pin_locked_until FROM yarima_app.users WHERE id=${u.id}`;const row=rows[0];if(!row?.pin_hash)return json(res,428,{error:'Set up your PIN in Settings first.'});if(row.pin_locked_until&&new Date(row.pin_locked_until)>new Date())return json(res,429,{error:'PIN temporarily locked. Try again after 15 minutes or sign in again with your password.'});const ok=await verifyPassword(pin,row.pin_hash);if(!ok){const failed=await sql`UPDATE yarima_app.users SET pin_attempts=CASE WHEN pin_locked_until IS NOT NULL AND pin_locked_until<=now() THEN 1 WHEN pin_attempts>=4 THEN 0 ELSE pin_attempts+1 END,pin_locked_until=CASE WHEN (pin_locked_until IS NULL OR pin_locked_until<=now()) AND pin_attempts>=4 THEN now()+interval '15 minutes' ELSE NULL END WHERE id=${u.id} AND (pin_locked_until IS NULL OR pin_locked_until<=now()) RETURNING pin_attempts,pin_locked_until`;const locked=!!failed[0]?.pin_locked_until;return json(res,locked?429:401,{error:locked?'Too many attempts. PIN locked for 15 minutes.':'Incorrect PIN. Try again.'});}await sql`UPDATE yarima_app.users SET pin_attempts=0,pin_locked_until=NULL WHERE id=${u.id}`;return json(res,200,{ok:true});}
if(action==='pin-status'){const u=await currentUser(req);if(!u)return json(res,401,{error:'Sign in first.'});const rows=await sql`SELECT pin_hash FROM yarima_app.users WHERE id=${u.id}`;return json(res,200,{configured:!!rows[0]?.pin_hash});}
if(action==='set-pin'||action==='change-pin'){const u=await currentUser(req);if(!u)return json(res,401,{error:'Sign in first.'});const pin=String(b.pin||''),password=String(b.password||''),oldPin=String(b.oldPin||'');if(!/^[0-9]{4}$/.test(pin))return json(res,400,{error:'PIN must contain exactly four digits.'});const rows=await sql`SELECT password_hash,pin_hash FROM yarima_app.users WHERE id=${u.id}`;const row=rows[0];if(!row)return json(res,401,{error:'Account not found.'});if(action==='set-pin'&&row.pin_hash)return json(res,409,{error:'PIN already configured. Use Change PIN.'});if(action==='change-pin'&&!row.pin_hash)return json(res,409,{error:'No PIN configured. Use Set PIN.'});const verified=await verifyPassword(password,row.password_hash);if(!verified)return json(res,401,{error:'Incorrect account password.'});const hash=await hashPassword(pin);const updated=action==='set-pin'?await sql`UPDATE yarima_app.users SET pin_hash=${hash},pin_attempts=0,pin_locked_until=NULL WHERE id=${u.id} AND pin_hash IS NULL RETURNING id`:await sql`UPDATE yarima_app.users SET pin_hash=${hash},pin_attempts=0,pin_locked_until=NULL WHERE id=${u.id} AND pin_hash=${row.pin_hash} RETURNING id`;if(!updated.length)return json(res,409,{error:'PIN was updated elsewhere. Please try again.'});await sql`INSERT INTO yarima_app.audit_logs(user_id,action) VALUES(${u.id},${action==='set-pin'?'pin.created':'pin.changed'})`;return json(res,200,{ok:true,message:action==='set-pin'?'Purchase PIN created.':'Purchase PIN changed.'});}
if(action==='delete-account'){const u=await currentUser(req);if(!u)return json(res,401,{error:'Ka sake shiga account ɗinka kafin ka goge shi.'});const password=String(b.password||'');const rows=await sql`SELECT password_hash FROM yarima_app.users WHERE id=${u.id} LIMIT 1`;if(!rows[0]||!(await verifyPassword(password,rows[0].password_hash)))return json(res,401,{error:'Password ɗin da ka shigar bai dace ba.'});await sql`DELETE FROM yarima_app.sessions WHERE user_id=${u.id}`;await sql`DELETE FROM yarima_app.transactions WHERE user_id=${u.id}`;await sql`DELETE FROM yarima_app.orders WHERE user_id=${u.id}`;await sql`DELETE FROM yarima_app.wallets WHERE user_id=${u.id}`;await sql`INSERT INTO yarima_app.audit_logs(user_id,action) VALUES(${u.id},'account.deleted')`;await sql`DELETE FROM yarima_app.audit_logs WHERE user_id=${u.id}`;await sql`DELETE FROM yarima_app.users WHERE id=${u.id}`;setCookie(res,'',0);return json(res,200,{ok:true});}
if(action==='login'){const identifier=String(b.identifier||b.email||'').trim().toLowerCase(),password=String(b.password||'');const normalizedPhone=identifier.replace(/\D/g,'');const phone=normalizedPhone.startsWith('234')&&normalizedPhone.length===13?'0'+normalizedPhone.slice(3):normalizedPhone;const rows=await sql`SELECT id,full_name,email,username,phone,password_hash,status,created_at FROM yarima_app.users WHERE email=${identifier} OR username=${identifier} OR phone=${phone} LIMIT 1`;const u=rows[0];if(!u||u.status!=='active'||!(await verifyPassword(password,u.password_hash)))return json(res,401,{error:'Login details or password are incorrect.'});const token=randomBytes(32).toString('base64url');await sql`INSERT INTO yarima_app.sessions(user_id,token_hash,expires_at) VALUES(${u.id},${createHash('sha256').update(token).digest('hex')},now()+interval '30 days')`;await sql`INSERT INTO yarima_app.audit_logs(user_id,action) VALUES(${u.id},'account.login')`;setCookie(res,token,2592000);return json(res,200,{user:publicUser(u)});}
return json(res,400,{error:'Unknown authentication action.'});
}catch(e){console.error('auth endpoint error',e?.message||e);return json(res,500,{error:'Account service is unavailable. Check the database connection and try again.'});}}
