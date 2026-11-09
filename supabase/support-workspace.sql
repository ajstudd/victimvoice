-- Additive, repeatable support workspace. Run AFTER schema.sql and mobile-schema.sql.
-- Existing cases do not consent to volunteer access. No existing records are reset.
begin;
alter table public.support_requests add column if not exists allow_volunteer_support boolean not null default false;
grant insert (allow_volunteer_support) on public.support_requests to authenticated;

create table if not exists public.vv_support_staff (
 user_id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null check(length(btrim(display_name)) between 2 and 80),
 enabled boolean not null default true,
 approved_by uuid references auth.users(id) on delete set null,
 approved_at timestamptz not null default now()
);
create table if not exists public.vv_case_assignments (
 request_id uuid not null references public.support_requests(id) on delete cascade,
 user_id uuid not null references public.vv_support_staff(user_id) on delete cascade,
 assigned_by uuid references auth.users(id) on delete set null,
 active boolean not null default true,
 assigned_at timestamptz not null default now(),
 primary key(request_id,user_id)
);
create index if not exists vv_assignments_staff on public.vv_case_assignments(user_id,request_id) where active;
create table if not exists public.vv_case_notes (
 id uuid primary key default gen_random_uuid(),
 request_id uuid not null references public.support_requests(id) on delete cascade,
 author_id uuid references auth.users(id) on delete set null,
 author_name text not null,
 content text not null check(length(btrim(content)) between 1 and 8000),
 created_at timestamptz not null default now()
);
create index if not exists vv_notes_case on public.vv_case_notes(request_id,created_at desc);
create table if not exists public.vv_case_events (
 id uuid primary key default gen_random_uuid(),
 request_id uuid references public.support_requests(id) on delete cascade,
 actor_id uuid references auth.users(id) on delete set null,
 actor_name text not null,
 action text not null,
 subject_id uuid,
 created_at timestamptz not null default now()
);
create index if not exists vv_events_case on public.vv_case_events(request_id,created_at desc);
create table if not exists public.vv_case_evidence (
 id uuid primary key default gen_random_uuid(),
 request_id uuid not null references public.support_requests(id) on delete cascade,
 uploader_id uuid not null default auth.uid() references auth.users(id),
 kind text not null check(kind in('file','link')),
 label text not null check(length(btrim(label)) between 1 and 160),
 url text check(url is null or (length(url)<=2048 and url ~ '^https://[^[:space:]@]+$')),
 storage_path text unique,
 mime_type text,
 byte_size bigint not null default 0 check(byte_size between 0 and 10485760),
 sha256 text check(sha256 is null or sha256 ~ '^[0-9a-f]{64}$'),
 ready boolean not null default false,
 review_status text not null default 'new' check(review_status in('new','under_review','reviewed')),
 reviewed_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 check((kind='link' and url is not null and storage_path is null and byte_size=0)
    or (kind='file' and url is null and storage_path is not null and byte_size>0 and sha256 is not null
      and mime_type in('image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','audio/mpeg','audio/mp4','audio/wav','audio/ogg','application/pdf','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document')))
);
create index if not exists vv_evidence_case on public.vv_case_evidence(request_id,created_at desc);
create table if not exists public.vv_evidence_leases (
 evidence_id uuid not null references public.vv_case_evidence(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 expires_at timestamptz not null,
 primary key(evidence_id,user_id)
);
-- All writes to these tables go through checked, audited RPCs. No self-promotion.
alter table public.vv_support_staff enable row level security;
alter table public.vv_case_assignments enable row level security;
alter table public.vv_case_notes enable row level security;
alter table public.vv_case_events enable row level security;
alter table public.vv_case_evidence enable row level security;
alter table public.vv_evidence_leases enable row level security;
revoke all on public.vv_support_staff,public.vv_case_assignments,public.vv_case_notes,public.vv_case_events,public.vv_case_evidence,public.vv_evidence_leases from anon,authenticated;

create or replace function public.vv_staff_role() returns text
language sql stable security definer set search_path='' as $$
 select case when public.is_admin() then 'admin'
 when exists(select 1 from public.vv_support_staff where user_id=auth.uid() and enabled) then 'volunteer' else 'none' end;
$$;
create or replace function public.vv_can_work_case(p_request_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (public.is_admin() or exists(
 select 1 from public.vv_case_assignments a
 join public.vv_support_staff s on s.user_id=a.user_id and s.enabled
 join public.support_requests r on r.id=a.request_id and r.allow_volunteer_support
 where a.request_id=p_request_id and a.user_id=auth.uid() and a.active));
$$;
create or replace function public.vv_can_access_case(p_request_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (public.vv_can_work_case(p_request_id) or exists(
 select 1 from public.support_requests where id=p_request_id and user_id=auth.uid()));
$$;
create or replace function public.vv_actor_name() returns text
language sql stable security definer set search_path='' as $$
 select case when public.is_admin() then 'Supervisor' else coalesce(
 (select display_name from public.vv_support_staff where user_id=auth.uid() and enabled),'Case owner') end;
$$;
create or replace function public.vv_log_case(p_request_id uuid,p_action text,p_subject uuid default null) returns void
language sql security definer set search_path='' as $$
 insert into public.vv_case_events(request_id,actor_id,actor_name,action,subject_id)
 values(p_request_id,auth.uid(),public.vv_actor_name(),p_action,p_subject);
$$;
-- Private helper: callers cannot manufacture audit events.
revoke all on function public.vv_log_case(uuid,text,uuid) from public,anon,authenticated;

create or replace function public.vv_list_cases(p_page integer default 0,p_status text default '',p_search text default '') returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if public.vv_staff_role()='none' then raise exception 'Support access required' using errcode='42501'; end if;
 select coalesce(jsonb_agg(row_data),'[]'::jsonb) into result from (
 select jsonb_build_object('id',r.id,'description',left(r.description,180),'status',r.status,
 'harassment_type',r.harassment_type,'severity_level',r.severity_level,'created_at',r.created_at,
 'allow_volunteer_support',r.allow_volunteer_support,
 'message_count',(select count(*) from public.comments c where c.request_id=r.id),
 'evidence_count',(select count(*) from public.vv_case_evidence e where e.request_id=r.id and e.ready)) as row_data
 from public.support_requests r where public.vv_can_work_case(r.id)
 and (p_status='' or r.status=p_status)
 and (p_search='' or r.id::text ilike '%'||left(p_search,80)||'%' or r.description ilike '%'||left(p_search,80)||'%')
 order by r.created_at desc,r.id desc limit 25 offset greatest(0,least(p_page,10000))*25) q;
 return result;
end; $$;
create or replace function public.vv_open_case(p_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if not public.vv_can_access_case(p_request_id) then raise exception 'Case access denied' using errcode='42501'; end if;
 select jsonb_build_object('id',r.id,'description',r.description,'status',r.status,
 'harassment_type',r.harassment_type,'severity_level',r.severity_level,'created_at',r.created_at,
 'allow_volunteer_support',r.allow_volunteer_support,
 'team',coalesce((select jsonb_agg(jsonb_build_object('user_id',a.user_id,'display_name',s.display_name))
 from public.vv_case_assignments a join public.vv_support_staff s on s.user_id=a.user_id and s.enabled
 where a.request_id=r.id and a.active),'[]'::jsonb)) into result from public.support_requests r where r.id=p_request_id;
 if public.vv_can_work_case(p_request_id) then perform public.vv_log_case(p_request_id,'case_opened'); end if;
 return result;
end; $$;
create or replace function public.vv_set_volunteer(p_user_id uuid,p_display_name text,p_enabled boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Supervisor access required' using errcode='42501'; end if;
 if exists(select 1 from public.admin_users where user_id=p_user_id) then
  raise exception 'This account has supervisor privileges. Remove its admin_users membership before using restricted volunteer controls.';
 end if;
 insert into public.vv_support_staff(user_id,display_name,enabled,approved_by)
 values(p_user_id,btrim(p_display_name),p_enabled,auth.uid()) on conflict(user_id) do update
 set display_name=excluded.display_name,enabled=excluded.enabled,approved_by=auth.uid(),approved_at=now();
 if not p_enabled then update public.vv_case_assignments set active=false where user_id=p_user_id; end if;
 perform public.vv_log_case(null,case when p_enabled then 'volunteer_enabled' else 'volunteer_disabled' end,p_user_id);
end; $$;
create or replace function public.vv_list_staff() returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if not public.is_admin() then raise exception 'Supervisor access required' using errcode='42501'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('user_id',user_id,'display_name',display_name,'enabled',enabled) order by display_name),'[]'::jsonb) into result from public.vv_support_staff;
 return result;
end; $$;
create or replace function public.vv_assign_case(p_request_id uuid,p_user_id uuid,p_active boolean default true) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Supervisor access required' using errcode='42501'; end if;
 perform 1 from public.support_requests where id=p_request_id for update;
 if p_active and not exists(select 1 from public.support_requests where id=p_request_id and allow_volunteer_support) then
 raise exception 'The case owner has not consented to volunteer support'; end if;
 if p_active and not exists(select 1 from public.vv_support_staff where user_id=p_user_id and enabled) then
 raise exception 'Approve the volunteer before assigning a case'; end if;
 insert into public.vv_case_assignments(request_id,user_id,assigned_by,active)
 values(p_request_id,p_user_id,auth.uid(),p_active) on conflict(request_id,user_id)
 do update set active=excluded.active,assigned_by=auth.uid(),assigned_at=now();
 perform public.vv_log_case(p_request_id,case when p_active then 'volunteer_assigned' else 'volunteer_removed' end,p_user_id);
end; $$;
create or replace function public.vv_set_support_consent(p_request_id uuid,p_allowed boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.support_requests where id=p_request_id and user_id=auth.uid() for update;
 if not found then raise exception 'Only the case owner can change consent' using errcode='42501'; end if;
 update public.support_requests set allow_volunteer_support=p_allowed where id=p_request_id;
 if not p_allowed then update public.vv_case_assignments set active=false where request_id=p_request_id; end if;
 perform public.vv_log_case(p_request_id,case when p_allowed then 'volunteer_consent_given' else 'volunteer_consent_withdrawn' end);
end; $$;
create or replace function public.vv_set_case_status(p_request_id uuid,p_status text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.vv_can_work_case(p_request_id) then raise exception 'Case access denied' using errcode='42501'; end if;
 update public.support_requests set status=p_status where id=p_request_id;
 perform public.vv_log_case(p_request_id,'status_'||p_status);
end; $$;
create or replace function public.vv_add_case_note(p_request_id uuid,p_content text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.vv_can_work_case(p_request_id) then raise exception 'Case access denied' using errcode='42501'; end if;
 insert into public.vv_case_notes(request_id,author_id,author_name,content) values(p_request_id,auth.uid(),public.vv_actor_name(),btrim(p_content));
 perform public.vv_log_case(p_request_id,'internal_note_added');
end; $$;
create or replace function public.vv_case_activity(p_request_id uuid,p_kind text default 'events',p_page integer default 0) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if not public.vv_can_access_case(p_request_id) then raise exception 'Case access denied' using errcode='42501'; end if;
 if p_kind='notes' then
  if not public.vv_can_work_case(p_request_id) then raise exception 'Internal notes are for the assigned team' using errcode='42501'; end if;
  select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) into result from
   (select id,author_name,content,created_at from public.vv_case_notes where request_id=p_request_id order by created_at desc,id desc limit 30 offset greatest(0,least(p_page,10000))*30) q;
 else
  select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) into result from
   (select id,actor_name,action,created_at from public.vv_case_events where request_id=p_request_id and action<>'internal_note_added' order by created_at desc,id desc limit 30 offset greatest(0,least(p_page,10000))*30) q;
 end if;
 return result;
end; $$;

-- Assigned volunteers can use the conversation, but cannot read raw contact identities.
-- Raw support_requests remains owner/supervisor-only under its existing RLS policy.
drop policy if exists read_comments on public.comments;
create policy read_comments on public.comments for select to authenticated using(public.vv_can_access_case(request_id));
drop policy if exists create_comment on public.comments;
create policy create_comment on public.comments for insert to authenticated with check(author_id=auth.uid() and public.vv_can_access_case(request_id));
create or replace function public.set_comment_sender() returns trigger
language plpgsql set search_path='' as $$
begin
 new.sender:=case when public.vv_can_work_case(new.request_id) then 'admin' else 'user' end;
 return new;
end; $$;
create or replace function public.vv_audit_comment() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 perform public.vv_log_case(new.request_id,case when new.sender='admin' then 'support_reply_sent' else 'survivor_message_sent' end,new.id);
 return new;
end; $$;
drop trigger if exists vv_comment_audit on public.comments;
create trigger vv_comment_audit after insert on public.comments for each row execute function public.vv_audit_comment();

-- Original files are immutable. Pending uploads reserve a full 10 MiB so concurrent
-- uploads cannot underdeclare sizes to exceed the 50 MiB/case, 800 MiB pilot budget.
create or replace function public.vv_reserve_evidence(p_request_id uuid,p_label text,p_mime text,p_bytes bigint,p_sha256 text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare eid uuid:=gen_random_uuid(); pathname text; used bigint; n integer;
begin
 if not exists(select 1 from public.support_requests where id=p_request_id and user_id=auth.uid()) then raise exception 'Only the case owner can upload evidence' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(89213461);
 select coalesce(sum(case when ready then byte_size else 10485760 end),0),count(*) into used,n from public.vv_case_evidence where request_id=p_request_id;
 if used+10485760>52428800 or n>=20 then raise exception 'This case has reached its evidence budget (50 MiB or 20 items)'; end if;
 select coalesce(sum(case when kind='file' and not ready then 10485760 else byte_size end),0) into used from public.vv_case_evidence;
 if used+10485760>838860800 then raise exception 'The pilot evidence storage budget is full. Please contact support.'; end if;
 pathname:=p_request_id::text||'/'||eid::text;
 insert into public.vv_case_evidence(id,request_id,kind,label,storage_path,mime_type,byte_size,sha256)
 values(eid,p_request_id,'file',btrim(p_label),pathname,p_mime,p_bytes,p_sha256);
 return jsonb_build_object('id',eid,'storage_path',pathname);
end; $$;
create or replace function public.vv_finish_evidence(p_evidence_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare e public.vv_case_evidence;
begin
 select * into e from public.vv_case_evidence where id=p_evidence_id and uploader_id=auth.uid() for update;
 if not found then raise exception 'Evidence access denied' using errcode='42501'; end if;
 if e.kind<>'file' or not exists(select 1 from storage.objects where bucket_id='case-evidence' and name=e.storage_path
 and (metadata->>'size')::bigint=e.byte_size and metadata->>'mimetype'=e.mime_type) then raise exception 'The uploaded file does not match its reserved size or media type'; end if;
 if not e.ready then
 update public.vv_case_evidence set ready=true where id=e.id;
 perform public.vv_log_case(e.request_id,'evidence_shared',e.id);
 end if;
end; $$;
create or replace function public.vv_cancel_evidence(p_evidence_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare e public.vv_case_evidence;
begin
 select * into e from public.vv_case_evidence where id=p_evidence_id and uploader_id=auth.uid() and not ready for update;
 if not found then raise exception 'Only an unfinished upload can be cancelled' using errcode='42501'; end if;
 if exists(select 1 from storage.objects where bucket_id='case-evidence' and name=e.storage_path) then raise exception 'Remove the failed file before cancelling its reservation'; end if;
 delete from public.vv_case_evidence where id=e.id;
end; $$;
create or replace function public.vv_add_evidence_link(p_request_id uuid,p_label text,p_url text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.support_requests where id=p_request_id and user_id=auth.uid()) then raise exception 'Only the case owner can share evidence' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(89213461);
 if (select count(*) from public.vv_case_evidence where request_id=p_request_id)>=20 then raise exception 'A case can have at most 20 evidence items'; end if;
 if p_url ~* '^https://(localhost|127\.|10\.|192\.168\.|169\.254\.|\[|0\.|172\.(1[6-9]|2[0-9]|3[01])\.)' then raise exception 'Use a public HTTPS link'; end if;
 insert into public.vv_case_evidence(request_id,kind,label,url,ready) values(p_request_id,'link',btrim(p_label),p_url,true);
 perform public.vv_log_case(p_request_id,'evidence_link_shared');
end; $$;
create or replace function public.vv_list_evidence(p_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if not public.vv_can_access_case(p_request_id) then raise exception 'Case access denied' using errcode='42501'; end if;
 -- Link destinations and storage paths are released only through the audited open RPC.
 select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) into result from
 (select id,label,kind,mime_type,byte_size,sha256,review_status,created_at from public.vv_case_evidence
 where request_id=p_request_id and ready order by created_at desc,id desc limit 20) q;
 return result;
end; $$;
create or replace function public.vv_open_evidence(p_evidence_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare e public.vv_case_evidence;
begin
 select * into e from public.vv_case_evidence where id=p_evidence_id and ready;
 if not found or not public.vv_can_access_case(e.request_id) then raise exception 'Evidence access denied' using errcode='42501'; end if;
 insert into public.vv_evidence_leases(evidence_id,user_id,expires_at) values(e.id,auth.uid(),now()+interval '30 seconds')
 on conflict(evidence_id,user_id) do update set expires_at=excluded.expires_at;
 perform public.vv_log_case(e.request_id,'evidence_opened',e.id);
 return jsonb_build_object('id',e.id,'kind',e.kind,'storage_path',e.storage_path,'url',e.url,'mime_type',e.mime_type,'sha256',e.sha256);
end; $$;
create or replace function public.vv_review_evidence(p_evidence_id uuid,p_status text) returns void
language plpgsql security definer set search_path='' as $$
declare e public.vv_case_evidence;
begin
 select * into e from public.vv_case_evidence where id=p_evidence_id and ready;
 if not found or not public.vv_can_work_case(e.request_id) then raise exception 'Case access denied' using errcode='42501'; end if;
 update public.vv_case_evidence set review_status=p_status,reviewed_by=auth.uid() where id=e.id;
 perform public.vv_log_case(e.request_id,'evidence_'||p_status,e.id);
end; $$;
-- Storage helpers hide the lease and metadata tables from API clients.
create or replace function public.vv_evidence_storage_allowed(p_path text,p_action text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.vv_case_evidence e where e.storage_path=p_path and
 case when p_action='upload' then e.uploader_id=auth.uid() and not e.ready
 when p_action='cleanup' then e.uploader_id=auth.uid() and not e.ready
 when p_action='read' then e.ready and public.vv_can_access_case(e.request_id) and exists(
  select 1 from public.vv_evidence_leases l where l.evidence_id=e.id and l.user_id=auth.uid() and l.expires_at>now()) else false end);
$$;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('case-evidence','case-evidence',false,10485760,array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','audio/mpeg','audio/mp4','audio/wav','audio/ogg','application/pdf','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
 on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists vv_evidence_upload on storage.objects;
create policy vv_evidence_upload on storage.objects for insert to authenticated
 with check(bucket_id='case-evidence' and public.vv_evidence_storage_allowed(name,'upload'));
drop policy if exists vv_evidence_read on storage.objects;
create policy vv_evidence_read on storage.objects for select to authenticated
 using(bucket_id='case-evidence' and (
 (storage.allow_only_operation('object.get_authenticated') and public.vv_evidence_storage_allowed(name,'read')) or
 ((storage.allow_only_operation('object.delete') or storage.allow_only_operation('object.delete_many')) and public.vv_evidence_storage_allowed(name,'cleanup'))));
drop policy if exists vv_evidence_cleanup on storage.objects;
create policy vv_evidence_cleanup on storage.objects for delete to authenticated
 using(bucket_id='case-evidence' and public.vv_evidence_storage_allowed(name,'cleanup'));
-- No list, signed-link, copy/move, overwrite, or deletion of submitted originals.
-- A user who can view bytes can still copy them; these controls are not DRM.

-- Remove uploaded objects through the Storage API before deleting an account.
-- Deleting storage.objects rows with SQL does not delete their underlying files.
create or replace function public.vv_prepare_account_deletion() returns jsonb
language plpgsql security definer set search_path='' as $$
declare paths jsonb;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='28000'; end if;
 update public.vv_case_evidence set ready=false where uploader_id=auth.uid();
 select coalesce(jsonb_agg(storage_path),'[]'::jsonb) into paths from public.vv_case_evidence where uploader_id=auth.uid() and kind='file';
 return paths;
end; $$;
create or replace function public.vv_delete_my_account() returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='28000'; end if;
 if exists(select 1 from public.vv_case_evidence e join storage.objects o on o.bucket_id='case-evidence' and o.name=e.storage_path where e.uploader_id=auth.uid()) then
  raise exception 'Finish removing shared media before deleting the account. Please try account deletion again.';
 end if;
 -- Remove owned cases first: evidence also references its uploader Auth row.
 delete from public.support_requests where user_id=auth.uid();
 delete from auth.users where id=auth.uid();
end; $$;
revoke all on function public.vv_delete_my_account() from public,anon;
grant execute on function public.vv_delete_my_account() to authenticated;
-- Preserve previously submitted website links in the new, scoped evidence library.
insert into public.vv_case_evidence(request_id,uploader_id,kind,label,url,ready)
select r.id,r.user_id,'link','Previously shared image link',r.screenshot_url,true from public.support_requests r
where r.screenshot_url ~ '^https://' and not exists(select 1 from public.vv_case_evidence e where e.request_id=r.id and e.url=r.screenshot_url)
on conflict do nothing;
insert into public.vv_case_evidence(request_id,uploader_id,kind,label,url,ready)
select r.id,r.user_id,'link','Previously shared video link',r.video_url,true from public.support_requests r
where r.video_url ~ '^https://' and not exists(select 1 from public.vv_case_evidence e where e.request_id=r.id and e.url=r.video_url)
on conflict do nothing;

-- Default function EXECUTE is PUBLIC; close every new RPC/helper explicitly.
do $$ declare f record; begin
 for f in select oid::regprocedure as signature from pg_proc where pronamespace='public'::regnamespace and
 proname in('vv_staff_role','vv_can_work_case','vv_can_access_case','vv_actor_name','vv_list_cases','vv_open_case','vv_set_volunteer','vv_list_staff','vv_assign_case','vv_set_support_consent','vv_set_case_status','vv_add_case_note','vv_case_activity','vv_reserve_evidence','vv_finish_evidence','vv_cancel_evidence','vv_add_evidence_link','vv_list_evidence','vv_open_evidence','vv_review_evidence','vv_evidence_storage_allowed','vv_prepare_account_deletion') loop
 execute format('revoke all on function %s from public,anon',f.signature);
 execute format('grant execute on function %s to authenticated',f.signature);
 end loop;
end $$;
revoke all on function public.vv_audit_comment() from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
