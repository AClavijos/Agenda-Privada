/* ================= ESTADO DE LA INTERFAZ ================= */
const savedUI=LS.get(K_UI)||{};
const UI={view:'hoy',sel:null,dFilter:savedUI.dFilter||'pendientes',subjF:'all',q:'',calMonth:today().slice(0,7),calSel:today(),persMonth:today().slice(0,7),persSel:null,persPast:false,schedDay:Math.min(dowMon(today()),4),onb:new Set(),onbCustom:[]};
const saveUI=()=>LS.set(K_UI,{dFilter:UI.dFilter});

/* ================= CONSULTAS ================= */
const isTask=it=>it.kind==='deber'||it.kind==='entrega';
const sortByDue=(a,b)=>(a.date||'9999').localeCompare(b.date||'9999')||(a.time||'99').localeCompare(b.time||'99')||a.createdAt-b.createdAt;
const pendingTasks=()=>itemList().filter(it=>isTask(it)&&!it.done).sort(sortByDue);
const exams=()=>itemList().filter(it=>it.kind==='examen').sort(sortByDue);
const upcomingExams=()=>exams().filter(e=>!e.date||e.date>=today());
const pastExams=()=>exams().filter(e=>e.date&&e.date<today()).reverse();
const personal=()=>itemList().filter(it=>it.kind==='personal').sort(sortByDue);
const onDate=(d,withPersonal=true)=>itemList().filter(it=>it.date===d&&(withPersonal||it.kind!=='personal')).sort((a,b)=>(a.time||'99').localeCompare(b.time||'99'));
const classesOn=dw=>S.settings.schedule.filter(c=>c.day===dw).sort((a,b)=>a.start.localeCompare(b.start));
const doneInWeek=ws=>itemList().filter(it=>isTask(it)&&it.done&&it.doneAt&&ymd(new Date(it.doneAt))>=ws&&ymd(new Date(it.doneAt))<=addDays(ws,6)).length;
function groupTasks(list){
  const td=today(), endW=addDays(weekStart(td),6), endNW=addDays(endW,7);
  const G=[[t('Vencidos'),[],'red'],[t('Hoy'),[]],[t('Mañana'),[]],[t('Esta semana'),[]],[t('Próxima semana'),[]],[t('Más adelante'),[]],[t('Sin fecha'),[]]];
  for(const it of list){
    if(!it.date) G[6][1].push(it);
    else if(it.date<td) G[0][1].push(it);
    else if(it.date===td) G[1][1].push(it);
    else if(it.date===addDays(td,1)) G[2][1].push(it);
    else if(it.date<=endW) G[3][1].push(it);
    else if(it.date<=endNW) G[4][1].push(it);
    else G[5][1].push(it);
  }
  return G.filter(g=>g[1].length);
}

/* ================= PIEZAS ================= */
const chip=id=>{const s=subj(id);return s?`<span class="chip" style="--c:${s.color}"><i></i><em>${esc(s.name)}</em></span>`:'';};
const catChip=c=>`<span class="chip" style="--c:${CATS[c]||'#9AA3B5'}"><i></i><em>${esc(catName(c))}</em></span>`;
const stepsTxt=it=>it.steps.length?`${it.steps.filter(s=>s.done).length}/${it.steps.length} ${it.kind==='examen'?t('temas'):t('pasos')}`:'';
function dueLabel(it){
  if(!it.date) return `<span class="m">${t('Sin fecha')}</span>`;
  const over=!it.done&&it.date<today();
  return `<span class="m ${over?'over':''}">${ic('calendar','s14')}${relDay(it.date)}${it.time?' · '+it.time:''}</span>`;
}
function taskRow(it,opts={}){
  const sel=UI.view==='deberes'&&UI.sel===it.id&&!isMobile();
  return `<div class="task ${it.done?'done':''} ${sel?'sel':''}" data-act="open" data-id="${it.id}" role="button" tabindex="0">
    <button class="cb ${it.done?'on':''}" data-act="toggle" data-id="${it.id}" aria-label="${it.done?t('Marcar como pendiente'):t('Marcar como hecho')}">${it.done?ic('check','s14'):''}</button>
    <div class="t-body"><div class="t-title">${esc(it.title||t('(sin título)'))}</div>
      <div class="t-meta">${opts.kindTag||it.kind==='examen'?`<span class="kind ${it.kind}">${kindName(it.kind).toUpperCase()}</span>`:''}${chip(it.subjectId)}${dueLabel(it)}${it.steps.length?`<span class="m st">${ic('steps','s14')}${stepsTxt(it)}</span>`:''}</div></div>
    ${it.kind!=='personal'?`<span class="flag ${it.done?'':it.priority}" title="${t('Prioridad')}: ${prioName(it.priority)}">${ic('flag','s16')}</span>`:''}
  </div>`;
}
function examCard(e){
  const n=e.date?diffDays(e.date,today()):null;
  const cls=n===null?'':n<=3?'d':n<=7?'w':'';
  const big=n===null?`<b class="sm">—</b><small>${t('sin fecha')}</small>`:n===0?`<b class="sm">${t('HOY')}</b><small>${t('¡suerte!')}</small>`:`<b>${n}</b><small>${n===1?t('día'):t('días')}</small>`;
  const tot=e.steps.length, dn=e.steps.filter(s=>s.done).length;
  return `<div class="exam" data-act="open" data-id="${e.id}" role="button" tabindex="0">
    <div class="top"><div class="cd ${cls}">${big}</div><div class="info"><b>${esc(e.title||t('Examen'))}</b>${chip(e.subjectId)}</div></div>
    <div class="date">${ic('calendar','s14')}${e.date?cap1(fmtShort(e.date)):t('Sin fecha')}${e.time?' · '+e.time:''}</div>
    <div class="prog">${tot?`<div class="row"><span>${t('Repaso')}</span><span>${dn}/${tot} ${t('temas')}</span></div><div class="track ${dn===tot?'ok':''}"><i style="width:${Math.round(dn/tot*100)}%"></i></div>`:`<div class="row"><span class="muted">${t('Añade los temas para seguir tu repaso')}</span></div>`}</div>
  </div>`;
}
const headActs=(btnLabel,btnCls='')=>`<div class="acts"><label class="search">${ic('search','s16')}<input data-in="q" data-focus="q" placeholder="${t('Buscar…')}" value="${esc(UI.q)}"></label><button class="btn ${btnCls}" data-act="new">${ic('plus','s18')}${btnLabel}</button></div>`;
function greeting(){const h=new Date().getHours();return h<6?t('Buenas noches'):h<14?t('Buenos días'):h<21?t('Buenas tardes'):t('Buenas noches');}
function currentClass(){
  const dw=dowMon(today()), m=nowMin(); const cl=classesOn(dw);
  const now=cl.find(c=>toMin(c.start)<=m&&m<toMin(c.end)); const next=cl.find(c=>toMin(c.start)>m);
  return {now,next,list:cl};
}
const loading=()=>`<div class="empty-big" style="padding-top:120px">${ic('cloud')}<div><b>${t('Cargando tus datos…')}</b></div></div>`;

/* ================= VISTA: HOY ================= */
function viewHoy(){
  const td=today(), pend=pendingTasks(), forToday=pend.filter(i=>i.date===td);
  const endW=addDays(weekStart(td),6), overdue=pend.filter(i=>i.date&&i.date<td).length;
  const ue=upcomingExams(), nx=ue[0], nxd=nx&&nx.date?diffDays(nx.date,td):null;
  const ws=weekStart(td), dw=doneInWeek(ws), dlw=doneInWeek(addDays(ws,-7)), dif=dw-dlw;
  const nextTime=forToday.find(i=>i.time&&i.time>=fromMin(nowMin()));
  const name=S.settings.name?`, ${esc(S.settings.name)}`:'';
  const soon=pend.filter(i=>i.date&&i.date<=addDays(td,7));
  const {now,next,list:cl}=currentClass();
  const persToday=onDate(td).filter(i=>i.kind==='personal');
  let h=`<div class="head"><div><h1>${greeting()}${name}</h1><p>${cap1(fmtLong(td))} · ${forToday.length?tn(forToday.length,'tienes {n} entrega hoy','tienes {n} entregas hoy'):t('nada que entregar hoy')}</p></div>${headActs(t('Nuevo deber'))}</div>`;
  if(S.ready&&!S.settings.onboarded&&!S.settings.subjects.length) h+=welcome();
  if(localLeftovers()) h+=`<div class="banner">${ic('device','s18')}<div class="grow">${t('Tienes datos guardados solo en este navegador. ¿Quieres subirlos a tu cuenta?')}</div><button class="btn sm" data-act="migrate">${t('Subirlos')}</button><button class="btn ghost sm" data-act="dismiss-migrate">${t('Ahora no')}</button></div>`;
  if(S.mode==='cloud'&&Push.supported&&Push.perm()==='default'&&S.settings.onboarded&&!LS.get('deures:pushask')) h+=`<div class="banner">${ic('bell','s18')}<div class="grow">${t('Activa los avisos en este dispositivo para que te recuerde entregas y exámenes aunque la app esté cerrada.')}</div><button class="btn sm" data-act="push-on">${t('Activar')}</button><button class="btn ghost sm" data-act="push-later">${t('Ahora no')}</button></div>`;
  h+=`<div class="stats">
    <button class="stat" data-act="go" data-v="deberes"><span>${t('Pendientes')}</span><b>${pend.length}</b><small>${overdue?tn(overdue,'{n} vencido','{n} vencidos'):t('{n} vencen esta semana',{n:pend.filter(i=>i.date&&i.date<=endW).length})}</small></button>
    <button class="stat" data-act="go" data-v="deberes"><span>${t('Para hoy')}</span><b style="color:${forToday.length?'var(--warning)':''}">${forToday.length}</b><small>${nextTime?t('La próxima a las {h}',{h:nextTime.time}):forToday.length?t('Sin hora concreta'):t('Día libre de entregas')}</small></button>
    <button class="stat" data-act="go" data-v="examenes"><span>${t('Próximo examen')}</span><b style="color:${nxd!==null&&nxd<=3?'var(--danger)':''}">${nx?(nxd===null?'—':nxd===0?t('Hoy'):nxd===1?t('Mañana'):nxd+(isMobile()?t('d'):' '+t('días'))):'—'}</b><small>${nx?esc(nx.title):t('Ninguno a la vista')}</small></button>
    <button class="stat hide-m" data-act="go" data-v="deberes"><span>${t('Hechas esta semana')}</span><b>${dw}</b><small>${dif>0?t('+{n} que la semana pasada',{n:dif}):dif<0?t('{n} que la semana pasada',{n:dif}):t('Igual que la semana pasada')}</small></button>
  </div>`;
  if(cl.length&&(now||next)){
    const c=now||next, s=subj(c.subjectId);
    const pct=now?clamp((nowMin()-toMin(now.start))/(toMin(now.end)-toMin(now.start)),0,1):0;
    h+=`<div class="card mob-now" style="background:var(--accent-soft);border-color:transparent;gap:8px" data-act="go" data-v="horario"><div class="card-h"><span class="cap" style="color:var(--accent)">${now?t('Ahora en clase'):t('Siguiente clase')}</span><small class="sec">${now?t('hasta las {h}',{h:now.end}):t('a las {h}',{h:next.start})}</small></div><b style="font-size:17px">${esc(s?s.name:t('Clase'))}</b><small class="sec">${esc(c.room||'')}${now&&next?' · '+t('luego {s} a las {h}',{s:esc((subj(next.subjectId)||{}).name||t('clase')),h:next.start}):''}</small>${now?`<div class="track" style="height:4px;background:var(--bg-hover)"><i style="width:${pct*100}%"></i></div>`:''}</div>`;
  }
  let Lh=`<div class="card-h"><h3 style="font-size:16px">${t('Para entregar pronto')}</h3><a class="link" href="#deberes">${t('Ver todos')} →</a></div>`;
  if(!soon.length) Lh+=`<div class="card" style="align-items:center;text-align:center;padding:32px">${ic('check','s24')}<div><b>${t('Todo al día')}</b><p class="muted" style="margin-top:4px">${t('No tienes entregas en los próximos 7 días.')}</p></div><button class="btn ghost sm" data-act="new">${ic('plus','s16')}${t('Añadir deber')}</button></div>`;
  else for(const [g,list,c] of groupTasks(soon)) Lh+=`<div class="group"><div class="cap ${c||''}">${g}${c?' · '+list.length:''}</div>${list.map(i=>taskRow(i)).join('')}</div>`;
  let R=`<div class="card cls-card"><div class="card-h"><h3>${t('Clases de hoy')}</h3><small class="muted">${cl.length?cl[0].start+' – '+cl[cl.length-1].end:''}</small></div>`;
  R+=cl.length?cl.map(c=>{const s=subj(c.subjectId),on=now&&now.id===c.id;return `<div class="cls ${on?'now':''}" style="--c:${s?s.color:'#9AA3B5'}"><div class="tm"><b>${c.start}</b><small>${c.end}</small></div><div class="bar"></div><div class="inf"><b>${esc(s?s.name:t('Clase'))}${on?`<span class="now-b">${t('AHORA')}</span>`:''}</b><small>${esc(c.room||'')}</small></div></div>`;}).join(''):`<div class="empty">${S.settings.schedule.length?t('Hoy no tienes clase.'):`${t('Aún no has puesto tu horario.')} <a class="link" href="#horario">${t('Añadirlo')}</a>`}</div>`;
  R+='</div>';
  R+=`<div class="card-h" style="padding-top:2px"><h3 style="font-size:15px">${t('Próximo examen')}</h3>${ue.length>1?`<small class="muted">${t('{n} más después',{n:ue.length-1})}</small>`:''}</div>`;
  R+=nx?examCard(nx):`<div class="card"><div class="empty">${t('No hay exámenes a la vista.')} <a class="link" href="#examenes">${t('Añadir uno')}</a></div></div>`;
  R+=`<div class="card" style="gap:10px"><div class="row"><span style="color:var(--personal);display:flex">${ic('user','s16')}</span><h3>${t('Personal hoy')}</h3></div>${persToday.length?persToday.map(p=>`<div class="pers-row" data-act="open" data-id="${p.id}" role="button" style="cursor:pointer"><i style="background:${CATS[p.category]||PERSONAL_COLOR}"></i><small>${p.time||t('Todo el día')}</small>${esc(p.title)}</div>`).join(''):`<div class="empty">${t('Nada planeado.')} <a class="link" href="#personal">${t('Ver mi calendario')}</a></div>`}</div>`;
  h+=`<div class="cols"><div class="group" style="gap:10px">${Lh}</div><div class="side">${R}</div></div>`;
  return h;
}
function welcome(){
  const chosen=UI.onb; const all=[...SUGGESTED,...UI.onbCustom];
  return `<div class="welcome"><div><h2>${t('¡Bienvenido a Deures!')}</h2><p style="margin-top:6px">${t('Dos cosas rápidas para empezar: tu nombre y tus asignaturas (módulos). Luego podrás cambiarlo todo en Ajustes.')}</p></div>
  <div class="field" style="max-width:320px"><span class="lbl">${t('¿Cómo te llamas?')}</span><input data-in="onb-name" data-focus="onb-name" placeholder="${t('Tu nombre')}" value="${esc(UI.onbName||'')}"></div>
  <div class="field"><span class="lbl">${t('Elige tus asignaturas (sugerencias del CFGS de Automatización y Robótica)')}</span><div class="wrap">${all.map((n,i)=>`<button class="chip ${chosen.has(n)?'on':''}" style="--c:${PALETTE[i%PALETTE.length]}" data-act="onb-toggle" data-n="${esc(n)}"><i></i><em>${esc(n)}</em></button>`).join('')}</div></div>
  <div class="row" style="max-width:420px"><input data-in="onb-new" data-focus="onb-new" placeholder="${t('Otra asignatura…')}" value="${esc(UI.onbNew||'')}"><button class="btn ghost sm" data-act="onb-add">${t('Añadir')}</button></div>
  <div class="row"><button class="btn" data-act="onb-save">${ic('check','s18')}${chosen.size?t('Empezar con {n} asignaturas',{n:chosen.size}):t('Empezar')}</button><button class="btn ghost" data-act="onb-skip">${t('Saltar')}</button></div></div>`;
}

/* ================= VISTA: DEBERES ================= */
function viewDeberes(){
  const q=norm(UI.q);
  let pool=itemList().filter(it=>q?it.kind!=='personal':isTask(it));
  if(UI.subjF!=='all') pool=pool.filter(i=>i.subjectId===UI.subjF);
  if(q) pool=pool.filter(i=>norm(i.title+' '+i.notes+' '+(subj(i.subjectId)||{}).name).includes(q));
  const pend=pool.filter(i=>!i.done).sort(sortByDue), done=pool.filter(i=>i.done).sort((a,b)=>(b.doneAt||0)-(a.doneAt||0));
  const allP=pendingTasks().length, allD=itemList().filter(i=>isTask(i)&&i.done).length;
  const FL={pendientes:t('Pendientes'),todos:t('Todos'),hechos:t('Hechos')};
  let h=`<div class="head"><div><h1>${q?t('Resultados'):t('Deberes')}</h1><p>${q?t('{n} resultados para “{q}”',{n:pend.length+done.length,q:esc(UI.q)}):t('{n} pendientes · {m} hechos',{n:allP,m:allD})}</p></div>${headActs(t('Nuevo deber'))}</div>`;
  const subs=S.settings.subjects;
  h+=`<div class="toolbar"><div class="seg box">${Object.keys(FL).map(f=>`<button class="${UI.dFilter===f?'on':''}" data-act="dfilter" data-v="${f}">${FL[f]}</button>`).join('')}</div>
    <div class="filters"><button class="pill-f ${UI.subjF==='all'?'on':''}" data-act="subjf" data-v="all">${t('Todas')}</button>${subs.map(s=>`<button class="chip ${UI.subjF===s.id?'on':''}" style="--c:${s.color}" data-act="subjf" data-v="${s.id}"><i></i><em>${esc(s.name)}</em></button>`).join('')}</div>
    <span class="sec sort" style="font-size:13px">${t('Ordenado por fecha de entrega')}</span></div>`;
  let Lh='';
  if(UI.dFilter!=='hechos') for(const [g,list,c] of groupTasks(pend)) Lh+=`<div class="group"><div class="cap ${c||''}">${g}${c?' · '+list.length:''}</div>${list.map(i=>taskRow(i,{kindTag:!!q})).join('')}</div>`;
  if(UI.dFilter!=='pendientes'&&done.length) Lh+=`<div class="group"><div class="cap">${t('Hechos')} · ${done.length}</div>${done.slice(0,80).map(i=>taskRow(i,{kindTag:!!q})).join('')}</div>`;
  if(!Lh) Lh=`<div class="empty-big">${ic(UI.dFilter==='hechos'?'tasks':'check')}<div><b>${q?t('Sin resultados'):UI.dFilter==='hechos'?t('Aún no has completado nada'):t('¡Nada pendiente!')}</b><p class="muted" style="margin-top:4px">${q?t('Prueba con otra palabra.'):t('Añade un deber con el botón “Nuevo deber”.')}</p></div></div>`;
  const sel=UI.sel&&S.items[UI.sel]&&!S.items[UI.sel].deleted&&S.items[UI.sel];
  const D=sel?`<div class="detail">${detailHTML(sel)}</div>`:`<div class="detail" style="align-items:center;justify-content:center;text-align:center;min-height:320px;color:var(--text-3)">${ic('tasks')}<p>${t('Selecciona un deber para ver sus pasos y notas')}</p></div>`;
  h+=`<div class="split"><div class="list">${Lh}</div><div class="detail-col">${D}</div></div>`;
  return h;
}

/* ================= DETALLE ================= */
function detailHTML(it){
  const per=it.kind==='personal';
  const tot=it.steps.length, dn=it.steps.filter(s=>s.done).length;
  const past=it.kind==='examen'&&it.date&&it.date<=today();
  const rd=it.date?relDay(it.date):'';
  let h=`<div class="card-h"><span class="kind ${it.kind}">${kindName(it.kind).toUpperCase()}</span><button class="link" data-act="edit" data-id="${it.id}">${t('Editar')}</button></div>
  <h2>${esc(it.title||t('(sin título)'))}</h2>
  ${per?catChip(it.category):chip(it.subjectId)||`<span class="muted" style="font-size:12px">${t('Sin asignatura')}</span>`}
  <div class="prop"><span>${it.kind==='examen'?t('Fecha'):per?t('Cuándo'):t('Entrega')}</span><span class="row">${ic('calendar','s14')}${it.date?`${rd}${[t('Hoy'),t('Mañana'),t('Ayer')].includes(rd)?', '+fmtShort(it.date).toLowerCase():''}`:t('Sin fecha')}${it.time?' · '+it.time:''}</span></div>`;
  if(per&&it.place) h+=`<div class="prop"><span>${t('Lugar')}</span><span class="row">${ic('pin','s14')}${esc(it.place)}</span></div>`;
  if(!per){
    h+=`<div class="prop"><span>${t('Prioridad')}</span><div class="seg">${Object.keys(PRIOS).map(p=>`<button class="${it.priority===p?'on '+p:''}" data-act="set-prio" data-id="${it.id}" data-v="${p}">${prioName(p)}</button>`).join('')}</div></div>
    <div class="prop"><span>${t('Tipo')}</span><div class="seg">${['deber','entrega','examen'].map(k=>`<button class="${it.kind===k?'on acc':''}" data-act="set-kind" data-id="${it.id}" data-v="${k}">${kindName(k)}</button>`).join('')}</div></div>`;
  }
  if(past) h+=`<div class="prop"><span>${t('Nota')}</span><input type="text" inputmode="decimal" style="width:90px;padding:6px 10px" data-in="grade" data-id="${it.id}" data-focus="grade-${it.id}" value="${it.grade===null?'':String(it.grade).replace('.',LANG==='en'?'.':',')}" placeholder="—"><small class="muted">${t('sobre 10')}</small></div>`;
  h+=`<div class="field"><span class="lbl">${t('Notas')}</span><textarea class="notes" data-in="notes" data-id="${it.id}" data-focus="notes-${it.id}" placeholder="${t('Apuntes, enlaces, lo que necesites…')}">${esc(it.notes)}</textarea></div>`;
  if(!per){
    h+=`<div class="card-h"><span class="lbl">${it.kind==='examen'?t('Temas a repasar'):t('Pasos')}</span><small class="muted">${tot?t('{n} de {m}',{n:dn,m:tot}):''}</small></div>`;
    if(tot) h+=`<div class="track ok"><i style="width:${Math.round(dn/tot*100)}%"></i></div>`;
    h+=`<div class="steps">${it.steps.map(s=>`<div class="step ${s.done?'done':''}"><button class="cb sm ${s.done?'on':''}" data-act="step" data-id="${it.id}" data-s="${s.id}">${s.done?ic('check','s14'):''}</button><span>${esc(s.text)}</span><button class="x" data-act="step-del" data-id="${it.id}" data-s="${s.id}" aria-label="${t('Quitar')}">${ic('x','s14')}</button></div>`).join('')}
      <label class="add-step">${ic('plus','s16')}<input data-in="step-new" data-id="${it.id}" data-focus="step-new-${it.id}" placeholder="${it.kind==='examen'?t('Añadir tema (Enter)'):t('Añadir paso (Enter)')}"></label></div>`;
  }
  h+=`<div class="d-acts">${per?'':`<button class="btn" data-act="toggle" data-id="${it.id}">${ic('check','s18')}${it.done?t('Marcar como pendiente'):t('Marcar como hecho')}</button>`}<button class="btn danger" data-act="del" data-id="${it.id}">${t('Eliminar')}</button></div>`;
  return h;
}

/* ================= VISTA: EXÁMENES ================= */
function viewExamenes(){
  const up=upcomingExams(), past=pastExams(), n=up[0]&&up[0].date?diffDays(up[0].date,today()):null;
  let h=`<div class="head"><div><h1>${t('Exámenes')}</h1><p>${up.length?tn(up.length,'{n} próximo','{n} próximos')+' · '+t('el siguiente {d}',{d:inDays(n)}):t('Sin exámenes a la vista')}</p></div><div class="acts"><button class="btn" data-act="new">${ic('plus','s18')}${t('Nuevo examen')}</button></div></div>`;
  h+=`<div class="cap">${t('Próximos')}</div>`;
  h+=up.length?`<div class="grid-ex">${up.map(examCard).join('')}</div>`:`<div class="empty-big">${ic('exam')}<div><b>${t('Ningún examen pendiente')}</b><p class="muted" style="margin-top:4px">${t('Cuando te pongan fecha, añádelo y verás la cuenta atrás.')}</p></div><button class="btn ghost sm" data-act="new">${ic('plus','s16')}${t('Añadir examen')}</button></div>`;
  if(past.length){
    const dec=g=>String(g).replace('.',LANG==='en'?'.':',');
    h+=`<div class="cap">${t('Pasados')}</div><div class="past">${past.map(e=>{const g=e.grade;const gc=g===null?'':g>=7?'ok':g>=5?'mid':'bad';return `<button data-act="open" data-id="${e.id}"><span style="color:var(--text-3);display:flex">${ic('exam','s18')}</span><span class="t">${esc(e.title)}</span>${chip(e.subjectId)}<span class="d">${cap1(fmtShort(e.date))}</span><span class="grade ${gc}">${g===null?'—':dec(g)}</span></button>`;}).join('')}</div>`;
    const graded=past.filter(e=>e.grade!==null); if(graded.length) h+=`<p class="muted" style="font-size:13px">${t('Media de notas')}: <b style="color:var(--text)">${dec((graded.reduce((a,e)=>a+e.grade,0)/graded.length).toFixed(2))}</b> (${tn(graded.length,'{n} examen','{n} exámenes')})</p>`;
  }
  return h;
}

/* ================= VISTA: CALENDARIO ================= */
function monthGrid(ym){ const [y,m]=ym.split('-').map(Number); const start=weekStart(ymd(new Date(y,m-1,1))); return Array.from({length:42},(_,i)=>addDays(start,i)); }
const shiftMonth=(ym,n)=>{const [y,m]=ym.split('-').map(Number);const d=new Date(y,m-1+n,1);return `${d.getFullYear()}-${p2(d.getMonth()+1)}`;};
function viewCalendario(){
  const ym=UI.calMonth, [y,m]=ym.split('-').map(Number), sp=S.settings.showPersonal, td=today();
  const inM=itemList().filter(i=>i.date&&i.date.startsWith(ym));
  const nT=inM.filter(isTask).length, nE=inM.filter(i=>i.kind==='examen').length;
  let h=`<div class="head cal-head"><div><h1>${monthName(m-1)} ${y}</h1><p>${tn(nT,'{n} entrega','{n} entregas')} ${t('y')} ${tn(nE,'{n} examen','{n} exámenes')} ${t('este mes')}</p></div><div class="acts"><button class="switch ${sp?'on':''}" data-act="toggle-pers"><i></i><span>${t('Mostrar personal')}</span></button><div class="mnav"><button data-act="cal-m" data-v="-1" aria-label="${t('Mes anterior')}">${ic('left','s18')}</button><button class="t" data-act="cal-today">${t('Hoy')}</button><button data-act="cal-m" data-v="1" aria-label="${t('Mes siguiente')}">${ic('right','s18')}</button></div></div></div>`;
  h+=`<div class="legend"><span style="--c:var(--accent)"><i></i>${t('Deberes y entregas (color de la asignatura)')}</span><span style="--c:var(--danger)"><i></i>${t('Exámenes')}</span>${sp?`<span style="--c:var(--personal)"><i></i>${t('Personal')}</span>`:''}</div>`;
  const days=monthGrid(ym);
  let g=`<div class="month"><div class="wd">${L().wds.map(d=>`<span class="cap">${d}</span>`).join('')}</div>`;
  for(let w=0;w<6;w++){
    g+='<div class="wk">';
    for(let k=0;k<7;k++){
      const d=days[w*7+k], evs=onDate(d,sp), out=!d.startsWith(ym);
      g+=`<div class="day ${out?'out':''} ${d===td?'today':''} ${d===UI.calSel?'sel':''}" data-act="cal-sel" data-d="${d}"><span class="n">${parseD(d).getDate()}</span>
        ${evs.slice(0,3).map(e=>`<span class="ev ${e.done?'done':''}" style="--c:${itemColor(e)}"><span>${e.kind==='examen'?t('Examen')+': ':''}${esc(e.title)}</span></span>`).join('')}${evs.length>3?`<span class="more">${t('+{n} más',{n:evs.length-3})}</span>`:''}
        <span class="dots">${evs.slice(0,3).map(e=>`<i style="--c:${itemColor(e)}"></i>`).join('')}</span></div>`;
    }
    g+='</div>';
  }
  g+='</div>';
  const sel=UI.calSel, list=onDate(sel,sp);
  const cnt={t:list.filter(isTask).length,e:list.filter(i=>i.kind==='examen').length,p:list.filter(i=>i.kind==='personal').length};
  const parts=[cnt.e&&tn(cnt.e,'{n} examen','{n} exámenes'),cnt.t&&tn(cnt.t,'{n} entrega','{n} entregas'),cnt.p&&t('{n} personal',{n:cnt.p})].filter(Boolean);
  const cls=classesOn(dowMon(sel));
  let p=`<div class="daypanel"><div><h3>${cap1(fmtLong(sel))}</h3><p class="muted" style="font-size:13px;margin-top:4px">${parts.length?parts.join(' · '):t('Nada apuntado')}${cls.length?' · '+tn(cls.length,'{n} clase','{n} clases'):''}</p></div>`;
  p+=list.map(i=>`<button class="dp-item ${i.done?'done':''}" style="--c:${itemColor(i)}" data-act="open" data-id="${i.id}"><span class="bar"></span><span class="grow"><b>${esc(i.title)}</b><small>${kindName(i.kind)}${i.time?' · '+i.time:''}${i.kind==='personal'?(i.place?' · '+esc(i.place):''):(subj(i.subjectId)?' · '+esc(subj(i.subjectId).name):'')}</small></span></button>`).join('');
  p+=`<button class="add-day" data-act="new-on" data-d="${sel}">+ ${t('Añadir a este día')}</button></div>`;
  return h+`<div class="cal-wrap">${g}${p}</div>`;
}

/* ================= VISTA: HORARIO ================= */
function viewHorario(){
  const sch=S.settings.schedule, td=dowMon(today());
  let h=`<div class="head"><div><h1>${t('Horario')}</h1><p>${sch.length?t('{n} clases a la semana · toca un hueco para añadir',{n:sch.length}):t('Pon tu horario de clase')}</p></div><div class="acts"><button class="btn" data-act="new-class">${ic('plus','s18')}${t('Añadir clase')}</button></div></div>`;
  if(!sch.length) return h+`<div class="empty-big">${ic('clock')}<div><b>${t('Aún no has añadido tu horario')}</b><p class="muted" style="margin-top:4px">${t('Añade cada clase (día, hora, asignatura y aula) y en “Hoy” verás qué te toca.')}</p></div><button class="btn" data-act="new-class">${ic('plus','s16')}${t('Añadir la primera clase')}</button></div>`;
  const nd=sch.some(c=>c.day>=5)?(sch.some(c=>c.day===6)?7:6):5;
  let minM=Math.min(...sch.map(c=>toMin(c.start))), maxM=Math.max(...sch.map(c=>toMin(c.end)));
  minM=Math.floor(minM/60)*60; maxM=Math.ceil(maxM/30)*30; const HH=90, px=m=>(m-minM)/60*HH, H=px(maxM)+12;
  let w=`<div class="week week-desk" style="--nd:${nd}"><div class="hdr"><span></span>${L().wd.slice(0,nd).map((d,i)=>`<span class="${i===td?'today':''}">${d}${i===td?' · '+t('hoy'):''}</span>`).join('')}</div><div class="body" style="height:${H}px"><div class="hours">`;
  for(let m=minM;m<=maxM;m+=60) w+=`<span style="top:${px(m)}px">${fromMin(m)}</span>`;
  w+='</div>';
  for(let d=0;d<nd;d++){
    w+=`<div class="col" data-act="slot" data-day="${d}" data-min="${minM}" data-hh="${HH}">`;
    for(const c of classesOn(d)){ const s=subj(c.subjectId); const top=px(toMin(c.start))+3, hh=px(toMin(c.end))-px(toMin(c.start))-6;
      w+=`<button class="blk" style="top:${top}px;height:${hh}px;--c:${s?s.color:'#9AA3B5'}" data-act="edit-class" data-id="${c.id}"><b>${esc(s?s.name:t('Clase'))}</b><small>${c.start} – ${c.end}</small>${c.room?`<small class="r">${esc(c.room)}</small>`:''}</button>`; }
    if(d===td){ const nm=nowMin(); if(nm>=minM&&nm<=maxM) w+=`<div class="nowline" style="top:${px(nm)}px;left:0;right:0"></div>`; }
    w+='</div>';
  }
  for(let m=minM;m<=maxM;m+=30) w+=`<div class="line ${m%60?'half':''}" style="top:${px(m)}px"></div>`;
  w+='</div></div>';
  const sd=UI.schedDay, list=classesOn(sd), dayName=L().wd[sd].toLowerCase();
  let mob=`<div class="week-mob"><div class="seg full">${L().wd1.slice(0,nd).map((d,i)=>`<button class="${sd===i?'on':''}" data-act="sched-day" data-v="${i}">${d}${i===td?' ·':''}</button>`).join('')}</div>`;
  mob+=`<div style="display:flex;flex-direction:column;gap:8px">${list.length?list.map(c=>{const s=subj(c.subjectId);return `<button class="dp-item" style="--c:${s?s.color:'#9AA3B5'}" data-act="edit-class" data-id="${c.id}"><span class="bar"></span><span class="grow"><b>${esc(s?s.name:t('Clase'))}</b><small>${c.start} – ${c.end}${c.room?' · '+esc(c.room):''}</small></span></button>`;}).join(''):`<div class="empty">${t('Sin clases el {d}.',{d:dayName})}</div>`}<button class="add-day" data-act="new-class" data-day="${sd}">+ ${t('Añadir clase el {d}',{d:dayName})}</button></div></div>`;
  return h+w+mob;
}

/* ================= VISTA: MI CALENDARIO ================= */
function viewPersonal(){
  const td=today(), ym=UI.persMonth, [y,m]=ym.split('-').map(Number), all=personal();
  const has=new Set(all.map(e=>e.date));
  let h=`<div class="head"><div><h1>${t('Mi calendario')}</h1><p>${t('Tus planes fuera de clase')}</p></div><div class="acts"><button class="btn pers" data-act="new">${ic('plus','s18')}${t('Nuevo evento')}</button></div></div>`;
  let mini=`<div class="card" style="gap:10px"><div class="card-h"><h3>${monthName(m-1)} ${y}</h3><div class="row"><button class="iconbtn" style="color:var(--text-2)" data-act="pers-m" data-v="-1">${ic('left','s18')}</button><button class="iconbtn" style="color:var(--text-2)" data-act="pers-m" data-v="1">${ic('right','s18')}</button></div></div><div class="mini">${L().wd1.map(d=>`<span>${d}</span>`).join('')}`;
  for(const d of monthGrid(ym)) mini+=`<button class="${d.startsWith(ym)?'':'out'} ${d===td?'today':''} ${d===UI.persSel?'sel':''} ${has.has(d)?'has':''}" data-act="pers-sel" data-d="${d}"><em>${parseD(d).getDate()}</em><i></i></button>`;
  mini+='</div></div>';
  const counts={}; for(const e of all) if(e.date>=td) counts[e.category]=(counts[e.category]||0)+1;
  mini+=`<div class="card" style="gap:10px"><h3>${t('Categorías')}</h3><div class="cats">${Object.keys(CATS).map(c=>`<span class="chip" style="--c:${CATS[c]}"><i></i><em>${catName(c)}${counts[c]?` · ${counts[c]}`:''}</em></span>`).join('')}</div></div>`;
  const list=UI.persSel?all.filter(e=>e.date===UI.persSel):all.filter(e=>UI.persPast?true:(!e.date||e.date>=td));
  let ag='';
  if(UI.persSel) ag+=`<div class="card-h"><span class="sec">${cap1(fmtLong(UI.persSel))}</span><button class="link" data-act="pers-sel" data-d="">${t('Ver todos')}</button></div>`;
  const byDay={}; for(const e of list){(byDay[e.date||'']=byDay[e.date||'']||[]).push(e);}
  const keys=Object.keys(byDay).sort((a,b)=>(a||'9999').localeCompare(b||'9999'));
  for(const d of keys){
    const isT=d===td, lab=!d?t('Sin fecha'):isT?t('Hoy'):diffDays(d,td)===1?t('Mañana'):cap1(fmtLong(d));
    ag+=`<div class="ag-h ${isT?'today':''}">${lab}<small>${d?(isT?cap1(fmtShort(d)):inDays(diffDays(d,td))):''}</small></div>`;
    for(const e of byDay[d]){ const pastE=d&&(d<td||(isT&&e.time&&toMin(e.time)<nowMin()-60));
      ag+=`<button class="evrow ${pastE?'past':''}" style="--c:${CATS[e.category]}" data-act="open" data-id="${e.id}"><span class="tm">${e.time||'—'}</span><span class="bar"></span><span class="inf"><b>${esc(e.title)}</b>${e.place?`<small>${ic('pin','s14')}${esc(e.place)}</small>`:''}</span>${catChip(e.category)}</button>`; }
  }
  if(!keys.length) ag+=`<div class="empty-big">${ic('user')}<div><b>${UI.persSel?t('Nada este día'):t('No tienes planes apuntados')}</b><p class="muted" style="margin-top:4px">${t('Médico, quedadas, entrenos… apúntalos aquí.')}</p></div><button class="btn pers sm" data-act="${UI.persSel?'new-on':'new'}" data-d="${UI.persSel||''}">${ic('plus','s16')}${t('Nuevo evento')}</button></div>`;
  if(!UI.persSel) ag+=`<button class="link" style="align-self:flex-start" data-act="pers-past">${UI.persPast?t('Ocultar eventos pasados'):t('Ver también eventos pasados')}</button>`;
  return h+`<div class="pers-wrap"><div class="side">${mini}</div><div class="agenda">${ag}</div></div>`;
}

/* ================= VISTA: AJUSTES ================= */
function syncCard(){
  const si=syncInfo();
  const txt=S.mode==='cloud'?(S.pending?t('{n} cambios esperando conexión. Se enviarán solos.',{n:S.pending}):S.live?t('Tus datos se guardan en tu cuenta y llegan al momento a tu móvil y a tus PCs.'):t('Reconectando… mientras tanto puedes seguir usando la app: los cambios se guardan aquí y se envían al volver la conexión.')):t('Estás usando la app sin cuenta: los datos se guardan solo en este dispositivo.');
  return `<div class="card"><div class="sync ${si.cls}" style="margin:0">${ic(si.icon,'s18')}<div><b>${si.label}</b><small>${si.hint}</small></div></div><p class="howto">${txt}</p>${S.mode==='cloud'?`<div class="row" style="justify-content:space-between"><span class="sec" style="font-size:13px">${esc(S.user.email||'')}</span><button class="btn ghost sm" data-act="logout">${ic('logout','s16')}${t('Cerrar sesión')}</button></div>`:HAS_CLOUD?`<button class="btn sm" data-act="go-login">${t('Entrar con mi cuenta')}</button>`:''}</div>`;
}
function notifCard(){
  const n=S.settings.notif, perm=Push.perm(), on=!!Push.sub;
  let st;
  if(S.mode!=='cloud') st=`<p class="howto">${t('Para recibir avisos necesitas entrar con tu cuenta.')}</p>`;
  else if(!Push.supported) st=`<p class="howto">${t('Este navegador no admite notificaciones push. En Android usa Chrome; en PC, Chrome o Edge.')}${/iPhone|iPad/.test(navigator.userAgent)&&!isStandalone()?' '+t('En iPhone, primero añade la app a la pantalla de inicio desde Safari.'):''}</p>`;
  else if(perm==='denied') st=`<p class="howto err">${t('Las notificaciones están bloqueadas para esta web. Desbloquéalas en el candado de la barra de direcciones (o en Ajustes del sistema > Apps) y vuelve aquí.')}</p>`;
  else st=`<div class="row" style="gap:10px;flex-wrap:wrap">${on?`<span class="row" style="color:var(--success);font-weight:600;font-size:13px">${ic('bell','s16')}${t('Activados en este dispositivo')}</span><button class="btn ghost sm" data-act="push-test" ${Push.busy?'disabled':''}>${t('Enviar prueba')}</button><button class="btn ghost sm" data-act="push-off" ${Push.busy?'disabled':''}>${t('Desactivar aquí')}</button>`:`<button class="btn sm" data-act="push-on" ${Push.busy?'disabled':''}>${ic('bell','s16')}${t('Activar en este dispositivo')}</button>`}</div>`;
  const tg=(k,l,d)=>`<label class="opt"><span><b>${l}</b><small>${d}</small></span><button class="switch ${n[k]?'on':''}" data-act="notif-toggle" data-k="${k}" aria-label="${l}"><i></i></button></label>`;
  return `<div class="card"><div class="card-h"><h3>${t('Avisos')}</h3>${Push.busy?`<small class="muted">${t('Un momento…')}</small>`:''}</div>${st}${Push.msg?`<p class="${Push.err?'err':'sec'}" style="font-size:12px">${esc(Push.msg)}</p>`:''}
    ${tg('tasks',t('Entregas'),t('La víspera a la hora de la tarde y el mismo día 3 horas antes (o por la mañana si no tiene hora).'))}
    ${tg('exams',t('Exámenes'),t('3 días antes y la víspera, con los temas que te quedan.'))}
    ${tg('personal',t('Eventos personales'),t('Resumen a primera hora con tus planes del día.'))}
    <div class="two"><div class="field"><span class="lbl">${t('Primera hora')}</span><input type="time" data-in="notif-morning" value="${n.morning}"></div><div class="field"><span class="lbl">${t('Aviso de la tarde')}</span><input type="time" data-in="notif-evening" value="${n.evening}"></div></div>
    <p class="howto" style="font-size:12px">${t('Activa los avisos en cada dispositivo donde quieras recibirlos. En PC llegan mientras Chrome o Edge estén abiertos o en segundo plano.')}</p></div>`;
}
function installCard(){
  if(isStandalone()) return `<div class="card"><h3>${t('App instalada')}</h3><p class="howto">${t('Estás usando Deures como app. Para tenerla en otro dispositivo, abre la misma dirección y pulsa “Instalar”.')}</p><code class="url">${esc(siteUrl())}</code></div>`;
  return `<div class="card"><h3>${t('Instalar la app')}</h3>${installEvt?`<button class="btn" data-act="install">${ic('download','s18')}${t('Instalar Deures en este dispositivo')}</button>`:''}<div class="howto"><p><b>${t('Android (Chrome):')}</b> ${t('menú ⋮ → “Instalar aplicación” o “Añadir a pantalla de inicio”.')}</p><p style="margin-top:6px"><b>${t('PC (Chrome o Edge):')}</b> ${t('icono de instalar en la barra de direcciones, o menú ⋮ → “Guardar y compartir” → “Instalar Deures”.')}</p><p style="margin-top:6px"><b>${t('iPhone (Safari):')}</b> ${t('Compartir → “Añadir a pantalla de inicio”.')}</p></div><code class="url">${esc(siteUrl())}</code></div>`;
}
function viewAjustes(){
  const st=S.settings, subs=st.subjects;
  let h=`<div class="head"><div><h1>${t('Ajustes')}</h1><p>${t('Idioma, avisos, asignaturas y copia de seguridad')}</p></div></div><div class="set-wrap"><div class="side">`;
  h+=`<div class="card"><h3>${t('Idioma')}</h3><div class="seg full">${Object.entries(LANGS).map(([k,v])=>`<button class="${LANG===k?'on acc':''}" data-act="lang" data-v="${k}">${v}</button>`).join('')}</div></div>`;
  h+=notifCard();
  h+=`<div class="card"><h3>${t('Tu nombre')}</h3><input data-in="name" data-focus="name" placeholder="${t('Para el saludo de “Hoy”')}" value="${esc(st.name)}"></div>`;
  h+=`<div class="card"><div class="card-h"><h3>${t('Asignaturas')}</h3><small class="muted">${t('Toca el color para cambiarlo')}</small></div>`;
  h+=subs.length?subs.map(s=>`<div class="subj-row"><button class="colorbtn" style="--c:${s.color}" data-act="subj-color" data-id="${s.id}" aria-label="${t('Cambiar color')}"></button><input data-in="subj-name" data-id="${s.id}" data-focus="subj-${s.id}" value="${esc(s.name)}"><button class="iconbtn" data-act="subj-del" data-id="${s.id}" aria-label="${t('Eliminar')}">${ic('trash','s16')}</button></div>`).join(''):`<div class="empty">${t('Aún no tienes asignaturas.')}</div>`;
  h+=`<div class="subj-row"><input data-in="subj-new" data-focus="subj-new" placeholder="${t('Nueva asignatura…')}" value="${esc(UI.subjNew||'')}"><button class="btn sm" data-act="subj-add">${t('Añadir')}</button></div>`;
  const sug=SUGGESTED.filter(n=>!subs.find(s=>norm(s.name)===norm(n)));
  if(sug.length) h+=`<div class="field"><span class="lbl">${t('Sugerencias (ARI)')}</span><div class="sugg">${sug.map(n=>`<button class="pill-f" data-act="subj-sugg" data-n="${esc(n)}">+ ${esc(n)}</button>`).join('')}</div></div>`;
  h+='</div></div><div class="side">';
  h+=syncCard()+installCard();
  h+=`<div class="card"><h3>${t('Copia de seguridad')}</h3><p class="howto">${t('Copia todos tus datos como texto para guardarlos donde quieras, o pega una copia para recuperarlos (también sirve para traer lo que tuvieras en la versión de claude.ai).')}</p><div class="row"><button class="btn ghost sm" data-act="export">${ic('copy','s16')}${t('Copiar mis datos')}</button></div><textarea data-in="import" data-focus="import" placeholder="${t('Pega aquí una copia para importarla…')}" style="min-height:64px">${esc(UI.importTxt||'')}</textarea><div class="row"><button class="btn ghost sm" data-act="import">${t('Importar')}</button>${UI.importMsg?`<span class="${UI.importErr?'err':'sec'}" style="font-size:12px">${esc(UI.importMsg)}</span>`:''}</div></div>`;
  h+='</div></div>';
  return h;
}
