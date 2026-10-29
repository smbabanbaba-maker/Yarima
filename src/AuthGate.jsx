import React,{useState} from 'react';
import {ShieldCheck,Mail,Lock,UserRound,Phone,ArrowRight,Eye,EyeOff,Wifi,CheckCircle2,Sparkles} from 'lucide-react';

export default function AuthGate({onAuth}){
 const [mode,setMode]=useState('login');
 const [fullName,setFullName]=useState('');
 const [email,setEmail]=useState('');
 const [phone,setPhone]=useState('');
 const [password,setPassword]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [show,setShow]=useState(false);

 async function submit(e){
  e.preventDefault();setBusy(true);setError('');
  try{
   const r=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({action:mode,fullName,email,phone,password})});
   const d=await r.json();
   if(!r.ok)throw new Error(d.error||'Something went wrong. Please try again.');
   onAuth(d.user);
  }catch(e){setError(e.message||'Connection failed. Please try again.');}
  finally{setBusy(false);}
 }

 const register=mode==='register';
 return <main className="auth-screen auth-screen-hausa">
  <div className="auth-decoration auth-decoration-one"/><div className="auth-decoration auth-decoration-two"/>
  <section className="auth-layout" key={mode}>
   <aside className="auth-welcome-panel">
    <div className="auth-brand auth-brand-light"><img src="/logo.svg" alt="El Yarima logo"/><div><b>EL YARIMA</b><span>SUB DATA</span></div></div>
    <div className="auth-welcome-copy">
     <span className="auth-pill"><Sparkles size={14}/> SIMPLE. FAST. RELIABLE.</span>
     <h2>{register?'Your digital journey starts here.':'Welcome back.'}</h2>
     <p>{register?'Create your account to access El Yarima Sub Data services and manage your digital essentials in one place.':'Sign in to manage your account, view your wallet and access your digital services.'}</p>
     <div className="auth-benefits">
      <div><span><CheckCircle2 size={17}/></span><div><b>Your personal account</b><small>Your account details stay associated with your profile.</small></div></div>
      <div><span><CheckCircle2 size={17}/></span><div><b>Wallet and activity history</b><small>Review your account activity in one convenient place.</small></div></div>
      <div><span><CheckCircle2 size={17}/></span><div><b>Security at every step</b><small>A sign-in experience designed with care.</small></div></div>
     </div>
    </div>
    <div className="auth-panel-footer"><ShieldCheck size={15}/> El Yarima Sub Data · Simple, secure digital services</div>
   </aside>
   <section className="auth-card auth-card-hausa">
    <div className="auth-mobile-brand"><img src="/logo.svg" alt="El Yarima logo"/><div><b>EL YARIMA</b><span>SUB DATA</span></div></div>
    <div className="auth-mark"><Wifi size={22}/></div>
    <div className="auth-heading">
     <span className="auth-eyebrow"><ShieldCheck size={14}/>{register?'CREATE YOUR ACCOUNT':'SECURE SIGN IN'}</span>
     <h1>{register?'Create an account':'Sign in to your account'}</h1>
     <p>{register?'Enter your details below to get started.':'Enter your email and password to continue.'}</p>
    </div>
    <form onSubmit={submit} className="auth-form">
     {register&&<label>Full name<div className="auth-input"><UserRound size={17}/><input value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="e.g. Musa Abdullahi" autoComplete="name" required minLength={2} maxLength={100}/></div></label>}
     <label>Email address<div className="auth-input"><Mail size={17}/><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required maxLength={254}/></div></label>
     {register&&<label>Phone number <span className="auth-optional">(optional)</span><div className="auth-input"><Phone size={17}/><input type="tel" inputMode="numeric" value={phone} onChange={e=>setPhone(e.target.value.replace(/[^0-9]/g,'').slice(0,11))} placeholder="08012345678" autoComplete="tel" maxLength={11}/></div></label>}
     <label>Password<div className="auth-input"><Lock size={17}/><input type={show?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder={register?'At least 6 characters':'Enter your password'} autoComplete={register?'new-password':'current-password'} required minLength={register?6:1} maxLength={128}/><button type="button" className="auth-eye" onClick={()=>setShow(v=>!v)} aria-label={show?'Hide password':'Show password'}>{show?<EyeOff size={17}/>:<Eye size={17}/>}</button></div>{register&&<small className="auth-hint">Use at least 6 characters.</small>}</label>
     {error&&<div className="auth-error" role="alert">{error}</div>}
     <button className="auth-submit" type="submit" disabled={busy}>{busy?'Please wait…':register?'Create account':'Sign in'} {!busy&&<ArrowRight size={17}/>}</button>
    </form>
    <p className="auth-switch">{register?'Already have an account?':"Don't have an account yet?"} <button type="button" onClick={()=>{setMode(register?'login':'register');setError('');setPassword('');}}>{register?'Sign in':'Create account'}</button></p>
    <div className="auth-foot"><ShieldCheck size={14}/> Your sign-in session is protected.</div>
   </section>
  </section>
  <p className="auth-copyright">© 2026 El Yarima Sub Data · All rights reserved</p>
 </main>;
}
