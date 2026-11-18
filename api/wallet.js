import {sql,ensureSchema,json,currentUser} from '../lib/db.js';
export default async function handler(req,res){try{await ensureSchema();if(req.method!=='GET'){res.setHeader('Allow','GET');return json(res,405,{error:'Method not allowed'});}const u=await currentUser(req);if(!u)return json(res,401,{error:'Please sign in.'});if(req.query?.admin==='1'){
const adminId=String(process.env.YARIMA_ADMIN_USER_ID||'').trim().toLowerCase();
if(!adminId||String(u.id).toLowerCase()!==adminId)return json(res,403,{error:'You do not have admin access.'});
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
  if(section==='finance'){
   const [activity,services,daily,network,balances]=await Promise.all([
    sql`SELECT COUNT(*)::int AS transactions,COALESCE(SUM(amount_kobo) FILTER (WHERE type='credit' AND status='successful'),0)::text AS credited_kobo,COALESCE(SUM(amount_kobo) FILTER (WHERE type='debit'),0)::text AS debited_kobo,COALESCE(SUM(amount_kobo) FILTER (WHERE type='reversal' AND status='successful'),0)::text AS reversals_kobo,COUNT(*) FILTER (WHERE status='pending')::int AS pending FROM yarima_app.transactions`,
    sql`SELECT service_type,COUNT(*)::int AS orders,COUNT(*) FILTER (WHERE status='successful')::int AS successful,COUNT(*) FILTER (WHERE status='failed')::int AS failed,COUNT(*) FILTER (WHERE status IN ('pending','processing'))::int AS pending,COALESCE(SUM(amount_kobo) FILTER (WHERE status='successful'),0)::text AS successful_kobo FROM yarima_app.orders GROUP BY service_type ORDER BY orders DESC`,
    sql`SELECT (created_at AT TIME ZONE 'Africa/Lagos')::date::text AS day,COUNT(*)::int AS orders,COALESCE(SUM(amount_kobo) FILTER (WHERE status='successful'),0)::text AS sales_kobo FROM yarima_app.orders WHERE created_at>=now()-interval '30 days' GROUP BY 1 ORDER BY 1`,
    sql`SELECT COALESCE(network,'Other') AS network,COUNT(*)::int AS orders,COALESCE(SUM(amount_kobo) FILTER (WHERE status='successful'),0)::text AS sales_kobo FROM yarima_app.orders GROUP BY network ORDER BY orders DESC`,
    sql`SELECT status,COUNT(*)::int AS wallets,COALESCE(SUM(balance_kobo),0)::text AS balance_kobo FROM yarima_app.wallets GROUP BY status`
   ]);
   return json(res,200,{activity:activity[0],services, daily,networks:network,wallets:balances,provider:{name:'VTU.ng',balanceAvailable:false,message:'Provider account balance is not connected. This dashboard must not guess your VTU.ng funds.'}});
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
}
const w=await sql`SELECT id,currency,balance_kobo,status FROM yarima_app.wallets WHERE user_id=${u.id} LIMIT 1`;if(!w[0])return json(res,404,{error:'Wallet not found.'});const rows=await sql`SELECT t.id,t.reference,t.type,t.category,t.amount_kobo,t.balance_before_kobo,t.balance_after_kobo,t.status,t.description,t.created_at,o.status AS order_status,o.network,o.recipient,o.product_name,o.provider_reference FROM yarima_app.transactions t LEFT JOIN yarima_app.orders o ON o.transaction_id=t.id AND o.user_id=t.user_id WHERE t.user_id=${u.id} ORDER BY t.created_at DESC LIMIT 100`;return json(res,200,{wallet:{id:w[0].id,currency:w[0].currency,balanceKobo:String(w[0].balance_kobo),status:w[0].status},transactions:rows.map(t=>({id:t.id,reference:t.reference,type:t.type,category:t.category,amountKobo:String(t.amount_kobo),balanceBeforeKobo:String(t.balance_before_kobo),balanceAfterKobo:String(t.balance_after_kobo),status:t.order_status||t.status,description:t.description,network:t.network,recipient:t.recipient,productName:t.product_name,providerReference:t.provider_reference,createdAt:t.created_at}))});}catch(e){console.error('wallet endpoint error',e?.message||e);return json(res,500,{error:'Wallet service is temporarily unavailable.'});}}