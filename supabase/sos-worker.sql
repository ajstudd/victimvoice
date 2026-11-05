-- OPTIONAL: run only after deploying the SOS function and configuring worker secrets.
-- In Supabase Vault create two secrets through the Dashboard (never paste secrets into chat):
-- vv_sos_worker_url = https://pkjnhdrookwdbaavsjks.supabase.co/functions/v1/sos
-- vv_sos_worker_secret = the same 32+ random characters as the Edge secret VV_SOS_WORKER_SECRET
create extension if not exists pg_cron;
create extension if not exists pg_net;
do $$ begin
 if exists(select 1 from cron.job where jobname='victimvoice-sos-outbox') then
  perform cron.unschedule('victimvoice-sos-outbox');
 end if;
end $$;
do $$ begin
 if exists(select 1 from cron.job where jobname='victimvoice-sos-retention') then
  perform cron.unschedule('victimvoice-sos-retention');
 end if;
end $$;
select cron.schedule('victimvoice-sos-retention','17 * * * *','select public.vv_sos_cleanup();');
select cron.schedule('victimvoice-sos-outbox','* * * * *',$job$
 select net.http_post(
  url:=(select decrypted_secret from vault.decrypted_secrets where name='vv_sos_worker_url' limit 1),
  headers:=jsonb_build_object('Content-Type','application/json','x-sos-worker-key',(select decrypted_secret from vault.decrypted_secrets where name='vv_sos_worker_secret' limit 1)),
  body:='{"action":"drain"}'::jsonb,timeout_milliseconds:=50000
 );
$job$);
