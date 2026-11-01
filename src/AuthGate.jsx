import React,{useState} from 'react';
import {ShieldCheck,Lock,UserRound,Phone,ArrowRight,Eye,EyeOff,Wifi,CheckCircle2,Sparkles,Mail,MapPin} from 'lucide-react';

const LEGACY_ROUTE='/mobile/home/includes/route.php';
const HOME='/mobile/home/';

export default function AuthGate(){
 const [mode,setMode]=useState('login');
 const [step,setStep]=useState(1);
 const [fname,setFname]=useState('');
 const [lname,setLname]=useState('');
 const [phone,setPhone]=useState('');
 const [email,setEmail]=useState('');
 const [state,setState]=useState('');
 const [password,setPassword]=useState('');
 const [cpassword,setCpassword]=useState('');
 const [transpin,setTranspin]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [show,setShow]=useState(false);
 const [showConfirm,setShowConfirm]=useState(false);
 const states=['Abuja FCT','Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno','Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','Gombe','Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nassarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara'];
 const register=mode==='register';
 async function submit(e){
  e.preventDefault();setError('');
  if(register&&step===1){
   if(!fname.trim()||!lname.trim()||!phone.trim()||!email.trim()){setError('Cika sunanka, lambar waya da email.');return;}
   setStep(2);return;
  }
  if(register){
   if(password.length<8||password.length>15){setError('Password ya kasance haruffa 8 zuwa 15.');return;}
   if(password===phone){setError('Ba za ka yi amfani da lambar wayarka a matsayin password ba.');return;}
   if(password!==cpassword){setError('Password da tabbatar da password ba su yi daidai ba.');return;}
   if(!state){setError('Zaɓi jihar da kake zaune.');return;}
   if(!/^\\d{4}$/.test(transpin)){setError('PIN dole ya kasance lambobi 4.');return;}
  }
  setBusy(true);
  try{
   const data=new FormData();
   if(register){
    const params=new URLSearchParams(window.location.search);
    data.append('fname',fname.trim());data.append('lname',lname.trim());data.append('phone',phone.trim());
    data.append('email',email.trim());data.append('account','1');data.append('state',state);
    data.append('password',password);data.append('cpassword',cpassword);data.append('transpin',transpin);
    data.append('referal',params.get('referral')||'');
   }else{
    data.append('phone',phone.trim());data.append('password',password);data.append('device','1723476891xlrsFkvJDq963');
   }
   const response=await fetch(LEGACY_ROUTE+(register?'?register':'?login'),{method:'POST',body:data,credentials:'same-origin'});
   const raw=await response.text();let result;
   try{result=JSON.parse(raw);}catch{throw new Error('Server bai dawo da amsar da ake tsammani ba. Duba hanyar tsohon PHP app.');}
   if(result.status==='success'){window.location.assign(HOME);return;}
   throw new Error(result.msg||'An samu matsala. Ka sake dubawa.');
  }catch(err){setError(err.message||'An kasa haɗuwa da sabis. Sake gwadawa.');}
  finally{setBusy(false);}
 }
 function changeMode(next){setMode(next);setStep(1);setError('');setPassword('');setCpassword('');}
 return <main className="auth-screen auth-screen-hausa">
  <div className="auth-decoration auth-decoration-one"/><div className="auth-decoration auth-decoration-two"/>
  <section className="auth-layout" key={mode+step}>
   <aside className="auth-welcome-panel">
    <div className="auth-brand auth-brand-light"><img src="/logo.svg" alt="El Yarima logo"/><div><b>EL YARIMA</b><span>DATA SUB</span></div></div>
    <div className="auth-welcome-copy">
     <span className="auth-pill"><Sparkles size={14}/> SIMPLE. FAST. RELIABLE.</span>
     <h2>{register?'Your digital journey starts here.':'Welcome back.'}</h2>
     <p>{register?'Ƙirƙiri account domin amfani da ayyukan EL YARIMA DATA SUB.':'Shiga account ɗinka domin amfani da ayyukanmu.'}</p>
     <div className="auth-benefits">
      <div><span><CheckCircle2 size={17}/></span><div><b>Personal account</b><small>Asusunka yana nan cikin tsohon tsarinmu.</small></div></div>
      <div><span><CheckCircle2 size={17}/></span><div><b>Wallet and activity</b><small>Duba wallet da tarihin transactions.</small></div></div>
      <div><span><CheckCircle2 size={17}/></span><div><b>Existing PHP security</b><small>Shiga ta tsohon PHP session ɗinka.</small></div></div>
     </div>
    </div>
    <div className="auth-panel-footer"><ShieldCheck size={15}/> EL YARIMA DATA SUB · Secure customer access</div>
   </aside>
   <section className="auth-card auth-card-hausa">
    <div className="auth-mobile-brand"><img src="/logo.svg" alt="El Yarima logo"/><div><b>EL YARIMA</b><span>DATA SUB</span></div></div>
    <div className="auth-mark"><Wifi size={22}/></div>
    <div className="auth-heading">
     <span className="auth-eyebrow"><ShieldCheck size={14}/>{register?'CREATE YOUR ACCOUNT':'SECURE SIGN IN'}</span>
     <h1>{register?'Create an account':'Sign in to your account'}</h1>
     <p>{register?(step===1?'Shigar da bayanan asusunka.':'Kammala bayanan tsaro da wurin zama.'): 'Shiga da lambar wayarka da password.'}</p>
    </div>
    <form onSubmit={submit} className="auth-form">
     {register&&step===1&&<>
      <label>First name<div className="auth-input"><UserRound size={17}/><input value={fname} onChange={e=>setFname(e.target.value)} placeholder="First name" autoComplete="given-name" required/></div></label>
      <label>Last name<div className="auth-input"><UserRound size={17}/><input value={lname} onChange={e=>setLname(e.target.value)} placeholder="Last name" autoComplete="family-name" required/></div></label>
     </>}
     {(!register||step===1)&&<>
      <label>Phone number<div className="auth-input"><Phone size={17}/><input type="tel" inputMode="numeric" value={phone} onChange={e=>setPhone(e.target.value.replace(/[^0-9]/g,'').slice(0,11))} placeholder="08012345678" autoComplete="tel" required maxLength={11}/></div></label>
     </>}
     {register&&step===1&&<label>Email address<div className="auth-input"><Mail size={17}/><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required/></div></label>}
     {register&&step===2&&<>
      <label>State<div className="auth-input"><MapPin size={17}/><select value={state} onChange={e=>setState(e.target.value)} required><option value="">Zaɓi state</option>{states.map(x=><option key={x} value={x}>{x}</option>)}</select></div></label>
     </>}
     {(!register||step===2)&&<>
      <label>Password<div className="auth-input"><Lock size={17}/><input type={show?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" autoComplete={register?'new-password':'current-password'} required minLength={register?8:1} maxLength={register?15:100}/><button type="button" className="auth-eye" onClick={()=>setShow(v=>!v)} aria-label="Show or hide password">{show?<EyeOff size={17}/>:<Eye size={17}/>}</button></div>{register&&<small className="auth-hint">Haruffa 8 zuwa 15.</small>}</label>
     </>}
     {register&&step===2&&<>
      <label>Confirm password<div className="auth-input"><Lock size={17}/><input type={showConfirm?'text':'password'} value={cpassword} onChange={e=>setCpassword(e.target.value)} required maxLength={15} autoComplete="new-password"/><button type="button" className="auth-eye" onClick={()=>setShowConfirm(v=>!v)} aria-label="Show or hide confirm password">{showConfirm?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></label>
      <label>Transaction PIN (4 digits)<div className="auth-input"><Lock size={17}/><input type="password" inputMode="numeric" value={transpin} onChange={e=>setTranspin(e.target.value.replace(/[^0-9]/g,'').slice(0,4))} placeholder="••••" required maxLength={4}/></div></label>
     </>}
     {error&&<div className="auth-error" role="alert">{error}</div>}
     <button className="auth-submit" type="submit" disabled={busy}>{busy?'Ana turawa…':register?(step===1?'Continue':'Create account'):'Sign in'} {!busy&&<ArrowRight size={17}/>}</button>
     {register&&step===2&&<button type="button" className="auth-back" onClick={()=>{setStep(1);setError('');}}>Back</button>}
    </form>
    <p className="auth-switch">{register?'Already have an account?':"Don't have an account yet?"} <button type="button" onClick={()=>changeMode(register?'login':'register')}>{register?'Sign in':'Create account'}</button></p>
    <div className="auth-foot"><ShieldCheck size={14}/> Existing EL YARIMA account session</div>
   </section>
  </section>
  <p className="auth-copyright">© 2026 EL YARIMA DATA SUB · All rights reserved</p>
 </main>;
}
