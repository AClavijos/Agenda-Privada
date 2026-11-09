/* ================= RENDER ================= */
function syncInfo(){
  if(S.mode==='cloud'){
    if(S.pending&&!S.live) return {cls:'warn',icon:'cloudoff',label:t('Sin conexión'),hint:tn(S.pending,'{n} cambio pendiente','{n} cambios pendientes')};
    if(S.live) return {cls:'ok',icon:'cloud',label:t('Sincronizado'),hint:t('En tiempo real')};
    return {cls:'load',icon:'cloud',label:t('Conectando…'),hint:t('Puedes seguir usándola')};
  }
  if(S.mode==='local') return {cls:'warn',icon:'device',label:t('Solo este dispositivo'),hint:t('Sin cuenta')};
  return {cls:'load',icon:'cloud',label:t('Cargando…'),hint:''};
}
function captureFocus(root){
  const a=document.activeElement; if(!a||!root.contains(a)||!a.dataset||!a.dataset.focus) return null;
  return {key:a.dataset.focus,value:a.value,s:a.selectionStart,e:a.selectionEnd};
}
function restoreFocus(root,k){
  if(!k) return; const el=root.querySelector(`[data-focus="${CSS.escape(k.key)}"]`); if(!el) return;
  if(el.value!==k.value) el.value=k.value;
  el.focus({preventScroll:true}); try{ if(k.s!=null) el.setSelectionRange(k.s,k.e);}catch(e){}
}
let rq=false;
function render(){ if(rq) return; rq=true; requestAnimationFrame(()=>{rq=false;doRender();}); }
function doRender(){
  const authMode=S.mode==='auth'||S.mode==='boot';
  document.body.classList.toggle('authing',authMode);
  const main=$('#main'); const keep=captureFocus(main); const st=main.scrollTop;
  if(authMode){
    $('#sidebar').innerHTML=''; $('#bottom').innerHTML='';
    main.innerHTML=S.mode==='boot'?loading():viewAuth(); restoreFocus(main,keep); return;
  }
  const pend=pendingTasks().length, up=upcomingExams().length;
  const nav=(v,icn,l,badge,cls='')=>`<a class="nav ${cls} ${UI.view===v?'on':''}" href="#${v}">${ic(icn)}${l}${badge?`<span class="badge">${badge}</span>`:''}</a>`;
  const si=syncInfo();
  $('#sidebar').innerHTML=`<div class="logo"><div class="mark">${ic('book','s18')}</div><div><b>Deures</b><small>${t('Agenda de clase')}</small></div></div>
    <div class="cap nav-cap">${t('Clase')}</div>${nav('hoy','home',t('Hoy'))}${nav('deberes','tasks',t('Deberes'),pend)}${nav('examenes','exam',t('Exámenes'),up)}${nav('calendario','calendar',t('Calendario'))}${nav('horario','clock',t('Horario'))}
    <div class="cap nav-cap">${t('Personal')}</div>${nav('personal','user',t('Mi calendario'),'','pers')}
    <div class="sync ${si.cls}">${ic(si.icon,'s18')}<div><b>${si.label}</b><small>${si.hint}</small></div></div>${nav('ajustes','sliders',t('Ajustes'))}`;
  const V={hoy:viewHoy,deberes:viewDeberes,examenes:viewExamenes,calendario:viewCalendario,horario:viewHorario,personal:viewPersonal,ajustes:viewAjustes}[UI.view]||viewHoy;
  main.innerHTML=(!S.ready&&UI.view!=='ajustes')?loading():V();
  main.scrollTop=st; restoreFocus(main,keep);
  const bn=(v,icn,l)=>`<button class="${UI.view===v||(v==='more'&&['horario','personal','ajustes'].includes(UI.view))?'on':''}" data-act="${v==='more'?'more':'go'}" data-v="${v}">${ic(icn)}${l}</button>`;
  $('#bottom').innerHTML=bn('hoy','home',t('Hoy'))+bn('deberes','tasks',t('Deberes'))+bn('examenes','exam',t('Exámenes'))+bn('calendario','calendar',t('Calendario'))+bn('more','more',t('Más'));
  const fab=$('#fab'); fab.classList.toggle('pers',UI.view==='personal'); fab.classList.toggle('hide',UI.view==='ajustes');
  if(MODAL&&MODAL.type==='detail') renderModal();
}

/* ================= NAVEGACIÓN ================= */
const VIEW_TITLES={hoy:'Hoy',deberes:'Deberes',examenes:'Exámenes',calendario:'Calendario',horario:'Horario',personal:'Mi calendario',ajustes:'Ajustes'};
function route(){
  let h=location.hash.replace('#','');
  if(h==='nuevo'){ history.replaceState(null,'','#deberes'); h='deberes'; setTimeout(()=>{ if(S.mode==='cloud'||S.mode==='local') openEditor({kind:'deber'}); },300); }
  UI.view=VIEWS.includes(h)?h:'hoy';
  if(UI.view!=='deberes') UI.q='';
  document.title=`Deures · ${t(VIEW_TITLES[UI.view])}`;
  $('#main').scrollTop=0; window.scrollTo(0,0); render();
}
const go=v=>{ if(location.hash==='#'+v) route(); else location.hash=v; };

/* ================= ACCIONES ================= */
function newByView(date){
  if(S.mode!=='cloud'&&S.mode!=='local') return;
  if(UI.view==='horario') return openClass({});
  const kind=UI.view==='examenes'?'examen':UI.view==='personal'?'personal':'deber';
  openEditor({kind,date:date||(UI.view==='calendario'?UI.calSel:'')});
}
function toggleDone(id){
  const it=S.items[id]; if(!it) return; const was=it.done;
  saveItem({...it,done:!was,doneAt:!was?Date.now():null});
  if(!was) toast(t('¡Hecho!'),()=>{const cur=S.items[id]; if(cur) saveItem({...cur,done:false,doneAt:null});});
}
function delItem(id){
  const it=S.items[id]; if(!it) return; const copy=JSON.parse(JSON.stringify(it));
  removeItem(id); if(UI.sel===id) UI.sel=null; if(MODAL) closeModal();
  toast(t('Eliminado'),()=>saveItem({...copy,deleted:false}));
}
function patchItem(id,patch){ const it=S.items[id]; if(it) saveItem({...it,...patch}); }
function addSubject(name){
  name=(name||'').trim(); if(!name) return; const subs=S.settings.subjects;
  if(subs.find(s=>norm(s.name)===norm(name))) return toast(t('Esa asignatura ya existe'));
  const used=new Set(subs.map(s=>s.color)); const color=PALETTE.find(c=>!used.has(c))||PALETTE[subs.length%PALETTE.length];
  UI.subjNew=''; saveSettings({subjects:[...subs,{id:uid(),name,color}],onboarded:true});
}
const ACT={
  go:el=>go(el.dataset.v),
  new:()=>newByView(),
  'new-on':el=>{ const d=el.dataset.d||''; openEditor({kind:UI.view==='personal'?'personal':'deber',date:d}); },
  open:el=>{ const id=el.dataset.id; if(UI.view==='deberes'&&!isMobile()){ UI.sel=id; render(); } else openModal({type:'detail',id}); },
  edit:el=>openEditor({id:el.dataset.id}),
  toggle:el=>toggleDone(el.dataset.id),
  del:el=>delItem(el.dataset.id),
  close:()=>closeModal(),
  more:()=>openModal({type:'more'}),
  'set-prio':el=>patchItem(el.dataset.id,{priority:el.dataset.v}),
  'set-kind':el=>patchItem(el.dataset.id,{kind:el.dataset.v}),
  step:el=>{const it=S.items[el.dataset.id]; if(!it) return; patchItem(it.id,{steps:it.steps.map(s=>s.id===el.dataset.s?{...s,done:!s.done}:s)});},
  'step-del':el=>{const it=S.items[el.dataset.id]; if(!it) return; patchItem(it.id,{steps:it.steps.filter(s=>s.id!==el.dataset.s)});},
  dfilter:el=>{UI.dFilter=el.dataset.v; saveUI(); render();},
  subjf:el=>{UI.subjF=el.dataset.v; render();},
  'cal-m':el=>{UI.calMonth=shiftMonth(UI.calMonth,Number(el.dataset.v)); render();},
  'cal-today':()=>{UI.calMonth=today().slice(0,7); UI.calSel=today(); render();},
  'cal-sel':el=>{const d=el.dataset.d; if(UI.calSel===d&&!isMobile()) return newByView(d); UI.calSel=d; if(!d.startsWith(UI.calMonth)) UI.calMonth=d.slice(0,7); render();},
  'toggle-pers':()=>saveSettings({showPersonal:!S.settings.showPersonal}),
  'pers-m':el=>{UI.persMonth=shiftMonth(UI.persMonth,Number(el.dataset.v)); render();},
  'pers-sel':el=>{const d=el.dataset.d; UI.persSel=(d&&UI.persSel!==d)?d:null; render();},
  'pers-past':()=>{UI.persPast=!UI.persPast; render();},
  'sched-day':el=>{UI.schedDay=Number(el.dataset.v); render();},
  'new-class':el=>openClass({day:el.dataset.day!=null?Number(el.dataset.day):undefined}),
  'edit-class':el=>openClass({id:el.dataset.id}),
  slot:(el,ev)=>{ if(ev.target!==el) return; const r=el.getBoundingClientRect(); const m=Number(el.dataset.min)+Math.floor(((ev.clientY-r.top)/Number(el.dataset.hh))*2)*30; openClass({day:Number(el.dataset.day),start:fromMin(m)}); },
  'ed-kind':el=>{MODAL.kind=el.dataset.v; if(MODAL.kind==='personal'&&!MODAL.date) MODAL.date=today(); renderModal();},
  'ed-subj':el=>{MODAL.subjectId=MODAL.subjectId===el.dataset.v?'':el.dataset.v; renderModal();},
  'ed-cat':el=>{MODAL.category=el.dataset.v; renderModal();},
  'ed-date':el=>{MODAL.date=el.dataset.v; renderModal();},
  'ed-prio':el=>{MODAL.priority=el.dataset.v; renderModal();},
  'ed-more':()=>{MODAL.showMore=true; renderModal(); const f=$('#modal [data-focus="ed-notes"]'); if(f) f.focus();},
  'ed-step-del':el=>{MODAL.steps=MODAL.steps.filter(s=>s.id!==el.dataset.s); renderModal();},
  'ed-save':()=>saveEditor(),
  'cl-day':el=>{MODAL.day=Number(el.dataset.v); renderModal();},
  'cl-subj':el=>{MODAL.subjectId=el.dataset.v; MODAL.err=''; renderModal();},
  'cl-save':()=>saveClass(),
  'cl-del':()=>{const id=MODAL.id; const old=S.settings.schedule; saveSettings({schedule:old.filter(c=>c.id!==id)}); closeModal(); toast(t('Clase eliminada'),()=>saveSettings({schedule:old}));},
  'subj-color':el=>{const subs=S.settings.subjects.map(s=>s.id===el.dataset.id?{...s,color:PALETTE[(PALETTE.indexOf(s.color)+1)%PALETTE.length]}:s); saveSettings({subjects:subs});},
  'subj-del':el=>{const old=S.settings.subjects; const s=old.find(x=>x.id===el.dataset.id); saveSettings({subjects:old.filter(x=>x.id!==el.dataset.id)}); toast(t('“{s}” eliminada',{s:s?s.name:''}),()=>saveSettings({subjects:old}));},
  'subj-add':()=>addSubject(UI.subjNew),
  'subj-sugg':el=>addSubject(el.dataset.n),
  export:async()=>{ const txt=JSON.stringify({app:'deures',v:2,exportedAt:new Date().toISOString(),settings:S.settings,items:Object.fromEntries(itemList().map(i=>[i.id,i]))}); try{ await navigator.clipboard.writeText(txt); toast(t('Copiado. Pégalo en una nota o un archivo para guardarlo.')); }catch(e){ UI.importTxt=txt; UI.importMsg=t('No se pudo copiar automáticamente: selecciona el texto de abajo y cópialo.'); UI.importErr=false; render(); } },
  import:()=>{ try{ const n=importData(JSON.parse(UI.importTxt||'')); UI.importTxt=''; UI.importMsg=t('Importado: {n} elementos nuevos.',{n}); UI.importErr=false; }catch(e){ UI.importMsg=t('Ese texto no es una copia válida.'); UI.importErr=true; } render(); },
  migrate:()=>{ const loc=LS.get(K_LOCAL); try{ const n=importData(loc); LS.set(K_LOCAL,null); toast(t('Subidos {n} elementos a tu cuenta',{n}));}catch(e){toast(t('No se pudieron subir los datos'));} render(); },
  'dismiss-migrate':()=>{ LS.set(K_LOCAL,null); render(); },
  'onb-toggle':el=>{const n=el.dataset.n; UI.onb.has(n)?UI.onb.delete(n):UI.onb.add(n); render();},
  'onb-add':()=>{const n=(UI.onbNew||'').trim(); if(!n) return; if(!UI.onbCustom.includes(n)&&!SUGGESTED.includes(n)) UI.onbCustom.push(n); UI.onb.add(n); UI.onbNew=''; render();},
  'onb-save':()=>{ const all=[...SUGGESTED,...UI.onbCustom]; const subs=all.filter(n=>UI.onb.has(n)).map(n=>({id:uid(),name:n,color:PALETTE[all.indexOf(n)%PALETTE.length]})); saveSettings({name:(UI.onbName||'').trim()||S.settings.name,subjects:[...S.settings.subjects,...subs],onboarded:true,lang:LANG}); toast(t('¡Listo! Ahora añade tu horario o tu primer deber')); },
  'onb-skip':()=>saveSettings({onboarded:true,lang:LANG}),
  // idioma
  lang:el=>{ setLang(el.dataset.v); if(S.mode==='cloud'||S.mode==='local') saveSettings({lang:LANG}); if(S.mode==='cloud') Push.refresh(); route(); if(MODAL) renderModal(); },
  // avisos
  'push-on':()=>{ LS.set('deures:pushask',1); Push.enable(); },
  'push-later':()=>{ LS.set('deures:pushask',1); render(); },
  'push-off':()=>Push.disable(),
  'push-test':()=>Push.test(),
  'notif-toggle':el=>{ const k=el.dataset.k; saveSettings({notif:{...S.settings.notif,[k]:!S.settings.notif[k]}}); },
  install:async()=>{ if(!installEvt) return; installEvt.prompt(); try{ await installEvt.userChoice; }catch(e){} installEvt=null; render(); },
  // cuenta
  logout:async()=>{ try{ const sub=await Promise.race([Push.current(),new Promise(r=>setTimeout(()=>r(null),2500))]); if(sub){ await SB.client.from('push_subscriptions').delete().eq('endpoint',sub.endpoint); await sub.unsubscribe(); } }catch(e){} Push.sub=null; await SB.client.auth.signOut(); },
  'go-login':()=>{ LS.set(K_MODE,null); location.reload(); },
  'au-go':()=>authGo(),
  'au-switch':()=>{ AUTH.mode=AUTH.mode==='login'?'signup':'login'; AUTH.err=''; AUTH.msg=''; render(); },
  'au-local':()=>{ LS.set(K_MODE,'local'); startLocal(); route(); },
  'au-forgot':async()=>{ const email=AUTH.email.trim(); if(!/^\S+@\S+\.\S+$/.test(email)){ AUTH.err=t('Escribe tu correo arriba y vuelve a pulsar.'); return render(); } AUTH.busy=true; render(); const {error}=await SB.client.auth.resetPasswordForEmail(email,{redirectTo:siteUrl()}); AUTH.busy=false; AUTH.err=error?authErr(error):''; AUTH.msg=error?'':t('Te hemos enviado un correo para cambiar la contraseña.'); render(); },
  'au-newpass':async()=>{ if(AUTH.pass.length<6){ AUTH.err=t('La contraseña necesita al menos 6 caracteres.'); return render(); } AUTH.busy=true; render(); const {error}=await SB.client.auth.updateUser({password:AUTH.pass}); AUTH.busy=false; if(error){ AUTH.err=authErr(error); render(); } else { AUTH.recovery=false; AUTH.pass=''; toast(t('Contraseña cambiada')); const {data}=await SB.client.auth.getSession(); if(data.session) startCloud(data.session.user); } }
};

/* --- entradas de texto --- */
const debT={};
const deb=(k,fn,ms=600)=>{clearTimeout(debT[k]); debT[k]=setTimeout(fn,ms);};
const parseGrade=v=>{ v=String(v).trim().replace(',','.'); if(v==='') return null; const n=Number(v); return isFinite(n)?clamp(n,0,10):undefined; };
const IN={
  q:el=>{UI.q=el.value; if(UI.view!=='deberes'&&UI.q){ UI.view='deberes'; history.replaceState(null,'','#deberes'); } render();},
  notes:el=>{const id=el.dataset.id; deb('n'+id,()=>patchItem(id,{notes:el.value}),700);},
  grade:el=>{const g=parseGrade(el.value); if(g===undefined) return; const id=el.dataset.id; deb('g'+id,()=>patchItem(id,{grade:g}));},
  name:el=>deb('name',()=>saveSettings({name:el.value.slice(0,60)})),
  'subj-name':el=>{const id=el.dataset.id; deb('s'+id,()=>{ const v=el.value.trim(); if(!v) return; saveSettings({subjects:S.settings.subjects.map(s=>s.id===id?{...s,name:v}:s)}); });},
  'subj-new':el=>{UI.subjNew=el.value;},
  import:el=>{UI.importTxt=el.value;},
  'onb-name':el=>{UI.onbName=el.value;},
  'onb-new':el=>{UI.onbNew=el.value;},
  'notif-morning':el=>{ if(validTime(el.value)) deb('nm',()=>saveSettings({notif:{...S.settings.notif,morning:el.value}})); },
  'notif-evening':el=>{ if(validTime(el.value)) deb('ne',()=>saveSettings({notif:{...S.settings.notif,evening:el.value}})); },
  'au-email':el=>{AUTH.email=el.value;}, 'au-pass':el=>{AUTH.pass=el.value;}, 'au-pass2':el=>{AUTH.pass2=el.value;},
  'ed-title':el=>{MODAL.title=el.value;},
  'ed-date':el=>{MODAL.date=el.value; renderModal();},
  'ed-time':el=>{MODAL.time=el.value;},
  'ed-place':el=>{MODAL.place=el.value;},
  'ed-notes':el=>{MODAL.notes=el.value;},
  'ed-step':el=>{MODAL.stepNew=el.value;},
  'ed-grade':el=>{const g=parseGrade(el.value); if(g!==undefined) MODAL.grade=g;},
  'step-new':()=>{},
  'cl-start':el=>{MODAL.start=el.value;}, 'cl-end':el=>{MODAL.end=el.value;}, 'cl-room':el=>{MODAL.room=el.value;}
};
const ENTER={
  'step-new':el=>{const it=S.items[el.dataset.id]; const v=el.value.trim(); if(!it||!v) return; el.value=''; patchItem(it.id,{steps:[...it.steps,{id:uid(),text:v,done:false}]});},
  'ed-step':el=>{const v=el.value.trim(); if(!v) return; MODAL.steps.push({id:uid(),text:v,done:false}); MODAL.stepNew=''; renderModal(); const f=$('#modal [data-focus="ed-step"]'); if(f) f.focus();},
  'ed-title':()=>saveEditor(),
  'subj-new':()=>addSubject(UI.subjNew),
  'onb-new':()=>ACT['onb-add'](),
  'cl-room':()=>saveClass(),
  'au-email':()=>{ const p=$('[data-in="au-pass"]'); if(p) p.focus(); },
  'au-pass':()=>AUTH.recovery?ACT['au-newpass']():AUTH.mode==='signup'?$('[data-in="au-pass2"]').focus():authGo(),
  'au-pass2':()=>authGo()
};

/* ================= EVENTOS ================= */
document.addEventListener('click',ev=>{
  const el=ev.target.closest('[data-act]'); if(!el) return;
  const a=el.dataset.act; if(!ACT[a]) return;
  if(a==='close'&&el.tagName==='A'){ closeModal(); return; }
  if(el.tagName==='A') ev.preventDefault();
  ACT[a](el,ev);
});
document.addEventListener('input',ev=>{ const el=ev.target; const k=el.dataset&&el.dataset.in; if(k&&IN[k]) IN[k](el); });
document.addEventListener('change',ev=>{ const el=ev.target; const k=el.dataset&&el.dataset.in; if(!k) return; if(k==='notes'){ clearTimeout(debT['n'+el.dataset.id]); patchItem(el.dataset.id,{notes:el.value}); } else if((el.type==='time'||el.type==='date')&&IN[k]) IN[k](el); });
document.addEventListener('keydown',ev=>{
  const el=ev.target;
  if(ev.key==='Enter'&&!ev.shiftKey&&el.dataset&&ENTER[el.dataset.in]&&el.tagName==='INPUT'){ ev.preventDefault(); ENTER[el.dataset.in](el); return; }
  if(ev.key==='Escape'&&MODAL){ closeModal(); return; }
  if((ev.key==='Enter'||ev.key===' ')&&el.getAttribute&&el.getAttribute('role')==='button'&&el.dataset.act){ ev.preventDefault(); el.click(); return; }
  if(ev.key==='n'&&!MODAL&&!['INPUT','TEXTAREA','SELECT'].includes(el.tagName)&&!ev.ctrlKey&&!ev.metaKey&&!ev.altKey){ ev.preventDefault(); newByView(); }
});
window.addEventListener('hashchange',route);
let lastW=window.innerWidth; window.addEventListener('resize',()=>{ if((lastW<900)!==(window.innerWidth<900)) render(); lastW=window.innerWidth; });
setInterval(()=>{ if(!document.hidden&&!(document.activeElement&&['INPUT','TEXTAREA'].includes(document.activeElement.tagName))) render(); },60000);

/* ================= SERVICE WORKER ================= */
if('serviceWorker' in navigator&&location.protocol!=='file:'){
  navigator.serviceWorker.register('./sw.js').then(()=>Push.current().then(()=>render())).catch(()=>{});
  navigator.serviceWorker.addEventListener('message',e=>{ const d=e.data||{}; if(d.type==='nav'&&d.hash){ location.hash=d.hash; } });
  let reloading=false; navigator.serviceWorker.addEventListener('controllerchange',()=>{ if(reloading||!LS.get('deures:swready')) { LS.set('deures:swready',1); return; } reloading=true; if(!MODAL) location.reload(); });
}

/* ================= INICIO ================= */
$('#fab').innerHTML=ic('plus','s24');
$('#fab').addEventListener('click',()=>newByView());
route();
initStore();
