/* ================= INICIO DE SESIÓN ================= */
const AUTH={mode:'login',email:'',pass:'',pass2:'',busy:false,msg:'',err:'',recovery:false};
function viewAuth(){
  const a=AUTH, signup=a.mode==='signup';
  const title=a.recovery?t('Nueva contraseña'):signup?t('Crear cuenta'):t('Entrar');
  return `<div class="auth"><div class="auth-card">
    <div class="logo" style="padding:0;justify-content:center"><div class="mark">${ic('book','s18')}</div><div><b>Deures</b><small>${t('Agenda de clase')}</small></div></div>
    <div class="seg full">${Object.entries(LANGS).map(([k,v])=>`<button class="${LANG===k?'on acc':''}" data-act="lang" data-v="${k}">${v}</button>`).join('')}</div>
    <h2>${title}</h2>
    <p class="sec" style="font-size:13px">${a.recovery?t('Escribe tu nueva contraseña.'):t('Con tu cuenta, tus deberes se sincronizan al momento en el móvil y en todos tus PCs.')}</p>
    ${a.recovery?'':`<div class="field"><span class="lbl">${t('Correo electrónico')}</span><input type="email" autocomplete="email" data-in="au-email" data-focus="au-email" value="${esc(a.email)}" placeholder="tu@correo.com"></div>`}
    <div class="field"><span class="lbl">${t('Contraseña')}</span><input type="password" autocomplete="${signup||a.recovery?'new-password':'current-password'}" data-in="au-pass" data-focus="au-pass" value="${esc(a.pass)}" placeholder="${t('Mínimo 6 caracteres')}"></div>
    ${signup?`<div class="field"><span class="lbl">${t('Repite la contraseña')}</span><input type="password" autocomplete="new-password" data-in="au-pass2" data-focus="au-pass2" value="${esc(a.pass2)}"></div>`:''}
    ${a.err?`<div class="err">${esc(a.err)}</div>`:''}${a.msg?`<div class="banner" style="padding:10px 14px">${esc(a.msg)}</div>`:''}
    <button class="btn" data-act="${a.recovery?'au-newpass':'au-go'}" ${a.busy?'disabled':''}>${a.busy?t('Un momento…'):title}</button>
    ${a.recovery?'':`<div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:10px"><button class="link" data-act="au-switch">${signup?t('Ya tengo cuenta'):t('Crear una cuenta nueva')}</button>${signup?'':`<button class="link" data-act="au-forgot">${t('He olvidado la contraseña')}</button>`}</div>
    <button class="sec" style="font-size:12px;margin-top:4px" data-act="au-local">${t('Usar sin cuenta (solo en este dispositivo)')}</button>`}
  </div></div>`;
}
function authErr(e){
  const m=(e&&e.message||'').toLowerCase();
  if(m.includes('invalid login')) return t('Correo o contraseña incorrectos.');
  if(m.includes('email not confirmed')) return t('Tienes que confirmar tu correo: abre el enlace que te hemos enviado.');
  if(m.includes('already registered')||m.includes('already been registered')) return t('Ya existe una cuenta con ese correo. Entra con ella.');
  if(m.includes('password')&&m.includes('6')) return t('La contraseña necesita al menos 6 caracteres.');
  if(m.includes('fetch')||m.includes('network')) return t('Sin conexión. Inténtalo de nuevo.');
  return (e&&e.message)||t('Algo ha fallado. Inténtalo de nuevo.');
}
const siteUrl=()=>location.origin+location.pathname;
async function authGo(){
  const a=AUTH; a.err=''; a.msg='';
  const email=a.email.trim();
  if(!/^\S+@\S+\.\S+$/.test(email)){ a.err=t('Escribe un correo válido.'); return render(); }
  if(a.pass.length<6){ a.err=t('La contraseña necesita al menos 6 caracteres.'); return render(); }
  if(a.mode==='signup'&&a.pass!==a.pass2){ a.err=t('Las contraseñas no coinciden.'); return render(); }
  a.busy=true; render();
  try{
    if(a.mode==='signup'){
      const {data,error}=await SB.client.auth.signUp({email,password:a.pass,options:{emailRedirectTo:siteUrl()}});
      if(error) throw error;
      if(!data.session){ a.mode='login'; a.msg=t('Cuenta creada. Te hemos enviado un correo: abre el enlace para confirmarla y luego entra aquí.'); }
    } else {
      const {error}=await SB.client.auth.signInWithPassword({email,password:a.pass});
      if(error) throw error;
    }
    a.pass=''; a.pass2='';
  }catch(e){ a.err=authErr(e); }
  a.busy=false; render();
}

/* ================= NOTIFICACIONES PUSH ================= */
const FN_URL=()=>CFG.supabaseUrl.replace(/\/$/,'')+'/functions/v1/deures-push';
const Push={
  supported:('serviceWorker' in navigator)&&('PushManager' in window)&&('Notification' in window),
  sub:null, busy:false, msg:'', err:false,
  perm(){ return this.supported?Notification.permission:'unsupported'; },
  async reg(){
    const r=await navigator.serviceWorker.getRegistration(); if(r&&r.active) return r;
    return Promise.race([navigator.serviceWorker.ready,new Promise((_,rej)=>setTimeout(()=>rej(new Error(t('La app aún se está instalando. Espera unos segundos y vuelve a intentarlo.'))),6000))]);
  },
  async current(){ if(!this.supported) return null; try{ const r=await navigator.serviceWorker.getRegistration(); this.sub=r?await r.pushManager.getSubscription():null; }catch(e){ this.sub=null; } return this.sub; },
  async vapidKey(){
    const cached=LS.get('deures:vapid'); if(cached) return cached;
    const r=await fetch(FN_URL()+'?op=key',{headers:{apikey:CFG.supabaseKey,Authorization:'Bearer '+CFG.supabaseKey}});
    if(!r.ok) throw new Error('key '+r.status); const j=await r.json(); if(!j.publicKey) throw new Error('no key');
    LS.set('deures:vapid',j.publicKey); return j.publicKey;
  },
  async save(sub){
    const j=sub.toJSON();
    const {error}=await SB.client.from('push_subscriptions').upsert({endpoint:j.endpoint,user_id:S.user.id,p256dh:j.keys.p256dh,auth:j.keys.auth,device:deviceName(),lang:LANG,tz:Intl.DateTimeFormat().resolvedOptions().timeZone||'Europe/Madrid',updated_at:new Date().toISOString()});
    if(error) throw error;
  },
  async enable(){
    if(this.busy) return; this.busy=true; this.msg=''; this.err=false; render();
    try{
      if(S.mode!=='cloud') throw new Error(t('Necesitas entrar con tu cuenta para recibir avisos.'));
      const p=await Notification.requestPermission();
      if(p!=='granted') throw new Error(t('Has bloqueado las notificaciones. Actívalas en los ajustes del navegador para esta web.'));
      const key=await this.vapidKey(); const r=await this.reg();
      let sub=await r.pushManager.getSubscription();
      if(sub&&sub.options&&sub.options.applicationServerKey){ const cur=b64u(new Uint8Array(sub.options.applicationServerKey)); if(cur!==key){ await sub.unsubscribe(); sub=null; } }
      if(!sub) sub=await r.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:fromB64u(key)});
      await this.save(sub); this.sub=sub;
      if(!S.settings.notif.on) saveSettings({notif:{...S.settings.notif,on:true}});
      this.msg=t('Avisos activados en este dispositivo.');
    }catch(e){ this.err=true; this.msg=(e&&e.message)||t('No se han podido activar los avisos.'); }
    this.busy=false; render();
  },
  async disable(){
    this.busy=true; render();
    try{ const sub=await this.current(); if(sub){ const ep=sub.endpoint; await sub.unsubscribe(); if(S.mode==='cloud') await SB.client.from('push_subscriptions').delete().eq('endpoint',ep); } this.sub=null; this.msg=t('Avisos desactivados en este dispositivo.'); this.err=false; }
    catch(e){ this.err=true; this.msg=t('No se han podido desactivar.'); }
    this.busy=false; render();
  },
  async test(){
    this.busy=true; this.msg=''; render();
    try{
      const {data}=await SB.client.auth.getSession(); const tok=data&&data.session&&data.session.access_token;
      const r=await fetch(FN_URL()+'?op=test',{method:'POST',headers:{apikey:CFG.supabaseKey,Authorization:'Bearer '+tok,'Content-Type':'application/json'},body:JSON.stringify({lang:LANG})});
      const j=await r.json().catch(()=>({}));
      if(!r.ok) throw new Error(j.error||('HTTP '+r.status));
      this.err=!j.sent; this.msg=j.sent?t('Enviada. Debería llegarte en unos segundos.'):t('No hay dispositivos con avisos activados.');
    }catch(e){ this.err=true; this.msg=t('No se ha podido enviar la prueba.')+' '+((e&&e.message)||''); }
    this.busy=false; render();
  },
  async refresh(){ // al abrir: mantiene la suscripción al día (idioma, zona horaria)
    if(!this.supported||S.mode!=='cloud'||Notification.permission!=='granted') { render(); return; }
    try{ const sub=await this.current(); if(sub) await this.save(sub); }catch(e){}
    render();
  }
};
function b64u(bytes){ let s=''; bytes.forEach(b=>s+=String.fromCharCode(b)); return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
function fromB64u(s){ const p='='.repeat((4-s.length%4)%4); const b=atob((s+p).replace(/-/g,'+').replace(/_/g,'/')); return Uint8Array.from(b,c=>c.charCodeAt(0)); }
function deviceName(){
  const u=navigator.userAgent; const os=/Android/i.test(u)?'Android':/iPhone|iPad/i.test(u)?'iOS':/Windows/i.test(u)?'Windows':/Mac/i.test(u)?'Mac':/Linux/i.test(u)?'Linux':'?';
  const br=/Edg\//.test(u)?'Edge':/Chrome\//.test(u)?'Chrome':/Firefox\//.test(u)?'Firefox':/Safari\//.test(u)?'Safari':'';
  return `${os} · ${br}`.trim();
}

/* ================= INSTALAR (PWA) ================= */
let installEvt=null;
window.addEventListener('beforeinstallprompt',e=>{ e.preventDefault(); installEvt=e; render(); });
window.addEventListener('appinstalled',()=>{ installEvt=null; toast(t('App instalada')); render(); });
const isStandalone=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
