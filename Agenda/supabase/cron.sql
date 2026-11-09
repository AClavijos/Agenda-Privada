-- ================================================================
-- Deures · comprobar avisos cada 5 minutos
-- Cambia TU-PROYECTO por el identificador de tu proyecto (lo que va antes de .supabase.co)
-- ================================================================
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

select cron.unschedule('deures-push') where exists (select 1 from cron.job where jobname = 'deures-push');

select cron.schedule(
  'deures-push',
  '*/5 * * * *',
  $$
  select net.http_post(
    url     := 'https://TU-PROYECTO.supabase.co/functions/v1/deures-push?op=run',
    headers := jsonb_build_object('Content-Type', 'application/json',
                                  'x-cron-key', (select value from public.app_config where key = 'cron_key')),
    body    := '{}'::jsonb,
    timeout_milliseconds := 25000
  );
  $$
);
