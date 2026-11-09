begin;
create table if not exists public.vv_journey_live(id uuid primary key,user_id uuid not null unique references auth.users on delete cascade,token_hash bytea not null unique,expires_at timestamptz not null,active boolean not null default true,latitude double precision,longitude double precision,accuracy double precision,updated_at timestamptz);
alter table public.vv_journey_live enable row level security;
revoke all on public.vv_journey_live from public,anon,authenticated;
create or replace function public.vv_journey_start(p_id uuid,p_token uuid,p_minutes integer) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required';end if;
 if p_minutes not between 1 and 60 then raise exception 'Choose up to 60 minutes';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,42));
 delete from public.vv_journey_live where user_id=auth.uid();
 delete from public.vv_journey_live where expires_at<now();
 insert into public.vv_journey_live(id,user_id,token_hash,expires_at) values(p_id,auth.uid(),sha256(convert_to(p_token::text,'UTF8')),now()+make_interval(mins=>p_minutes));
end $$;
create or replace function public.vv_journey_update(p_id uuid,p_lat double precision,p_lon double precision,p_accuracy double precision) returns void language plpgsql security definer set search_path='' as $$
begin
 if p_lat is null or p_lon is null or not (p_lat between -90 and 90 and p_lon between -180 and 180) or p_accuracy is null or not (p_accuracy between 0 and 5000) then raise exception 'Valid location required';end if;
 update public.vv_journey_live set latitude=p_lat,longitude=p_lon,accuracy=p_accuracy,updated_at=now() where id=p_id and user_id=auth.uid() and active and expires_at>now();
 if not found then raise exception 'Sharing ended or unavailable';end if;
end $$;
create or replace function public.vv_journey_stop(p_id uuid) returns void language sql security definer set search_path='' as $$
 update public.vv_journey_live set active=false,latitude=null,longitude=null,accuracy=null where id=p_id and user_id=auth.uid();
$$;
create or replace function public.vv_journey_view(p_token uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('expires_at',expires_at,'updated_at',updated_at,'fresh',updated_at>now()-interval '45 seconds','latitude',case when updated_at>now()-interval '45 seconds' then latitude end,'longitude',case when updated_at>now()-interval '45 seconds' then longitude end,'accuracy',case when updated_at>now()-interval '45 seconds' then accuracy end) from public.vv_journey_live where token_hash=sha256(convert_to(p_token::text,'UTF8')) and active and expires_at>now();
$$;
revoke all on function public.vv_journey_start(uuid,uuid,integer),public.vv_journey_update(uuid,double precision,double precision,double precision),public.vv_journey_stop(uuid),public.vv_journey_view(uuid) from public,anon,authenticated;
grant execute on function public.vv_journey_start(uuid,uuid,integer),public.vv_journey_update(uuid,double precision,double precision,double precision),public.vv_journey_stop(uuid) to authenticated;
grant execute on function public.vv_journey_view(uuid) to anon,authenticated;
-- Extend existing private evidence rules to PDF/plain-text documents, preserving all leases/consent policies.
do $$ declare c record; begin
 for c in select conname from pg_constraint where conrelid='public.vv_case_evidence'::regclass and contype='c' and pg_get_constraintdef(oid) like '%mime_type%' loop execute format('alter table public.vv_case_evidence drop constraint %I',c.conname);end loop;
end $$;
alter table public.vv_case_evidence add constraint vv_evidence_payload check((kind='link' and url is not null and storage_path is null and byte_size=0) or (kind='file' and url is null and storage_path is not null and byte_size>0 and sha256 is not null and mime_type in('image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','audio/mpeg','audio/mp4','audio/wav','audio/ogg','application/pdf','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document')));
update storage.buckets set allowed_mime_types=array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','audio/mpeg','audio/mp4','audio/wav','audio/ogg','application/pdf','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document'] where id='case-evidence';
-- Clear expired positions hourly on hosted projects with the existing cron extension.
do $$ begin
 if to_regclass('cron.job') is not null then
  if not exists(select 1 from cron.job where jobname='victimvoice-journey-retention') then
   perform cron.schedule('victimvoice-journey-retention','23 * * * *','delete from public.vv_journey_live where expires_at < now();');
  end if;
 end if;
end $$;
commit;
