-- ================================================================
-- Deures · base de datos (Supabase)
-- Pégalo entero en SQL Editor → Run. Se puede ejecutar varias veces.
-- ================================================================

-- Ajustes de cada usuario (asignaturas, horario, idioma, avisos…)
create table if not exists public.settings (
  user_id    uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Deberes, entregas, exámenes y eventos personales
create table if not exists public.items (
  id         text primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);
create index if not exists items_user_idx on public.items(user_id);

-- Dispositivos con avisos activados
create table if not exists public.push_subscriptions (
  endpoint   text primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  p256dh     text not null,
  auth       text not null,
  device     text,
  lang       text,
  tz         text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_ok    timestamptz
);
create index if not exists push_user_idx on public.push_subscriptions(user_id);

-- Registro de avisos ya enviados (evita duplicados) · solo lo usa el servidor
create table if not exists public.push_log (
  user_id uuid not null references auth.users(id) on delete cascade,
  key     text not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, key)
);

-- Configuración interna (claves VAPID, clave del cron) · solo el servidor
create table if not exists public.app_config (
  key   text primary key,
  value text not null
);
insert into public.app_config(key, value)
values ('cron_key', replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''))
on conflict (key) do nothing;

-- ---------- Seguridad: cada usuario solo ve lo suyo ----------
alter table public.settings           enable row level security;
alter table public.items              enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.push_log           enable row level security;  -- sin políticas: nadie desde la app
alter table public.app_config         enable row level security;  -- sin políticas: nadie desde la app

drop policy if exists "own settings" on public.settings;
create policy "own settings" on public.settings for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "own items" on public.items;
create policy "own items" on public.items for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "own push" on public.push_subscriptions;
create policy "own push" on public.push_subscriptions for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- ---------- Tiempo real ----------
do $$ begin
  begin alter publication supabase_realtime add table public.items;    exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.settings; exception when duplicate_object then null; end;
end $$;
