import React,{useState} from 'react';
import {ShieldCheck,Mail,Lock,UserRound,Phone,ArrowRight,Eye,EyeOff,Wifi,CheckCircle2,Sparkles} from 'lucide-react';

export default function AuthGate({onAuth,initialMode='login',onBack}){
 const [mode,setMode]=useState(new URLSearchParams(window.location.search).has('reset')?'reset':initialMode);
 const [fullName,setFullName]=useState('');
 const [email,setEmail]=useState('');
 const [username,setUsername]=useState('');
 const [phone,setPhone]=useState('');
 const [password,setPassword]=useState('');
 const [pin,setPin]=useState('');
 const [confirmPin,setConfirmPin]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState(''); const [authAlert,setAuthAlert]=useState(null);
 const [show,setShow]=useState(false);
 const [notice,setNotice]=useState('');

 async function submit(e){
  e.preventDefault();
  if(mode==='forgot'||mode==='reset'){
   setBusy(true);setError('');setNotice('');
   try{const r=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(mode==='forgot'?{action:'forgot-password',identifier:email}:{action:'reset-password',token:new URLSearchParams(window.location.search).get('reset'),password})});const d=await r.json();if(!r.ok)throw Error(d.error||'Unable to reset password');setNotice(d.message||'Request completed.');if(mode==='reset'){window.history.replaceState({},'',window.location.pathname);setMode('login');setPassword('');}}catch(e){setError(e.message)}finally{setBusy(false)}return;
  }if(mode==='register'&&(!/^\d{4}$/.test(pin)||pin!==confirmPin)){setError('Enter matching 4-digit purchase PINs.');return;}setBusy(true);setError('');
  try{
   const r=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({action:mode,fullName,email,username,phone,password,pin,identifier:email})});
   const raw=await r.text();let d;try{d=JSON.parse(raw);}catch{throw new Error('Server is temporarily unavailable. Please try again later.');}
   if(!r.ok)throw new Error(d.error||'Something went wrong. Please try again.');
   setAuthAlert({type:'success',message:mode==='register'?'Registration Successful':'Login Successful',user:d.user});
  }catch(e){setError(e.message||'Connection failed. Please try again.');setAuthAlert({type:'error',message:e.message||'Connection failed. Please try again.'});}
  finally{setBusy(false);}
 }

 const register=mode==='register',recover=mode==='forgot'||mode==='reset';
 return <main className="auth-screen auth-screen-hausa">{onBack&&<button type="button" onClick={onBack} style={{position:"fixed",top:14,left:14,zIndex:50,padding:"10px 15px",background:"#fff",color:"#071b3a",border:"1px solid #dce4ee",borderRadius:10,fontWeight:800,cursor:"pointer",boxShadow:"0 4px 16px #071b3a1a"}}>← Back to website</button>}{authAlert&&<div className="yr-alert-backdrop" style={{position:'fixed',inset:0,zIndex:2147483000,background:'rgba(7,27,58,.68)',display:'flex',alignItems:'center',justifyContent:'center',padding:'16px',boxSizing:'border-box',overflowY:'auto'}} role="presentation"><section className="yr-alert-dialog" style={{width:'100%',maxWidth:420,maxHeight:'calc(100dvh - 32px)',overflowY:'auto',boxSizing:'border-box',background:'#fff',borderRadius:18,boxShadow:'0 24px 75px rgba(0,0,0,.32)',display:'flex',flexDirection:'column',alignItems:'center',textAlign:'center',padding:'32px 24px 24px',color:'#071b3a',margin:'auto'}} role="alertdialog" aria-modal="true" aria-label="Authentication result"><div style={{...{width:100,height:100,flexShrink:0,borderRadius:'50%',border:'3px solid currentColor',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:22},color:authAlert.type==='error'?'#dc3545':'#13865e'}} className={'yr-alert-symbol yr-alert-'+authAlert.type}>{authAlert.type==='success'?<CheckCircle2 size={48}/>:<Lock size={42}/>}</div><h2 style={{fontSize:24,fontWeight:800,color:'#071b3a',margin:'0 0 12px'}}>Alert!!</h2><p style={{fontSize:14,lineHeight:1.6,color:'#596679',margin:'0 0 28px',overflowWrap:'anywhere'}}>{authAlert.message}</p><button style={{alignSelf:'flex-end',minWidth:100,padding:'12px 24px',background:'#071b3a',color:'#f2d68b',border:'1px solid #d9aa42',borderRadius:10,fontWeight:800,cursor:'pointer'}} className="yr-alert-ok" onClick={()=>{const result=authAlert;setAuthAlert(null);if(result.type==='success')onAuth(result.user)}}>OK</button></section></div>}
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
     <span className="auth-eyebrow"><ShieldCheck size={14}/>{recover?'PASSWORD RECOVERY':register?'CREATE YOUR ACCOUNT':'SECURE SIGN IN'}</span>
     <h1>{mode==='forgot'?'Forgot password':mode==='reset'?'Choose a new password':register?'Create an account':'Sign in to your account'}</h1>
     <p>{mode==='forgot'?'Enter your registered email or username. We will email a secure recovery link.':mode==='reset'?'Your reset link expires after 15 minutes.':register?'Enter your details below to get started.':'Enter your email, username or phone number and password.'}</p>
    </div>
    <form onSubmit={submit} className="auth-form">
     {register&&<label>Full name<div className="auth-input"><UserRound size={17}/><input value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="e.g. Musa Abdullahi" autoComplete="name" required minLength={2} maxLength={100}/></div></label>}
     {mode!=='reset'&&<label>{register?'Email address':'Email, username or phone number'}<div className="auth-input"><Mail size={17}/><input type={register?'email':'text'} value={email} onChange={e=>setEmail(e.target.value)} placeholder={register?'you@example.com':'Email, username or 08012345678'} autoComplete={register?'email':'username'} required maxLength={254}/></div></label>}
     {register&&<label>Username<div className="auth-input"><UserRound size={17}/><input value={username} onChange={e=>setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,'').slice(0,30))} placeholder="e.g. musa123" autoComplete="username" required minLength={3} maxLength={30} pattern="[a-z][a-z0-9_]{2,29}"/></div></label>}
     {register&&<label>Phone number <span className="auth-optional">(optional)</span><div className="auth-input"><Phone size={17}/><input type="tel" inputMode="numeric" value={phone} onChange={e=>setPhone(e.target.value.replace(/[^0-9]/g,'').slice(0,11))} placeholder="08012345678" autoComplete="tel" maxLength={11}/></div></label>}
     {mode!=='forgot'&&<label>Password<div className="auth-input"><Lock size={17}/><input type={show?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder={register?'At least 6 characters':'Enter your password'} autoComplete={register?'new-password':'current-password'} required minLength={register?6:1} maxLength={128}/><button type="button" className="auth-eye" onClick={()=>setShow(v=>!v)} aria-label={show?'Hide password':'Show password'}>{show?<EyeOff size={17}/>:<Eye size={17}/>}</button></div>{register&&<small className="auth-hint">Use at least 6 characters.</small>}</label>}
     {register&&<><label>4-digit purchase PIN<div className="auth-input"><Lock size={17}/><input type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,'').slice(0,4))} placeholder="••••" autoComplete="new-password" required/></div></label><label>Confirm purchase PIN<div className="auth-input"><ShieldCheck size={17}/><input type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} value={confirmPin} onChange={e=>setConfirmPin(e.target.value.replace(/\D/g,'').slice(0,4))} placeholder="••••" autoComplete="new-password" required/></div><small className="auth-hint">This PIN is required every time you buy data or airtime. Do not share it.</small></label></>}
     {error&&<div className="auth-error" role="alert">{error}</div>}{notice&&<div role="status" style={{color:'#13865e',fontWeight:700}}>{notice}</div>}
     <button className="auth-submit" type="submit" disabled={busy}>{busy?'Please wait…':mode==='forgot'?'Send recovery link':mode==='reset'?'Reset password':register?'Create account':'Sign in'} {!busy&&<ArrowRight size={17}/>}</button>
    </form>
    {!recover&&<p className="auth-switch">{register?'Already have an account?':"Don't have an account yet?"} <button type="button" onClick={()=>{setMode(register?'login':'register');setError('');setPassword('');}}>{register?'Sign in':'Create account'}</button></p>}{mode==='login'&&<p className="auth-switch"><button type="button" onClick={()=>{setMode('forgot');setError('');setNotice('')}}>Forgot password?</button></p>}{recover&&<p className="auth-switch"><button type="button" onClick={()=>{setMode('login');setError('');setNotice('');window.history.replaceState({},'',window.location.pathname)}}>Back to sign in</button></p>}
    <div className="auth-foot"><ShieldCheck size={14}/> Your sign-in session is protected.</div>
   </section>
  </section>
  <p className="auth-copyright">© 2026 El Yarima Sub Data · All rights reserved</p>
 </main>;
}
