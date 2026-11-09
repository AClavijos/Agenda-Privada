'use strict';
/* ================= ICONOS ================= */
const ICONS={
  home:'<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  tasks:'<path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/>',
  exam:'<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/><path d="M22 10v6"/>',
  calendar:'<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  user:'<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  sliders:'<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  check:'<path d="M20 6 9 17l-5-5"/>',
  flag:'<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
  left:'<path d="m15 18-6-6 6-6"/>', right:'<path d="m9 18 6-6-6-6"/>',
  pin:'<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  book:'<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>',
  steps:'<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  cloud:'<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
  cloudoff:'<path d="m2 2 20 20"/><path d="M5.78 5.78A7 7 0 0 0 9 19h8.5a4.5 4.5 0 0 0 1.31-.2"/><path d="M21.53 16.5A4.5 4.5 0 0 0 17.5 10h-1.79A7 7 0 0 0 10 5.07"/>',
  device:'<rect width="14" height="20" x="5" y="2" rx="2"/><path d="M12 18h.01"/>',
  x:'<path d="M18 6 6 18M6 6l12 12"/>',
  trash:'<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
  more:'<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  copy:'<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  bell:'<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  belloff:'<path d="M8.7 3A6 6 0 0 1 18 8a21.3 21.3 0 0 0 .6 5"/><path d="M17 17H3s3-2 3-9a4.67 4.67 0 0 1 .3-1.7"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/><path d="m2 2 20 20"/>',
  download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  globe:'<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>'
};
const ic=(n,cls='')=>`<svg class="i ${cls}" viewBox="0 0 24 24">${ICONS[n]||''}</svg>`;

/* ================= UTILIDADES ================= */
const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>{try{if(crypto.randomUUID)return crypto.randomUUID();}catch(e){} return Date.now().toString(36)+Math.random().toString(36).slice(2,10);};
const norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const isMobile=()=>window.matchMedia('(max-width: 899px)').matches;
const LS={
  get(k){try{const v=localStorage.getItem(k);return v?JSON.parse(v):null;}catch(e){return null;}},
  set(k,v){try{if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
};

/* ================= IDIOMA ================= */
const LANGS={ca:'Català',es:'Castellano',en:'English'};
let LANG=(()=>{const s=LS.get('deures:lang'); if(LANGS[s]) return s; const n=(navigator.language||'es').slice(0,2).toLowerCase(); return n==='ca'?'ca':n==='es'?'es':n==='en'?'en':'es';})();
function setLang(l){ if(!LANGS[l]) return; LANG=l; LS.set('deures:lang',l); document.documentElement.lang=l; }
document.documentElement.lang=LANG;
// t('texto en castellano', {vars}) → traducción. El castellano es la clave.
function t(s,v){ let out=(LANG!=='es'&&DICT[LANG]&&DICT[LANG][s])||s; if(v) out=out.replace(/\{(\w+)\}/g,(m,k)=>v[k]!==undefined?v[k]:m); return out; }
const tn=(n,one,many,v={})=>t(n===1?one:many,{n,...v});

/* ================= FECHAS ================= */
const p2=n=>String(n).padStart(2,'0');
const ymd=d=>`${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())}`;
const parseD=s=>{const [y,m,d]=String(s).split('-').map(Number);return new Date(y,(m||1)-1,d||1);};
const today=()=>ymd(new Date());
const addDays=(s,n)=>{const d=parseD(s);d.setDate(d.getDate()+n);return ymd(d);};
const diffDays=(a,b)=>Math.round((parseD(a)-parseD(b))/86400000);
const dowMon=s=>(parseD(s).getDay()+6)%7;
const weekStart=s=>addDays(s,-dowMon(s));
const validDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(String(s||''));
const validTime=s=>/^\d{2}:\d{2}$/.test(String(s||''));
const toMin=t=>{const [h,m]=String(t).split(':').map(Number);return h*60+(m||0);};
const fromMin=m=>`${p2(Math.floor(m/60))}:${p2(m%60)}`;
const nowMin=()=>{const d=new Date();return d.getHours()*60+d.getMinutes();};
const DN={
  es:{wd:['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'],wds:['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'],wd1:['L','M','X','J','V','S','D'],mo:['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'],mos:['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']},
  ca:{wd:['Dilluns','Dimarts','Dimecres','Dijous','Divendres','Dissabte','Diumenge'],wds:['Dl','Dt','Dc','Dj','Dv','Ds','Dg'],wd1:['dl','dt','dc','dj','dv','ds','dg'],mo:['gener','febrer','març','abril','maig','juny','juliol','agost','setembre','octubre','novembre','desembre'],mos:['gen','febr','març','abr','maig','juny','jul','ag','set','oct','nov','des']},
  en:{wd:['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],wds:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],wd1:['M','T','W','T','F','S','S'],mo:['January','February','March','April','May','June','July','August','September','October','November','December'],mos:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']}
};
const L=()=>DN[LANG]||DN.es;
const cap1=s=>s.charAt(0).toUpperCase()+s.slice(1);
const monthName=m=>cap1(L().mo[m]); // m: 0-11
const fmtShort=s=>{const d=parseD(s);return `${L().wds[dowMon(s)]} ${d.getDate()} ${L().mos[d.getMonth()]}`;};
function fmtLong(s,withWeekday=true){
  const d=parseD(s), day=d.getDate(), mo=L().mo[d.getMonth()], wd=withWeekday?L().wd[dowMon(s)]+' ':'';
  if(LANG==='en') return `${wd}${day} ${mo}`;
  if(LANG==='ca') return `${wd}${day} ${/^[aeiou]/.test(mo)?"d'":'de '}${mo}`;
  return `${wd}${day} de ${mo}`;
}
const relDay=s=>{if(!validDate(s))return t('Sin fecha');const n=diffDays(s,today());if(n===0)return t('Hoy');if(n===1)return t('Mañana');if(n===-1)return t('Ayer');return fmtShort(s);};
const inDays=n=>n===0?t('hoy'):n===1?t('mañana'):n===-1?t('ayer'):n>0?t('en {n} días',{n}):t('hace {n} días',{n:-n});

/* ================= CONSTANTES ================= */
const PALETTE=['#4C9AFF','#8B7BFF','#FF8A4C','#FF6FAE','#FFB547','#3DD68C','#FF5C6C','#2EC4B6','#B4BCCB'];
const CATS={Salud:'#FF5C6C',Deporte:'#3DD68C',Familia:'#FFB547',Social:'#FF6FAE',Recados:'#4C9AFF',Ocio:'#2EC4B6',Trabajo:'#8B7BFF',Otro:'#9AA3B5'};
const KINDS={deber:'Deber',entrega:'Entrega',examen:'Examen',personal:'Personal'};
const PRIOS={alta:'Alta',media:'Media',baja:'Baja'};
const kindName=k=>t(KINDS[k]||k); const catName=c=>t(c); const prioName=p=>t(PRIOS[p]||p);
const SUGGESTED=['Sistemes elèctrics','Seqüencials programables','Mesura i regulació','Sistemes de potència','Documentació tècnica','Informàtica industrial','Programables avançats','Robòtica industrial','Comunicacions industrials','Integració de sistemes','Projecte','Anglès'];
const VIEWS=['hoy','deberes','examenes','calendario','horario','personal','ajustes'];
const PERSONAL_COLOR='#2EC4B6', EXAM_COLOR='#FF5C6C';
const DEFAULT_NOTIF={on:true,tasks:true,exams:true,personal:true,morning:'08:00',evening:'20:00'};
