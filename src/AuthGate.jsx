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
   if(!r.ok)throw new Error(d.error||'An samu matsala. Ka sake gwadawa.');
   onAuth(d.user);
  }catch(e){setError(e.message||'An samu matsalar haɗi. Ka sake gwadawa.');}
  finally{setBusy(false);}
 }

 const register=mode==='register';
 return <main className="auth-screen auth-screen-hausa">
  <div className="auth-decoration auth-decoration-one"/><div className="auth-decoration auth-decoration-two"/>
  <section className="auth-layout">
   <aside className="auth-welcome-panel">
    <div className="auth-brand auth-brand-light"><img src="/logo.svg" alt="Tambarin El Yarima"/><div><b>EL YARIMA</b><span>SUB DATA</span></div></div>
    <div className="auth-welcome-copy">
     <span className="auth-pill"><Sparkles size={14}/> SAUKI. SAURI. AMINTACCIYA.</span>
     <h2>{register?'Ka fara tafiyarka ta dijital.':'Barka da dawowa.'}</h2>
     <p>{register?'Ƙirƙiri account ɗinka domin samun damar amfani da ayyukan El Yarima Sub Data.':'Shiga account ɗinka domin duba wallet ɗinka da ayyukan da kake amfani da su.'}</p>
     <div className="auth-benefits">
      <div><span><CheckCircle2 size={17}/></span><div><b>Account ɗinka na kanka</b><small>Ana adana bayananka cikin tsaro.</small></div></div>
      <div><span><CheckCircle2 size={17}/></span><div><b>Wallet da tarihin ayyuka</b><small>Duba bayanan account ɗinka a wuri guda.</small></div></div>
      <div><span><CheckCircle2 size={17}/></span><div><b>Tsaro a kowane mataki</b><small>An tsara shiga account cikin kulawa.</small></div></div>
     </div>
    </div>
    <div className="auth-panel-footer"><ShieldCheck size={15}/> El Yarima Sub Data · Amintacce kuma mai sauƙin amfani</div>
   </aside>
   <section className="auth-card auth-card-hausa">
    <div className="auth-mobile-brand"><img src="/logo.svg" alt="Tambarin El Yarima"/><div><b>EL YARIMA</b><span>SUB DATA</span></div></div>
    <div className="auth-mark"><Wifi size={22}/></div>
    <div className="auth-heading">
     <span className="auth-eyebrow"><ShieldCheck size={14}/>{register?'BUƊE SABON ACCOUNT':'SHIGA ACCOUNT'}</span>
     <h1>{register?'Ƙirƙiri account':'Shiga account ɗinka'}</h1>
     <p>{register?'Cika bayanan da ke ƙasa domin fara amfani da account ɗinka.':'Shigar da email da password ɗinka domin ci gaba.'}</p>
    </div>
    <form onSubmit={submit} className="auth-form">
     {register&&<label>Cikakken suna<div className="auth-input"><UserRound size={17}/><input value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Misali: Musa Abdullahi" autoComplete="name" required minLength={2} maxLength={100}/></div></label>}
     <label>Adireshin email<div className="auth-input"><Mail size={17}/><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="suna@example.com" autoComplete="email" required maxLength={254}/></div></label>
     {register&&<label>Lambar waya <span className="auth-optional">(ba dole ba)</span><div className="auth-input"><Phone size={17}/><input type="tel" inputMode="numeric" value={phone} onChange={e=>setPhone(e.target.value.replace(/[^0-9]/g,'').slice(0,11))} placeholder="08012345678" autoComplete="tel" maxLength={11}/></div></label>}
     <label>Password<div className="auth-input"><Lock size={17}/><input type={show?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder={register?'Aƙalla haruffa 10':'Shigar da password ɗinka'} autoComplete={register?'new-password':'current-password'} required minLength={register?10:1} maxLength={128}/><button type="button" className="auth-eye" onClick={()=>setShow(v=>!v)} aria-label={show?'Ɓoye password':'Nuna password'}>{show?<EyeOff size={17}/>:<Eye size={17}/>}</button></div>{register&&<small className="auth-hint">Yi amfani da aƙalla haruffa 10.</small>}</label>
     {error&&<div className="auth-error" role="alert">{error}</div>}
     <button className="auth-submit" type="submit" disabled={busy}>{busy?'Ana jira…':register?'Ƙirƙiri account':'Shiga account'} {!busy&&<ArrowRight size={17}/>}</button>
    </form>
    <p className="auth-switch">{register?'Kana da account tuni?':'Ba ka da account tukuna?'} <button type="button" onClick={()=>{setMode(register?'login':'register');setError('');}}>{register?'Shiga account':'Buɗe account'}</button></p>
    <div className="auth-foot"><ShieldCheck size={14}/> Ana kare zaman shiga account ɗinka.</div>
   </section>
  </section>
  <p className="auth-copyright">© 2026 El Yarima Sub Data · An tanadi duk haƙƙoƙi</p>
 </main>;
}
