/* ================= ESTADO + DATOS =================
   Nube: Supabase (tablas settings + items con RLS, tiempo real con postgres_changes).
   Cada cambio se guarda al momento en el dispositivo y entra en una cola (OUT) que se envía
   en cuanto hay conexión. Los borrados son "suaves" (deleted:true) para que se propaguen.
   Local: si no hay configuración de Supabase o el usuario elige "sin cuenta".
*/
const CFG=window.DEURES_CONFIG||{};
const HAS_CLOUD=!!(CFG.supabaseUrl&&CFG.supabaseKey&&window.supabase&&window.supabase.createClient);
const DEFAULT_SETTINGS={name:'',subjects:[],schedule:[],showPersonal:true,onboarded:false,lang:'',tz:'',notif:{...DEFAULT_NOTIF},updatedAt:0};
const S={mode:'boot',user:null,settings:{...DEFAULT_SETTINGS},items:{},ready:false,live:false,pending:0,syncErr:null,lastSync:null};
const K_LOCAL='deures:local', K_UI='deures:ui', K_MODE='deures:mode';
let OUT={items:{},settings:null};

/* --- saneado: lo que viene de la red se trata como no fiable --- */
const str=(v,max=500)=>typeof v==='string'?v.slice(0,max):'';
const num=(v,d=0)=>typeof v==='number'&&isFinite(v)?v:d;
function cleanItem(raw,id){
  if(!raw||typeof raw!=='object')return null;
  const kind=KINDS[raw.kind]?raw.kind:'deber';
  return {
    id:str(id||raw.id,120)||uid(), kind,
    title:str(raw.title,300), subjectId:str(raw.subjectId,120),
    date:validDate(raw.date)?raw.date:'', time:validTime(raw.time)?raw.time:'',
    priority:PRIOS[raw.priority]?raw.priority:'media',
    notes:str(raw.notes,5000), place:str(raw.place,200),
    category:CATS[raw.category]?raw.category:'Otro',
    grade:typeof raw.grade==='number'&&isFinite(raw.grade)?raw.grade:null,
    steps:Array.isArray(raw.steps)?raw.steps.slice(0,60).map(s=>({id:str(s&&s.id,60)||uid(),text:str(s&&s.text,300),done:!!(s&&s.done)})).filter(s=>s.text):[],
    done:!!raw.done, doneAt:typeof raw.doneAt==='number'?raw.doneAt:null, deleted:!!raw.deleted,
    createdAt:num(raw.createdAt,Date.now()), updatedAt:num(raw.updatedAt,Date.now())
  };
}
function cleanSettings(raw){
  const r=raw&&typeof raw==='object'?raw:{}; const n=r.notif&&typeof r.notif==='object'?r.notif:{};
  return {
    name:str(r.name,60),
    subjects:Array.isArray(r.subjects)?r.subjects.slice(0,40).map(s=>({id:str(s&&s.id,60)||uid(),name:str(s&&s.name,80),color:/^#[0-9a-fA-F]{6}$/.test(s&&s.color)?s.color:PALETTE[0]})).filter(s=>s.name):[],
    schedule:Array.isArray(r.schedule)?r.schedule.slice(0,120).map(c=>({id:str(c&&c.id,60)||uid(),day:clamp(Number(c&&c.day)||0,0,6),start:validTime(c&&c.start)?c.start:'15:00',end:validTime(c&&c.end)?c.end:'16:00',subjectId:str(c&&c.subjectId,60),room:str(c&&c.room,80)})):[],
    showPersonal:r.showPersonal!==false, onboarded:!!r.onboarded,
    lang:LANGS[r.lang]?r.lang:'', tz:str(r.tz,60),
    notif:{on:n.on!==false,tasks:n.tasks!==false,exams:n.exams!==false,personal:n.personal!==false,morning:validTime(n.morning)?n.morning:DEFAULT_NOTIF.morning,evening:validTime(n.evening)?n.evening:DEFAULT_NOTIF.evening},
    updatedAt:num(r.updatedAt,0)
  };
}
const itemList=()=>Object.values(S.items).filter(i=>!i.deleted);
const subj=id=>S.settings.subjects.find(s=>s.id===id)||null;
const subjColor=id=>(subj(id)||{}).color||'#9AA3B5';
const itemColor=it=>it.kind==='personal'?PERSONAL_COLOR:it.kind==='examen'?EXAM_COLOR:subjColor(it.subjectId);

/* --- persistencia en el dispositivo --- */
const kCache=()=>'deures:cache:'+(S.user?S.user.id:'x');
const kOut=()=>'deures:outbox:'+(S.user?S.user.id:'x');
function persistLocal(){
  const snap={settings:S.settings,items:S.items};
  if(S.mode==='cloud'){ LS.set(kCache(),snap); LS.set(kOut(),OUT); }
  else if(S.mode==='local') LS.set(K_LOCAL,snap);
}
let persistT=null; const persistSoon=()=>{clearTimeout(persistT);persistT=setTimeout(persistLocal,250);};
function loadSnap(snap){
  S.settings=cleanSettings(snap&&snap.settings); S.items={};
  if(snap&&snap.items) for(const [id,r] of Object.entries(snap.items)){ const it=cleanItem(r,id); if(it) S.items[it.id]=it; }
  applySettingsLang();
}
function applySettingsLang(){ if(S.settings.lang&&S.settings.lang!==LANG){ setLang(S.settings.lang); } }

/* --- API de guardado (optimista) --- */
function saveItem(it){
  it={...it,updatedAt:Date.now()}; S.items[it.id]=it; render();
  if(S.mode==='cloud'){ OUT.items[it.id]=it; flushSoon(); }
  persistSoon();
}
function removeItem(id){
  const it=S.items[id]; if(!it) return;
  if(S.mode==='cloud') saveItem({...it,deleted:true});
  else { delete S.items[id]; render(); persistSoon(); }
}
function saveSettings(patch){
  S.settings={...S.settings,...patch,updatedAt:Date.now()}; render();
  if(S.mode==='cloud'){ OUT.settings=S.settings; flushSoon(); }
  persistSoon();
}

/* ================= SUPABASE ================= */
const SB={client:null,channel:null,gen:0,retryT:null,flushT:null,flushing:false,backoff:2000};
function flushSoon(ms=400){ clearTimeout(SB.flushT); SB.flushT=setTimeout(flush,ms); }
async function flush(){
  if(S.mode!=='cloud'||!S.user||SB.flushing) return;
  const ids=Object.keys(OUT.items);
  if(!ids.length&&!OUT.settings){ S.pending=0; return; }
  SB.flushing=true;
  try{
    if(OUT.settings){
      const snap=OUT.settings;
      const {error}=await SB.client.from('settings').upsert({user_id:S.user.id,data:snap,updated_at:new Date(snap.updatedAt||Date.now()).toISOString()});
      if(error) throw error;
      if(OUT.settings===snap) OUT.settings=null;
    }
    for(let i=0;i<ids.length;i+=200){
      const chunk=ids.slice(i,i+200).filter(id=>OUT.items[id]).map(id=>{const it=OUT.items[id];return {id,user_id:S.user.id,data:it,updated_at:new Date(it.updatedAt).toISOString()};});
      if(!chunk.length) continue;
      const {error}=await SB.client.from('items').upsert(chunk);
      if(error) throw error;
      for(const r of chunk){ const cur=OUT.items[r.id]; if(cur&&cur.updatedAt===r.data.updatedAt) delete OUT.items[r.id]; }
    }
    S.syncErr=null; S.lastSync=Date.now(); SB.backoff=2000;
  }catch(e){
    S.syncErr=(e&&e.message)||'error'; SB.backoff=Math.min(SB.backoff*2,60000); flushSoon(SB.backoff);
  }finally{
    SB.flushing=false; S.pending=Object.keys(OUT.items).length+(OUT.settings?1:0); persistSoon(); render();
    if(S.pending&&!S.syncErr) flushSoon(50);
  }
}
async function fetchAll(){
  if(S.mode!=='cloud'||!S.user) return;
  const uidv=S.user.id;
  const st=await SB.client.from('settings').select('data,updated_at').eq('user_id',uidv).maybeSingle();
  if(st.error) throw st.error;
  const rows=[]; for(let from=0;;from+=1000){ const r=await SB.client.from('items').select('id,data,updated_at').eq('user_id',uidv).range(from,from+999); if(r.error) throw r.error; rows.push(...(r.data||[])); if(!r.data||r.data.length<1000) break; }
  if(!S.user||S.user.id!==uidv) return;
  if(!OUT.settings){
    if(st.data&&st.data.data){ S.settings=cleanSettings(st.data.data); applySettingsLang(); }
    else if(S.settings.updatedAt){ OUT.settings=S.settings; flushSoon(); } // aún no existe en la nube: sube lo local
  }
  const next={}; const old=[]; const cutoff=Date.now()-30*86400000;
  for(const r of rows){ const it=cleanItem(r.data,r.id); if(!it) continue; next[it.id]=it; if(it.deleted&&it.updatedAt<cutoff) old.push(it.id); }
  for(const [id,it] of Object.entries(OUT.items)) next[id]=it;
  S.items=next; S.ready=true; S.lastSync=Date.now(); S.syncErr=null; persistSoon(); render();
  if(old.length) SB.client.from('items').delete().in('id',old.slice(0,200)).then(()=>{},()=>{});
}
function applyRemoteItem(r){
  if(!r||!r.id||OUT.items[r.id]) return;
  const it=cleanItem(r.data,r.id); if(!it) return;
  const cur=S.items[r.id];
  if(!cur||it.updatedAt>=cur.updatedAt){ S.items[r.id]=it; persistSoon(); render(); }
}
function subscribe(){
  if(S.mode!=='cloud'||!S.user) return;
  const gen=++SB.gen; clearTimeout(SB.retryT);
  if(SB.channel){ try{SB.client.removeChannel(SB.channel);}catch(e){} SB.channel=null; }
  const u=S.user.id;
  SB.channel=SB.client.channel('deures-'+u)
    .on('postgres_changes',{event:'*',schema:'public',table:'items',filter:'user_id=eq.'+u},p=>{ if(gen===SB.gen) applyRemoteItem(p.new); })
    .on('postgres_changes',{event:'*',schema:'public',table:'settings',filter:'user_id=eq.'+u},p=>{
      if(gen!==SB.gen||OUT.settings||!p.new||!p.new.data) return;
      const st=cleanSettings(p.new.data); if(st.updatedAt>=(S.settings.updatedAt||0)){ S.settings=st; applySettingsLang(); persistSoon(); render(); }
    })
    .subscribe(status=>{
      if(gen!==SB.gen) return;
      if(status==='SUBSCRIBED'){ S.live=true; fetchAll().catch(()=>{}); flush(); }
      else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){ S.live=false; SB.retryT=setTimeout(()=>{ if(gen===SB.gen) subscribe(); },5000); }
      render();
    });
}
function startCloud(user){
  if(S.user&&S.user.id===user.id&&S.mode==='cloud') return;
  S.user=user; S.mode='cloud'; S.ready=false;
  loadSnap(LS.get(kCache())); OUT=LS.get(kOut())||{items:{},settings:null}; if(!OUT.items) OUT.items={};
  if(Object.keys(S.items).length||S.settings.updatedAt) S.ready=true;
  render();
  fetchAll().catch(()=>{ S.ready=true; render(); });
  subscribe(); flush();
  const tz=(Intl.DateTimeFormat().resolvedOptions().timeZone)||'Europe/Madrid';
  setTimeout(()=>{ if(S.mode==='cloud'&&(S.settings.tz!==tz||(!S.settings.lang))) saveSettings({tz,lang:S.settings.lang||LANG}); Push.refresh(); },1500);
}
function stopCloud(){
  SB.gen++; if(SB.channel){ try{SB.client.removeChannel(SB.channel);}catch(e){} SB.channel=null; }
  S.user=null; S.items={}; S.settings={...DEFAULT_SETTINGS}; OUT={items:{},settings:null}; S.live=false; S.ready=false;
}
function startLocal(){
  S.mode='local'; S.user=null; loadSnap(LS.get(K_LOCAL)); S.ready=true; render();
}
async function initStore(){
  if(!HAS_CLOUD||LS.get(K_MODE)==='local'){ startLocal(); return; }
  try{
    SB.client=window.supabase.createClient(CFG.supabaseUrl,CFG.supabaseKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    SB.client.auth.onAuthStateChange((ev,session)=>{
      if(ev==='SIGNED_OUT'){ stopCloud(); S.mode='auth'; render(); return; }
      if(ev==='PASSWORD_RECOVERY'){ AUTH.recovery=true; S.mode='auth'; render(); return; }
      if(session&&session.user) setTimeout(()=>startCloud(session.user),0);
    });
    const {data}=await SB.client.auth.getSession();
    if(data&&data.session) startCloud(data.session.user);
    else if(S.mode==='boot'){ S.mode='auth'; render(); }
  }catch(e){ startLocal(); }
}
window.addEventListener('online',()=>{ if(S.mode==='cloud'){ flush(); fetchAll().catch(()=>{}); if(!S.live) subscribe(); } });
document.addEventListener('visibilitychange',()=>{ if(!document.hidden&&S.mode==='cloud'){ fetchAll().catch(()=>{}); flush(); if(!S.live) subscribe(); } });

/* datos que quedaron en modo local en este navegador */
function localLeftovers(){
  if(S.mode!=='cloud'||!S.ready) return null;
  const loc=LS.get(K_LOCAL); if(!loc) return null;
  const n=Object.keys(loc.items||{}).length+((loc.settings&&loc.settings.subjects)||[]).length;
  return n?loc:null;
}
function importData(data,{merge=true}={}){
  if(!data||typeof data!=='object') throw new Error('bad');
  const st=cleanSettings(data.settings||{});
  if(merge){
    const subs=[...S.settings.subjects]; for(const s of st.subjects) if(!subs.find(x=>x.id===s.id||norm(x.name)===norm(s.name))) subs.push(s);
    const sch=[...S.settings.schedule]; for(const c of st.schedule) if(!sch.find(x=>x.id===c.id)) sch.push(c);
    saveSettings({subjects:subs,schedule:sch,name:S.settings.name||st.name,onboarded:true});
  } else saveSettings({...st,onboarded:true});
  let n=0; for(const [id,r] of Object.entries(data.items||{})){ const it=cleanItem(r,id); if(it&&!it.deleted&&!S.items[it.id]){ saveItem(it); n++; } }
  return n;
}
