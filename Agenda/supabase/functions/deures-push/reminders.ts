// Deures · cálculo de avisos (lógica pura, sin red) — se puede probar con Deno.
export type Item = { id: string; kind: string; title: string; subjectId?: string; date?: string; time?: string;
  done?: boolean; deleted?: boolean; steps?: { text: string; done: boolean }[]; place?: string; category?: string };
export type Notif = { on?: boolean; tasks?: boolean; exams?: boolean; personal?: boolean; morning?: string; evening?: string };
export type Settings = { subjects?: { id: string; name: string }[]; notif?: Notif; lang?: string; tz?: string };
export type Reminder = { key: string; fireAt: number; title: string; body: string; url: string; tag: string };

const T: Record<string, Record<string, string>> = {
  es: { due_tomorrow: 'Mañana tienes que entregar', due_today_at: 'Hoy a las {h}: {t}', day_title: 'Tu día de hoy', deliver: 'Entregar', exam: 'Examen',
    exam_in3: 'Examen en 3 días: {t}', exam_tomorrow: 'Examen mañana: {t}', at: 'a las {h}', left: 'Te quedan {n} de {m} temas por repasar',
    all_done: '¡Ya lo tienes todo repasado!', no_topics: 'Apunta los temas en la app para organizar el repaso', steps_left: 'Te quedan {n} de {m} pasos', and_more: 'y {n} más',
    test_title: 'Deures', test_body: '¡Las notificaciones funcionan en este dispositivo!' },
  ca: { due_tomorrow: 'Demà has de lliurar', due_today_at: 'Avui a les {h}: {t}', day_title: "El teu dia d'avui", deliver: 'Lliurar', exam: 'Examen',
    exam_in3: "Examen d'aquí a 3 dies: {t}", exam_tomorrow: 'Examen demà: {t}', at: 'a les {h}', left: 'Et queden {n} de {m} temes per repassar',
    all_done: 'Ja ho tens tot repassat!', no_topics: "Apunta els temes a l'app per organitzar el repàs", steps_left: 'Et queden {n} de {m} passos', and_more: 'i {n} més',
    test_title: 'Deures', test_body: 'Les notificacions funcionen en aquest dispositiu!' },
  en: { due_tomorrow: 'Due tomorrow', due_today_at: 'Today at {h}: {t}', day_title: 'Your day today', deliver: 'Due', exam: 'Exam',
    exam_in3: 'Exam in 3 days: {t}', exam_tomorrow: 'Exam tomorrow: {t}', at: 'at {h}', left: '{n} of {m} topics left to revise',
    all_done: "You've revised everything!", no_topics: 'Add the topics in the app to plan your revision', steps_left: '{n} of {m} steps left', and_more: 'and {n} more',
    test_title: 'Deures', test_body: 'Notifications are working on this device!' },
};
export function tr(lang: string, k: string, v: Record<string, string | number> = {}) {
  const s = (T[lang] || T.es)[k] || T.es[k] || k;
  return s.replace(/\{(\w+)\}/g, (_m, x) => (v[x] !== undefined ? String(v[x]) : _m));
}

// ---------- fechas con zona horaria ----------
function tzOffsetMs(utcMs: number, tz: string) {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const p: Record<string, string> = {};
  for (const x of f.formatToParts(new Date(utcMs))) p[x.type] = x.value;
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - utcMs;
}
export function localToUtc(date: string, time: string, tz: string) {
  const [y, m, d] = date.split('-').map(Number); const [hh, mm] = time.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const off = tzOffsetMs(guess, tz); let res = guess - off;
  const off2 = tzOffsetMs(res, tz); if (off2 !== off) res = guess - off2;
  return res;
}
export function localDate(utcMs: number, tz: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(utcMs));
}
export function addDays(date: string, n: number) {
  const [y, m, d] = date.split('-').map(Number); const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}
const validTime = (t?: string) => !!t && /^\d{2}:\d{2}$/.test(t);
const validDate = (d?: string) => !!d && /^\d{4}-\d{2}-\d{2}$/.test(d);
const H = 3600000, M = 60000;

function list(lang: string, names: string[], max = 3) {
  const shown = names.slice(0, max).join(' · ');
  return names.length > max ? `${shown} ${tr(lang, 'and_more', { n: names.length - max })}` : shown;
}

// ---------- reglas ----------
export function computeReminders(now: number, s: Settings, rawItems: Item[], fallbackLang = 'es', fallbackTz = 'Europe/Madrid'): Reminder[] {
  const n: Notif = { on: true, tasks: true, exams: true, personal: true, morning: '08:00', evening: '20:00', ...(s.notif || {}) };
  if (n.on === false) return [];
  const lang = T[s.lang || ''] ? s.lang! : (T[fallbackLang] ? fallbackLang : 'es');
  let tz = s.tz || fallbackTz; try { new Intl.DateTimeFormat('en', { timeZone: tz }); } catch { tz = 'Europe/Madrid'; }
  const morning = validTime(n.morning) ? n.morning! : '08:00', evening = validTime(n.evening) ? n.evening! : '20:00';
  const subjName = (id?: string) => (s.subjects || []).find((x) => x.id === id)?.name || '';
  const items = rawItems.filter((i) => i && !i.deleted && validDate(i.date));
  const today = localDate(now, tz);
  const out: Reminder[] = [];
  // días relevantes: ayer (por si el cron llega tarde), hoy y los próximos 4
  const days = [-1, 0, 1, 2, 3, 4].map((k) => addDays(today, k));

  for (const day of days) {
    const ofDay = items.filter((i) => i.date === day);
    const tasks = ofDay.filter((i) => (i.kind === 'deber' || i.kind === 'entrega') && !i.done);
    const examsD = ofDay.filter((i) => i.kind === 'examen');
    const pers = ofDay.filter((i) => i.kind === 'personal').sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));

    // Entregas: la víspera por la tarde (agrupadas)
    if (n.tasks && tasks.length) {
      out.push({ key: `tt:${day}`, fireAt: localToUtc(addDays(day, -1), evening, tz), title: tr(lang, 'due_tomorrow'),
        body: list(lang, tasks.map((i) => i.title + (i.time ? ` (${i.time})` : ''))), url: '#deberes', tag: `tt-${day}` });
    }
    // Entregas con hora: el mismo día 3 h antes (nunca antes de "primera hora" salvo que no dé tiempo)
    if (n.tasks) for (const i of tasks.filter((x) => validTime(x.time))) {
      const due = localToUtc(day, i.time!, tz); let fire = due - 3 * H; const mor = localToUtc(day, morning, tz);
      if (fire < mor) fire = Math.min(mor, due - 30 * M);
      const st = i.steps || []; const left = st.filter((x) => !x.done).length;
      const body = [subjName(i.subjectId), st.length && left ? tr(lang, 'steps_left', { n: left, m: st.length }) : ''].filter(Boolean).join(' · ');
      out.push({ key: `ts:${i.id}:${day}T${i.time}`, fireAt: fire, title: tr(lang, 'due_today_at', { h: i.time!, t: i.title }), body, url: '#deberes', tag: `ts-${i.id}` });
    }
    // Resumen a primera hora: planes personales + entregas sin hora + exámenes de hoy
    const lines: string[] = [];
    if (n.personal && pers.length) lines.push(pers.map((p) => p.title + (p.time ? ` ${p.time}` : '')).join(' · '));
    if (n.tasks) { const nt = tasks.filter((x) => !validTime(x.time)); if (nt.length) lines.push(`${tr(lang, 'deliver')}: ${list(lang, nt.map((x) => x.title))}`); }
    if (n.exams && examsD.length) lines.push(examsD.map((e) => `${tr(lang, 'exam')}: ${e.title}${e.time ? ' ' + e.time : ''}`).join(' · '));
    if (lines.length) out.push({ key: `md:${day}`, fireAt: localToUtc(day, morning, tz), title: tr(lang, 'day_title'), body: lines.join('\n'), url: n.personal && pers.length && lines.length === 1 ? '#personal' : '#hoy', tag: `md-${day}` });
    // Exámenes: 3 días antes y la víspera, por la tarde
    if (n.exams) for (const e of examsD) {
      const st = e.steps || []; const left = st.filter((x) => !x.done).length;
      const topics = !st.length ? tr(lang, 'no_topics') : left ? tr(lang, 'left', { n: left, m: st.length }) : tr(lang, 'all_done');
      const sub = subjName(e.subjectId);
      out.push({ key: `e3:${e.id}:${day}`, fireAt: localToUtc(addDays(day, -3), evening, tz), title: tr(lang, 'exam_in3', { t: e.title }), body: [sub, topics].filter(Boolean).join(' · '), url: '#examenes', tag: `e-${e.id}` });
      out.push({ key: `e1:${e.id}:${day}`, fireAt: localToUtc(addDays(day, -1), evening, tz), title: tr(lang, 'exam_tomorrow', { t: e.title }),
        body: [sub + (e.time ? ` ${tr(lang, 'at', { h: e.time })}` : ''), topics].filter(Boolean).join(' · '), url: '#examenes', tag: `e-${e.id}` });
    }
  }
  return out;
}
export function dueNow(rems: Reminder[], now: number, windowMs = 40 * M) {
  return rems.filter((r) => r.fireAt <= now && r.fireAt > now - windowMs);
}
export function testMessage(lang: string) {
  return { title: tr(lang, 'test_title'), body: tr(lang, 'test_body'), url: '#ajustes', tag: 'test' };
}
