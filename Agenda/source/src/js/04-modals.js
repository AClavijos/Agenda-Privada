/* ================= MODALES ================= */
let MODAL=null;
function openModal(m){ MODAL=m; renderModal(); }
function closeModal(){ MODAL=null; const el=$('#modal'); el.classList.remove('open'); el.innerHTML=''; }
function renderModal(){
  const el=$('#modal'); if(!MODAL){closeModal();return;}
  const keep=captureFocus(el);
  let body='';
  if(MODAL.type==='editor') body=editorHTML(MODAL);
  else if(MODAL.type==='class') body=classHTML(MODAL);
  else if(MODAL.type==='detail'){ const it=S.items[MODAL.id]; if(!it||it.deleted){closeModal();return;} body=detailHTML(it); }
  else if(MODAL.type==='more') body=moreHTML();
  el.innerHTML=`<div class="scrim" data-act="close"></div><div class="sheet" role="dialog" aria-modal="true"><div class="handle"></div>${body}</div>`;
  el.classList.add('open');
  restoreFocus(el,keep);
  if(MODAL.autofocus){ const f=el.querySelector('[data-autofocus]'); if(f&&!isMobile()) f.focus(); MODAL.autofocus=false; }
}

/* --- editor de deberes / exámenes / eventos --- */
function newDraft(kind='deber',date=''){
  return {type:'editor',id:null,kind,title:'',subjectId:'',date:date||(kind==='personal'?today():''),time:'',priority:'media',notes:'',steps:[],place:'',category:'Otro',grade:null,stepNew:'',showMore:false,err:'',autofocus:true};
}
function openEditor(opts={}){
  if(opts.id&&S.items[opts.id]){ const it=S.items[opts.id]; openModal({type:'editor',...JSON.parse(JSON.stringify(it)),stepNew:'',showMore:!!(it.notes||it.steps.length),err:'',autofocus:false}); }
  else openModal(newDraft(opts.kind,opts.date));
}
function nextWeekday(){ const td=today(), dw=dowMon(td); const target=dw<4?4:0; const n=((target-dw)+7)%7||7; return [L().wd[target],addDays(td,n)]; }
function editorHTML(e){
  const per=e.kind==='personal', td=today(), [nwl,nwd]=nextWeekday();
  const quick=[[t('Hoy'),td],[t('Mañana'),addDays(td,1)],[nwl,nwd]];
  const subs=S.settings.subjects;
  return `<div class="sheet-h"><h2>${e.id?t('Editar'):t('Nuevo')}</h2><button class="sec" data-act="close">${t('Cancelar')}</button></div>
  <div class="seg full">${Object.keys(KINDS).map(k=>`<button class="${e.kind===k?'on '+(k==='personal'?'pers':''):''}" data-act="ed-kind" data-v="${k}">${kindName(k)}</button>`).join('')}</div>
  <input class="title-in" data-in="ed-title" data-focus="ed-title" data-autofocus placeholder="${per?t('¿Qué tienes? (p. ej. Dentista)'):e.kind==='examen'?t('¿De qué es el examen?'):t('¿Qué tienes que hacer?')}" value="${esc(e.title)}" maxlength="300">
  ${e.err?`<div class="err">${esc(e.err)}</div>`:''}
  ${per?`<div class="field"><span class="lbl">${t('Categoría')}</span><div class="wrap">${Object.keys(CATS).map(c=>`<button class="chip ${e.category===c?'on':''}" style="--c:${CATS[c]}" data-act="ed-cat" data-v="${c}"><i></i><em>${catName(c)}</em></button>`).join('')}</div></div>`
   :`<div class="field"><span class="lbl">${t('Asignatura')}</span>${subs.length?`<div class="wrap">${subs.map(s=>`<button class="chip ${e.subjectId===s.id?'on':''}" style="--c:${s.color}" data-act="ed-subj" data-v="${s.id}"><i></i><em>${esc(s.name)}</em></button>`).join('')}</div>`:`<div class="empty">${t('Aún no tienes asignaturas.')} <a class="link" href="#ajustes" data-act="close">${t('Añádelas en Ajustes')}</a></div>`}</div>`}
  <div class="field"><span class="lbl">${per?t('Fecha'):e.kind==='examen'?t('Fecha del examen'):t('Fecha de entrega')}</span>
    <div class="quick">${quick.map(([l,d])=>`<button class="${e.date===d?'on':''}" data-act="ed-date" data-v="${d}">${l}</button>`).join('')}<button class="${!e.date?'on':''}" data-act="ed-date" data-v="">${t('Sin fecha')}</button></div>
    <div class="two"><input type="date" data-in="ed-date" value="${e.date}" aria-label="${t('Fecha')}"><input type="time" data-in="ed-time" value="${e.time}" aria-label="${t('Hora')}"></div></div>
  ${per?`<div class="field"><span class="lbl">${t('Lugar (opcional)')}</span><input data-in="ed-place" data-focus="ed-place" placeholder="${t('Dónde')}" value="${esc(e.place)}"></div>`
   :`<div class="field"><span class="lbl">${t('Prioridad')}</span><div class="seg full">${Object.keys(PRIOS).map(p=>`<button class="${e.priority===p?'on '+p:''}" data-act="ed-prio" data-v="${p}">${prioName(p)}</button>`).join('')}</div></div>`}
  ${e.kind==='examen'&&e.date&&e.date<=td?`<div class="field"><span class="lbl">${t('Nota')}</span><input type="text" inputmode="decimal" data-in="ed-grade" value="${e.grade===null?'':String(e.grade).replace('.',LANG==='en'?'.':',')}" placeholder="${t('Sin nota todavía')}" style="max-width:160px"></div>`:''}
  ${e.showMore?`<div class="field"><span class="lbl">${t('Notas')}</span><textarea data-in="ed-notes" data-focus="ed-notes" placeholder="${t('Apuntes, enlaces…')}">${esc(e.notes)}</textarea></div>
    ${per?'':`<div class="field"><span class="lbl">${e.kind==='examen'?t('Temas a repasar'):t('Pasos')}</span><div class="steps">${e.steps.map(s=>`<div class="step"><span>${esc(s.text)}</span><button class="x" style="opacity:1" data-act="ed-step-del" data-s="${s.id}">${ic('x','s14')}</button></div>`).join('')}<label class="add-step">${ic('plus','s16')}<input data-in="ed-step" data-focus="ed-step" placeholder="${e.kind==='examen'?t('Añadir tema (Enter)'):t('Añadir paso (Enter)')}" value="${esc(e.stepNew)}"></label></div></div>`}`
   :`<button class="add-step" style="align-self:flex-start" data-act="ed-more">${ic('plus','s16')}<span style="font-weight:500">${per?t('Añadir notas'):t('Añadir pasos o notas')}</span></button>`}
  <div class="d-acts"><button class="btn ${per?'pers':''}" data-act="ed-save">${ic('check','s18')}${t('Guardar')}</button>${e.id?`<button class="btn danger" data-act="del" data-id="${e.id}">${t('Eliminar')}</button>`:''}</div>`;
}
function saveEditor(){
  const e=MODAL; if(!e) return;
  const title=e.title.trim(); if(!title){ e.err=t('Ponle un título'); renderModal(); return; }
  if(e.stepNew.trim()) e.steps.push({id:uid(),text:e.stepNew.trim(),done:false});
  const old=e.id?S.items[e.id]:null;
  const it=cleanItem({...(old||{}),...e,title,id:e.id||uid(),createdAt:old?old.createdAt:Date.now()});
  if(it.kind==='personal'){ it.subjectId=''; it.steps=[]; }
  saveItem(it); closeModal();
  toast(old?t('Cambios guardados'):t('Guardado'));
  if(!old&&UI.view==='deberes'&&!isMobile()&&isTask(it)) UI.sel=it.id;
}

/* --- clases del horario --- */
function openClass(opts={}){
  if(opts.id){ const c=S.settings.schedule.find(x=>x.id===opts.id); if(c) return openModal({type:'class',...c,err:''}); }
  const st=opts.start||'15:00';
  openModal({type:'class',id:null,day:opts.day??UI.schedDay,start:st,end:opts.end||fromMin(Math.min(toMin(st)+115,23*60+59)),subjectId:'',room:'',err:''});
}
function classHTML(c){
  const subs=S.settings.subjects;
  return `<div class="sheet-h"><h2>${c.id?t('Editar clase'):t('Nueva clase')}</h2><button class="sec" data-act="close">${t('Cancelar')}</button></div>
  <div class="field"><span class="lbl">${t('Día')}</span><div class="seg full">${L().wds.slice(0,6).map((d,i)=>`<button class="${c.day===i?'on acc':''}" data-act="cl-day" data-v="${i}">${d}</button>`).join('')}</div></div>
  <div class="two"><div class="field"><span class="lbl">${t('Empieza')}</span><input type="time" data-in="cl-start" value="${c.start}"></div><div class="field"><span class="lbl">${t('Acaba')}</span><input type="time" data-in="cl-end" value="${c.end}"></div></div>
  <div class="field"><span class="lbl">${t('Asignatura')}</span>${subs.length?`<div class="wrap">${subs.map(s=>`<button class="chip ${c.subjectId===s.id?'on':''}" style="--c:${s.color}" data-act="cl-subj" data-v="${s.id}"><i></i><em>${esc(s.name)}</em></button>`).join('')}</div>`:`<div class="empty">${t('Primero añade asignaturas en')} <a class="link" href="#ajustes" data-act="close">${t('Ajustes')}</a>.</div>`}</div>
  <div class="field"><span class="lbl">${t('Aula (opcional)')}</span><input data-in="cl-room" data-focus="cl-room" placeholder="${t('p. ej. Taller 2')}" value="${esc(c.room)}"></div>
  ${c.err?`<div class="err">${esc(c.err)}</div>`:''}
  <div class="d-acts"><button class="btn" data-act="cl-save">${ic('check','s18')}${t('Guardar')}</button>${c.id?`<button class="btn danger" data-act="cl-del">${t('Eliminar')}</button>`:''}</div>`;
}
function saveClass(){
  const c=MODAL; if(!c.subjectId){c.err=t('Elige la asignatura');return renderModal();}
  if(!validTime(c.start)||!validTime(c.end)||toMin(c.end)<=toMin(c.start)){c.err=t('La hora de fin tiene que ser después del inicio');return renderModal();}
  const sch=[...S.settings.schedule]; const rec={id:c.id||uid(),day:c.day,start:c.start,end:c.end,subjectId:c.subjectId,room:c.room.trim()};
  const i=sch.findIndex(x=>x.id===rec.id); if(i>=0) sch[i]=rec; else sch.push(rec);
  saveSettings({schedule:sch}); closeModal(); toast(c.id?t('Clase actualizada'):t('Clase añadida'));
}

/* --- menú "Más" (móvil) --- */
function moreHTML(){
  const it=(v,icn,l,cls='')=>`<a class="nav ${cls} ${UI.view===v?'on':''}" href="#${v}" data-act="close">${ic(icn)}${l}</a>`;
  const si=syncInfo();
  return `<div class="sheet-h"><h2>${t('Más')}</h2><button class="sec" data-act="close">${t('Cerrar')}</button></div>${it('horario','clock',t('Horario'))}${it('personal','user',t('Mi calendario'),'pers')}${it('ajustes','sliders',t('Ajustes'))}<div class="sync ${si.cls}" style="margin-top:8px">${ic(si.icon,'s18')}<div><b>${si.label}</b><small>${si.hint}</small></div></div>`;
}

/* ================= TOAST ================= */
function toast(msg,undo){
  const box=$('#toast'); const el=document.createElement('div'); el.className='toast';
  el.innerHTML=`<span>${esc(msg)}</span>${undo?`<button>${t('Deshacer')}</button>`:''}`;
  if(undo) el.querySelector('button').onclick=()=>{undo();el.remove();};
  box.appendChild(el); while(box.children.length>3) box.firstChild.remove();
  setTimeout(()=>el.remove(),undo?6000:2600);
}
