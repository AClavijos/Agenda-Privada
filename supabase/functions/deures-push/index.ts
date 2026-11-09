// Deures · Edge Function "deures-push"
//   GET  ?op=key   → clave pública VAPID (la crea la primera vez)
//   POST ?op=test  → notificación de prueba al usuario que llama (requiere su sesión)
//   POST ?op=run   → envía los avisos que tocan ahora (lo llama el cron cada 5 min con x-cron-key)
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { computeReminders, dueNow, testMessage, type Item, type Settings } from './reminders.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
function serviceKey() {
  const k = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); if (k) return k;
  try { const j = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}'); return j.default || Object.values(j)[0] as string; } catch { return ''; }
}
const db = createClient(SUPABASE_URL, serviceKey(), { auth: { persistSession: false, autoRefreshToken: false } });
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-key', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

type Sub = { endpoint: string; user_id: string; p256dh: string; auth: string; lang?: string; tz?: string };
type Cfg = { vapid: { publicKey: string; privateKey: string }; site: string; cron_key: string };

async function getCfg(origin?: string | null): Promise<Cfg> {
  const { data, error } = await db.from('app_config').select('key,value');
  if (error) throw error;
  const m: Record<string, string> = Object.fromEntries((data || []).map((r) => [r.key, r.value]));
  if (!m.vapid) {
    const k = webpush.generateVAPIDKeys();
    await db.from('app_config').upsert({ key: 'vapid', value: JSON.stringify(k) }, { onConflict: 'key', ignoreDuplicates: true });
    return getCfg(origin);
  }
  if (!m.site && origin && /^https:\/\//.test(origin)) {
    await db.from('app_config').upsert({ key: 'site', value: origin }, { onConflict: 'key', ignoreDuplicates: true });
    m.site = origin;
  }
  return { vapid: JSON.parse(m.vapid), site: m.site || 'https://github.com', cron_key: m.cron_key || '' };
}

// Cifra con web-push y envía con fetch (más fiable en Deno que el módulo https de Node)
async function send(cfg: Cfg, sub: Sub, payload: Record<string, unknown>) {
  const det = webpush.generateRequestDetails(
    { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
    JSON.stringify(payload),
    { vapidDetails: { subject: cfg.site, publicKey: cfg.vapid.publicKey, privateKey: cfg.vapid.privateKey }, TTL: 6 * 3600, urgency: 'high' },
  );
  const res = await fetch(det.endpoint, { method: det.method, headers: det.headers as Record<string, string>, body: det.body });
  if (res.status === 404 || res.status === 410) { await db.from('push_subscriptions').delete().eq('endpoint', sub.endpoint); return 'gone'; }
  if (!res.ok) return `error ${res.status}`;
  await db.from('push_subscriptions').update({ last_ok: new Date().toISOString() }).eq('endpoint', sub.endpoint);
  return 'ok';
}

async function run(cfg: Cfg) {
  const now = Date.now();
  const { data: subs, error } = await db.from('push_subscriptions').select('endpoint,user_id,p256dh,auth,lang,tz');
  if (error) throw error;
  const byUser = new Map<string, Sub[]>();
  for (const s of (subs || []) as Sub[]) byUser.set(s.user_id, [...(byUser.get(s.user_id) || []), s]);
  const stats = { users: byUser.size, due: 0, sent: 0, failed: 0 };
  for (const [userId, us] of byUser) {
    const [{ data: st }, { data: rows }] = await Promise.all([
      db.from('settings').select('data').eq('user_id', userId).maybeSingle(),
      db.from('items').select('data').eq('user_id', userId),
    ]);
    const settings = ((st && st.data) || {}) as Settings;
    const items = ((rows || []) as { data: Item }[]).map((r) => r.data);
    const due = dueNow(computeReminders(now, settings, items, us[0].lang || 'es', us[0].tz || 'Europe/Madrid'), now);
    stats.due += due.length;
    for (const r of due) {
      // "reclama" el aviso antes de enviarlo: si otra ejecución ya lo envió, no se repite
      const { data: claimed } = await db.from('push_log').upsert({ user_id: userId, key: r.key }, { onConflict: 'user_id,key', ignoreDuplicates: true }).select('key');
      if (!claimed || !claimed.length) continue;
      for (const s of us) {
        try { const x = await send(cfg, s, { title: r.title, body: r.body, url: r.url, tag: r.tag }); x === 'ok' ? stats.sent++ : stats.failed++; }
        catch { stats.failed++; }
      }
    }
  }
  await db.from('push_log').delete().lt('sent_at', new Date(now - 45 * 86400000).toISOString());
  return stats;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const op = new URL(req.url).searchParams.get('op') || 'run';
  try {
    const cfg = await getCfg(req.headers.get('origin'));
    if (op === 'key') return json({ publicKey: cfg.vapid.publicKey });
    if (op === 'test') {
      const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
      const { data: u } = await db.auth.getUser(token);
      if (!u || !u.user) return json({ error: 'not signed in' }, 401);
      let lang = 'es'; try { lang = (await req.json()).lang || 'es'; } catch { /* sin cuerpo */ }
      const { data: subs } = await db.from('push_subscriptions').select('endpoint,user_id,p256dh,auth').eq('user_id', u.user.id);
      let sent = 0; for (const s of (subs || []) as Sub[]) if ((await send(cfg, s, testMessage(lang))) === 'ok') sent++;
      return json({ sent, devices: (subs || []).length });
    }
    if (op === 'run') {
      if (!cfg.cron_key || req.headers.get('x-cron-key') !== cfg.cron_key) return json({ error: 'forbidden' }, 403);
      return json(await run(cfg));
    }
    return json({ error: 'unknown op' }, 400);
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
