import {sql,ensureSchema,json,currentUser} from '../lib/db.js';
const adminId=()=>String(process.env.YARIMA_ADMIN_USER_ID||'').trim().toLowerCase();
export default async function handler(req,res){
 try{
  await ensureSchema();
  if(req.method!=='GET'){res.setHeader('Allow','GET');return json(res,405,{error:'Method not allowed'});}
  const user=await currentUser(req);
  if(!user)return json(res,401,{error:'Please sign in with your account first.'});
  if(!adminId()||String(user.id).toLowerCase()!==adminId())return json(res,403,{error:'You do not have admin access.'});
  const section=String(req.query?.section||'overview');
  if(section==='overview'){
   const [users,wallets,tx,orders]=await Promise.all([
    sql`SELECT COUNT(*)::int AS total,COUNT(*) FILTER (WHERE status='active')::int AS active FROM yarima_app.users`,
    sql`SELECT COALESCE(SUM(balance_kobo),0)::text AS total_kobo,COUNT(*)::int AS count FROM yarima_app.wallets`,
    sql`SELECT COUNT(*)::int AS total,COUNT(*) FILTER (WHERE status='pending')::int AS pending,COALESCE(SUM(amount_kobo) FILTER (WHERE type='credit' AND status='successful'),0)::text AS deposits_kobo FROM yarima_app.transactions`,
    sql`SELECT COUNT(*)::int AS total,COUNT(*) FILTER (WHERE status='pending' OR status='processing')::int AS pending,COUNT(*) FILTER (WHERE status='failed')::int AS failed FROM yarima_app.orders`
   ]);
   return json(res,200,{users:users[0],wallets:wallets[0],transactions:tx[0],orders:orders[0]});
  }
  if(section==='users'){
   const rows=await sql`SELECT u.id,u.full_name,u.username,u.email,u.phone,u.status,u.created_at,COALESCE(w.balance_kobo,0)::text AS balance_kobo FROM yarima_app.users u LEFT JOIN yarima_app.wallets w ON w.user_id=u.id ORDER BY u.created_at DESC LIMIT 100`;
   return json(res,200,{rows});
  }
  if(section==='transactions'){
   const rows=await sql`SELECT t.id,t.reference,t.type,t.category,t.amount_kobo::text AS amount_kobo,t.status,t.description,t.created_at,u.username,u.email FROM yarima_app.transactions t JOIN yarima_app.users u ON u.id=t.user_id ORDER BY t.created_at DESC LIMIT 100`;
   return json(res,200,{rows});
  }
  if(section==='orders'){
   const rows=await sql`SELECT o.id,o.reference,o.service_type,o.network,o.recipient,o.product_name,o.amount_kobo::text AS amount_kobo,o.status,o.created_at,u.username FROM yarima_app.orders o JOIN yarima_app.users u ON u.id=o.user_id ORDER BY o.created_at DESC LIMIT 100`;
   return json(res,200,{rows});
  }
  if(section==='audit'){
   const rows=await sql`SELECT a.id,a.action,a.created_at,u.username FROM yarima_app.audit_logs a LEFT JOIN yarima_app.users u ON u.id=a.user_id ORDER BY a.created_at DESC LIMIT 100`;
   return json(res,200,{rows});
  }
  return json(res,400,{error:'Unknown section.'});
 }catch(e){console.error('admin endpoint error',e?.message||e);return json(res,500,{error:'Admin service is temporarily unavailable.'});}
}
