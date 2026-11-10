-- Additive, repeatable. Apply after support-workspace.sql, sos.sql and journey-sharing.sql.
-- Existing accounts/cases are preserved; legacy volunteer approvals require a new review.
begin;
do $governance_install$
declare geo_schema text; ddl text := $governance_ddl$
create table if not exists public.vv_workforce (
 user_id uuid primary key references auth.users on delete cascade,
 display_name text not null check(length(btrim(display_name)) between 2 and 80),
 organisation text not null check(length(btrim(organisation)) between 2 and 120),
 region text not null references public.vv_sos_regions,
 requested_role text not null check(requested_role in('case_worker','support_volunteer','emergency_responder')),
 languages text not null check(length(btrim(languages)) between 2 and 250),
 skills text not null check(length(btrim(skills)) between 2 and 500),
 status text not null default 'pending' check(status in('pending','probation','approved','suspended','rejected')),
 supervisor_id uuid references auth.users,
 identity_checked boolean not null default false,reference_checked boolean not null default false,
 interview_checked boolean not null default false,training_checked boolean not null default false,
 confidentiality_checked boolean not null default false,
 review_reference text check(length(review_reference)<=300),reviewed_by uuid references auth.users,
 review_due timestamptz,available_until timestamptz,created_at timestamptz not null default now()
);
create table if not exists public.vv_workforce_invites (
 id uuid primary key default gen_random_uuid(),token_hash text not null unique,
 account_id uuid not null references auth.users on delete cascade,
 role text not null check(role in('case_worker','support_volunteer','emergency_responder')),
 region text not null references public.vv_sos_regions,
 created_by uuid not null references auth.users,expires_at timestamptz not null default now()+interval '7 days',
 consumed_at timestamptz
);
create table if not exists public.vv_worker_blocks (
 owner_id uuid references auth.users on delete cascade,worker_id uuid references auth.users on delete cascade,
 created_at timestamptz not null default now(),primary key(owner_id,worker_id)
);
create table if not exists public.vv_safety_reports (
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users on delete cascade,
 worker_id uuid not null references auth.users on delete cascade,request_id uuid references public.support_requests on delete set null,
 event_id uuid references public.vv_sos_events on delete set null,
 reason text not null check(length(btrim(reason)) between 5 and 2000),
 state text not null default 'new' check(state in('new','reviewing','closed')),
 resolution text check(length(resolution)<=2000),reviewed_by uuid references auth.users,created_at timestamptz not null default now()
);
create table if not exists public.vv_evidence_grants (
 evidence_id uuid references public.vv_case_evidence on delete cascade,
 worker_id uuid references auth.users on delete cascade,
 granted_by uuid not null references auth.users,expires_at timestamptz not null default now()+interval '7 days',
 primary key(evidence_id,worker_id)
);
alter table public.vv_case_assignments add column if not exists accepted_at timestamptz;
alter table public.vv_case_assignments add column if not exists acknowledge_by timestamptz not null default now()+interval '15 minutes';
alter table public.vv_case_assignments add column if not exists expires_at timestamptz not null default now()+interval '7 days';
alter table public.vv_case_assignments add column if not exists conflict_clear boolean not null default false;
alter table public.vv_sos_offers add column if not exists dispatched_by uuid references auth.users;
alter table public.vv_sos_offers add column if not exists access_until timestamptz;
-- AAL is checked on the server, not a browser flag. Identity-only role RPCs remain available to route to MFA.
create or replace function public.vv_staff_mfa() returns boolean language sql stable set search_path='' as $$select coalesce(auth.jwt()->>'aal','')='aal2'$$;
create or replace function public.vv_supervisor() returns boolean language sql stable security definer set search_path='' as $$select public.is_admin() and public.vv_staff_mfa()$$;
create or replace function public.vv_worker_eligible(p_user uuid,p_role text default null) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.vv_workforce w where w.user_id=p_user and w.status in('probation','approved')
 and w.review_due>now() and w.identity_checked and w.reference_checked and w.interview_checked and w.training_checked and w.confidentiality_checked
 and w.supervisor_id is not null and exists(select 1 from public.admin_users a where a.user_id=w.supervisor_id)
 and (p_role is null or w.requested_role=p_role));
$$;
create or replace function public.vv_worker_blocked(p_owner uuid,p_worker uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.vv_worker_blocks where owner_id=p_owner and worker_id=p_worker)$$;
create or replace function public.vv_can_work_case(p_request_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.vv_staff_mfa() and (public.vv_supervisor() or exists(
 select 1 from public.vv_case_assignments a join public.vv_support_staff s on s.user_id=a.user_id and s.enabled
 join public.support_requests r on r.id=a.request_id join public.vv_workforce w on w.user_id=a.user_id
 where r.id=p_request_id and a.user_id=auth.uid() and a.active and a.accepted_at is not null and a.conflict_clear and a.expires_at>now()
 and public.vv_worker_eligible(a.user_id) and w.requested_role in('case_worker','support_volunteer')
 and (w.requested_role='case_worker' or r.allow_volunteer_support) and not public.vv_worker_blocked(r.user_id,a.user_id)));
$$;
create or replace function public.vv_can_view_evidence(p_evidence uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.vv_case_evidence e join public.support_requests r on r.id=e.request_id where e.id=p_evidence and
 (r.user_id=auth.uid() or public.vv_supervisor() or (public.vv_can_work_case(r.id) and exists(select 1 from public.vv_evidence_grants g where g.evidence_id=e.id and g.worker_id=auth.uid() and g.expires_at>now()))));
$$;
-- Raw contact identities remain restricted to owner / MFA supervisor.
drop policy if exists read_requests on public.support_requests;
create policy read_requests on public.support_requests for select to authenticated using(user_id=auth.uid() or public.vv_supervisor());
drop policy if exists admin_update_status on public.support_requests;
create policy admin_update_status on public.support_requests for update to authenticated using(public.vv_supervisor()) with check(public.vv_supervisor());

create or replace function public.vv_create_worker_invite(p_account uuid,p_role text,p_region text) returns text language plpgsql security definer set search_path='' as $$
declare token text:=gen_random_uuid()::text;
begin
 if not public.vv_supervisor() then raise exception 'Supervisor sign-in with two-step verification required';end if;
 if exists(select 1 from public.admin_users where user_id=p_account) then raise exception 'Supervisors cannot enroll as restricted workers';end if;
 if (select count(*) from public.vv_workforce_invites where created_by=auth.uid() and expires_at>now() and consumed_at is null)>=30 then raise exception 'Review or revoke existing invitations first';end if;
 insert into public.vv_workforce_invites(token_hash,account_id,role,region,created_by) values(encode(sha256(convert_to(token,'UTF8')),'hex'),p_account,p_role,p_region,auth.uid());
 perform public.vv_log_case(null,'worker_invited',p_account);return token;
end $$;
create or replace function public.vv_apply_worker(p_token text,p_name text,p_organisation text,p_languages text,p_skills text) returns void language plpgsql security definer set search_path='' as $$
declare i public.vv_workforce_invites;
begin
 if auth.uid() is null then raise exception 'Sign in to submit your application';end if;
 select * into i from public.vv_workforce_invites where token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') and account_id=auth.uid() and consumed_at is null and expires_at>now() for update;
 if not found then raise exception 'This invitation is invalid, expired or for a different account';end if;
 if exists(select 1 from public.vv_workforce where user_id=auth.uid()) then raise exception 'An application already exists. Ask your supervisor to review it';end if;
 insert into public.vv_workforce(user_id,display_name,organisation,region,requested_role,languages,skills,supervisor_id)
 values(auth.uid(),btrim(p_name),btrim(p_organisation),i.region,i.role,btrim(p_languages),btrim(p_skills),i.created_by);
 if i.role='emergency_responder' then insert into public.vv_sos_responders(user_id,display_name,region_id) values(auth.uid(),btrim(p_name),i.region) on conflict(user_id) do update set approved=false,duty_until=null;end if;
 update public.vv_workforce_invites set consumed_at=now() where id=i.id;
 perform public.vv_log_case(null,'worker_application',auth.uid());
end $$;
create or replace function public.vv_review_worker(p_user uuid,p_status text,p_checks boolean,p_reference text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.vv_supervisor() or p_user=auth.uid() then raise exception 'Independent supervisor review required';end if;
 if p_status in('probation','approved') and (not coalesce(p_checks,false) or length(btrim(coalesce(p_reference,'')))<5) then raise exception 'Complete identity, reference, interview, training and confidentiality checks and record a review reference';end if;
 update public.vv_workforce set status=p_status,identity_checked=p_checks,reference_checked=p_checks,interview_checked=p_checks,training_checked=p_checks,confidentiality_checked=p_checks,
 review_reference=p_reference,reviewed_by=auth.uid(),supervisor_id=auth.uid(),review_due=now()+case when p_status='probation' then interval '30 days' else interval '90 days' end,available_until=null where user_id=p_user;
 if not found then raise exception 'An invited application is required before approval';end if;
 if p_status in('probation','approved') then
 insert into public.vv_support_staff(user_id,display_name,enabled,approved_by) select user_id,display_name,true,auth.uid() from public.vv_workforce where user_id=p_user and requested_role in('case_worker','support_volunteer')
 on conflict(user_id) do update set enabled=true,display_name=excluded.display_name,approved_by=auth.uid();
 else
 update public.vv_support_staff set enabled=false where user_id=p_user;
 update public.vv_case_assignments set active=false where user_id=p_user;
 delete from public.vv_evidence_grants where worker_id=p_user;
 delete from public.vv_evidence_leases where user_id=p_user;
 update public.vv_sos_responders set approved=false,duty_until=null,position=null,position_at=null where user_id=p_user;
 update public.vv_sos_offers set access_until=null where responder_id=p_user;
 end if;
 perform public.vv_log_case(null,'worker_'||p_status,p_user);
end $$;
create or replace function public.vv_worker_availability(p_on boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.vv_staff_mfa() or not public.vv_worker_eligible(auth.uid()) then raise exception 'Reviewed worker account and two-step verification required';end if;
 update public.vv_workforce set available_until=case when p_on then now()+interval '4 hours' else null end where user_id=auth.uid();
end $$;
-- Old public enrollment and approval controls cannot bypass the new review process.
create or replace function public.vv_sos_apply(p_region text,p_name text) returns void language plpgsql security definer set search_path='' as $$begin raise exception 'Ask a partner supervisor for an account-bound invitation and apply in Team enrollment';end $$;
create or replace function public.vv_set_volunteer(p_user_id uuid,p_display_name text,p_enabled boolean) returns void language plpgsql security definer set search_path='' as $$begin raise exception 'Use Team enrollment to review or suspend this worker';end $$;

create or replace function public.vv_assign_case(p_request_id uuid,p_user_id uuid,p_active boolean default true) returns void language plpgsql security definer set search_path='' as $$
declare r public.support_requests;w public.vv_workforce;
begin
 if not public.vv_supervisor() then raise exception 'Supervisor sign-in with two-step verification required';end if;
 select * into r from public.support_requests where id=p_request_id for update;
 if not found then raise exception 'Case not found';end if;
 select * into w from public.vv_workforce where user_id=p_user_id for update;
 if p_active then
 if not public.vv_worker_eligible(p_user_id) or w.requested_role not in('case_worker','support_volunteer') or not exists(select 1 from public.vv_support_staff where user_id=p_user_id and enabled) or w.available_until is null or w.available_until<=now() then raise exception 'Choose a reviewed, available support worker';end if;
 if w.requested_role='support_volunteer' and not r.allow_volunteer_support then raise exception 'The case owner has not consented to volunteer support';end if;
 if public.vv_worker_blocked(r.user_id,p_user_id) then raise exception 'This owner has blocked that worker';end if;
 if (select count(*) from public.vv_case_assignments where user_id=p_user_id and active and expires_at>now() and (accepted_at is not null or acknowledge_by>now()))>=(case when w.status='probation' then 1 else 5 end) then raise exception 'Worker has reached the assignment limit';end if;
 end if;
 insert into public.vv_case_assignments(request_id,user_id,assigned_by,active,accepted_at,acknowledge_by,expires_at,conflict_clear)
 values(p_request_id,p_user_id,auth.uid(),p_active,null,now()+interval '15 minutes',now()+interval '7 days',false)
 on conflict(request_id,user_id) do update set active=p_active,assigned_by=auth.uid(),assigned_at=now(),accepted_at=null,acknowledge_by=excluded.acknowledge_by,expires_at=excluded.expires_at,conflict_clear=false;
 delete from public.vv_evidence_grants where worker_id=p_user_id and evidence_id in(select id from public.vv_case_evidence where request_id=p_request_id);
 perform public.vv_log_case(p_request_id,case when p_active then 'worker_assigned' else 'worker_removed' end,p_user_id);
end $$;
create or replace function public.vv_accept_case(p_request_id uuid,p_no_conflict boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.vv_staff_mfa() or not public.vv_worker_eligible(auth.uid()) or not coalesce(p_no_conflict,false) then raise exception 'Two-step verification and conflict-of-interest confirmation required';end if;
 update public.vv_case_assignments a set accepted_at=now(),conflict_clear=true from public.support_requests r,public.vv_workforce w
 where a.request_id=p_request_id and a.user_id=auth.uid() and a.active and a.accepted_at is null and a.acknowledge_by>now() and a.expires_at>now() and r.id=a.request_id and w.user_id=a.user_id and w.requested_role in('case_worker','support_volunteer') and (w.requested_role='case_worker' or r.allow_volunteer_support) and not public.vv_worker_blocked(r.user_id,a.user_id);
 if not found then raise exception 'This assignment is no longer available';end if;
 perform public.vv_log_case(p_request_id,'assignment_acknowledged',auth.uid());
end $$;
create or replace function public.vv_my_assignments() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.vv_staff_mfa() or not public.vv_worker_eligible(auth.uid()) then return '[]'::jsonb;end if;
 return(select coalesce(jsonb_agg(jsonb_build_object('request_id',a.request_id,'acknowledge_by',a.acknowledge_by,'accepted_at',a.accepted_at,'expires_at',a.expires_at,'severity',r.severity_level)),'[]') from public.vv_case_assignments a join public.support_requests r on r.id=a.request_id join public.vv_workforce w on w.user_id=a.user_id where a.user_id=auth.uid() and a.active and a.expires_at>now() and (a.accepted_at is not null or a.acknowledge_by>now()) and (w.requested_role='case_worker' or r.allow_volunteer_support) and not public.vv_worker_blocked(r.user_id,a.user_id));
end $$;

create or replace function public.vv_set_evidence_grant(p_evidence uuid,p_worker uuid,p_allowed boolean) returns void language plpgsql security definer set search_path='' as $$
declare rid uuid;
begin
 select e.request_id into rid from public.vv_case_evidence e join public.support_requests r on r.id=e.request_id where e.id=p_evidence and r.user_id=auth.uid();
 if rid is null then raise exception 'Only the case owner can share this evidence';end if;
 if p_allowed then
 if not exists(select 1 from public.vv_case_assignments where request_id=rid and user_id=p_worker and active and accepted_at is not null and expires_at>now()) or not public.vv_worker_eligible(p_worker) or public.vv_worker_blocked(auth.uid(),p_worker) then raise exception 'Choose an active member of your assigned team';end if;
 insert into public.vv_evidence_grants values(p_evidence,p_worker,auth.uid(),now()+interval '7 days') on conflict(evidence_id,worker_id) do update set expires_at=excluded.expires_at;
 else delete from public.vv_evidence_grants where evidence_id=p_evidence and worker_id=p_worker;delete from public.vv_evidence_leases where evidence_id=p_evidence and user_id=p_worker;
 end if;
 perform public.vv_log_case(rid,case when p_allowed then 'evidence_access_given' else 'evidence_access_removed' end,p_worker);
end $$;
create or replace function public.vv_evidence_permissions(p_request uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not exists(select 1 from public.support_requests where id=p_request and user_id=auth.uid()) then raise exception 'Case owner required';end if;
 return(select coalesce(jsonb_agg(jsonb_build_object('evidence_id',g.evidence_id,'worker_id',g.worker_id,'expires_at',g.expires_at)),'[]') from public.vv_evidence_grants g join public.vv_case_evidence e on e.id=g.evidence_id where e.request_id=p_request and g.expires_at>now());
end $$;

-- Owner reports also block access immediately; report text is supervisor-only.
create or replace function public.vv_report_worker(p_worker uuid,p_reason text,p_request uuid default null,p_event uuid default null) returns void language plpgsql security definer set search_path='' as $$
begin
 if num_nonnulls(p_request,p_event)<>1 then raise exception 'Choose one request for this report';end if;
 if not (exists(select 1 from public.support_requests r join public.vv_case_assignments a on a.request_id=r.id where r.id=p_request and r.user_id=auth.uid() and a.user_id=p_worker)
 or exists(select 1 from public.vv_sos_events e join public.vv_sos_offers o on o.event_id=e.id where e.id=p_event and e.user_id=auth.uid() and o.responder_id=p_worker)) then raise exception 'Choose a worker associated with your request';end if;
 if (select count(*) from public.vv_safety_reports where owner_id=auth.uid() and created_at>now()-interval '1 day')>=10 then raise exception 'Your reports are saved. Contact the supervisor for further updates';end if;
 insert into public.vv_safety_reports(owner_id,worker_id,request_id,event_id,reason) values(auth.uid(),p_worker,p_request,p_event,btrim(p_reason));
 insert into public.vv_worker_blocks(owner_id,worker_id) values(auth.uid(),p_worker) on conflict do nothing;
 update public.vv_case_assignments set active=false where user_id=p_worker and request_id in(select id from public.support_requests where user_id=auth.uid());
 delete from public.vv_evidence_grants where worker_id=p_worker and granted_by=auth.uid();
 update public.vv_sos_offers set access_until=null where responder_id=p_worker and event_id in(select id from public.vv_sos_events where user_id=auth.uid());
 perform public.vv_log_case(p_request,'worker_access_blocked',p_worker);
end $$;
create or replace function public.vv_remove_worker(p_request uuid,p_worker uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.support_requests where id=p_request and user_id=auth.uid()) then raise exception 'Case owner required';end if;
 update public.vv_case_assignments set active=false where request_id=p_request and user_id=p_worker;
 delete from public.vv_evidence_grants where worker_id=p_worker and evidence_id in(select id from public.vv_case_evidence where request_id=p_request);
 perform public.vv_log_case(p_request,'reassignment_requested',p_worker);
end $$;

-- Precise emergency context requires supervisor dispatch, not self-acceptance.
create or replace function public.vv_dispatch_responder(p_event uuid,p_worker uuid,p_allow boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.vv_supervisor() then raise exception 'Supervisor sign-in with two-step verification required';end if;
 perform 1 from public.vv_sos_events where id=p_event and status='active' and expires_at>now() for update;
 if not found then raise exception 'This incident is no longer active';end if;
 if p_allow and (not public.vv_sos_can_respond(p_event,p_worker) or not exists(select 1 from public.vv_sos_offers where event_id=p_event and responder_id=p_worker and accepted_at is not null)) then raise exception 'Choose an eligible on-duty responder who acknowledged this offer';end if;
 update public.vv_sos_offers set dispatched_by=auth.uid(),access_until=case when p_allow then now()+interval '15 minutes' else null end where event_id=p_event and responder_id=p_worker;
 if not found then raise exception 'No current offer exists for this responder';end if;
 insert into public.vv_sos_audit(event_id,actor_id,action) values(p_event,auth.uid(),case when p_allow then 'location_access_assigned' else 'location_access_revoked' end);
end $$;
create or replace function public.vv_open_evidence(p_evidence_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare e public.vv_case_evidence;
begin
 select * into e from public.vv_case_evidence where id=p_evidence_id and ready;
 if not found or not public.vv_can_view_evidence(e.id) then raise exception 'Evidence access denied' using errcode='42501'; end if;
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
 if not found or (not public.vv_can_work_case(e.request_id) or not public.vv_can_view_evidence(e.id)) then raise exception 'Case access denied' using errcode='42501'; end if;
 update public.vv_case_evidence set review_status=p_status,reviewed_by=auth.uid() where id=e.id;
 perform public.vv_log_case(e.request_id,'evidence_'||p_status,e.id);
end; $$;

create or replace function public.vv_evidence_storage_allowed(p_path text,p_action text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.vv_case_evidence e where e.storage_path=p_path and
 case when p_action='upload' then e.uploader_id=auth.uid() and not e.ready
 when p_action='cleanup' then e.uploader_id=auth.uid() and not e.ready
 when p_action='read' then e.ready and public.vv_can_view_evidence(e.id) and exists(
  select 1 from public.vv_evidence_leases l where l.evidence_id=e.id and l.user_id=auth.uid() and l.expires_at>now()) else false end);
$$;

create or replace function public.vv_open_case(p_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if not public.vv_can_access_case(p_request_id) then raise exception 'Case access denied' using errcode='42501'; end if;
 select jsonb_build_object('id',r.id,'description',r.description,'status',r.status,
 'harassment_type',r.harassment_type,'severity_level',r.severity_level,'created_at',r.created_at,
 'allow_volunteer_support',r.allow_volunteer_support,
 'team',coalesce((select jsonb_agg(jsonb_build_object('user_id',a.user_id,'display_name',s.display_name,'role',w.requested_role,'organisation',w.organisation,'accepted_at',a.accepted_at))
 from public.vv_case_assignments a join public.vv_support_staff s on s.user_id=a.user_id and s.enabled join public.vv_workforce w on w.user_id=a.user_id
 where a.request_id=r.id and a.active and a.expires_at>now() and (a.accepted_at is not null or a.acknowledge_by>now()) and public.vv_worker_eligible(a.user_id) and (w.requested_role='case_worker' or r.allow_volunteer_support)),'[]'::jsonb)) into result from public.support_requests r where r.id=p_request_id;
 if public.vv_can_work_case(p_request_id) then perform public.vv_log_case(p_request_id,'case_opened'); end if;
 return result;
end; $$;

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
 order by case r.severity_level when 'critical' then 0 when 'high' then 1 when 'medium' then 2 else 3 end,r.created_at,r.id limit 25 offset greatest(0,least(p_page,10000))*25) q;
 return result;
end; $$;

create or replace function public.vv_sos_approve(p_user uuid,p_approved boolean,p_kind text default 'volunteer',p_agency uuid default null) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.vv_supervisor() then raise exception 'Supervisor required'; end if;
 if p_approved and not public.vv_worker_eligible(p_user,'emergency_responder') then raise exception 'Complete invited responder review first';end if;
 if p_kind='police' and p_approved and not exists(select 1 from public.vv_sos_agencies where id=p_agency and enabled and verified_at is not null and region_id=(select region_id from public.vv_sos_responders where user_id=p_user)) then raise exception 'Verify and enable a receiving agency first';end if;
 update public.vv_sos_responders set approved=p_approved,kind=p_kind,agency_id=case when p_kind='police' then p_agency else null end,duty_until=null,position=null,position_at=null where user_id=p_user;
 if not found then raise exception 'Responder must apply first';end if;
 update public.vv_sos_offers set access_until=null where responder_id=p_user;
end $$;

create or replace function public.vv_sos_set_area(p_region text,p_geojson jsonb,p_source text,p_enabled boolean,p_agency uuid default null,p_name text default null) returns uuid language plpgsql security definer set search_path='' as $$
declare g extensions.geometry; target uuid;
begin
 if not public.vv_supervisor() then raise exception 'Supervisor required';end if;
 if p_source not like 'https://%' or length(p_geojson::text)>1000000 then raise exception 'Official HTTPS provenance and bounded geometry required';end if;
 g=extensions.st_multi(extensions.st_setsrid(extensions.st_geomfromgeojson(p_geojson),4326));
 if extensions.geometrytype(g)<>'MULTIPOLYGON' or not extensions.st_isvalid(g) or extensions.st_isempty(g) or extensions.st_xmin(g::extensions.box3d)<-180 or extensions.st_xmax(g::extensions.box3d)>180 or extensions.st_ymin(g::extensions.box3d)<-90 or extensions.st_ymax(g::extensions.box3d)>90 then raise exception 'Valid WGS84 Polygon/MultiPolygon required';end if;
 if p_name is null then
  update public.vv_sos_regions set boundary=g::extensions.geography,boundary_source=p_source,verified_at=now(),volunteer_enabled=p_enabled where id=p_region;
 else
  target=coalesce(p_agency,gen_random_uuid());
  insert into public.vv_sos_agencies(id,region_id,name,source_url,boundary,verified_at,enabled) values(target,p_region,p_name,p_source,g::extensions.geography,now(),p_enabled)
  on conflict(id) do update set name=excluded.name,source_url=excluded.source_url,boundary=excluded.boundary,verified_at=now(),enabled=excluded.enabled;
 end if;
 return target;
end $$;

create or replace function public.vv_sos_close(p_id uuid,p_status text) returns void language plpgsql security definer set search_path='' as $$
begin
 if p_status not in('cancelled','resolved') then raise exception 'Invalid closure';end if;
 update public.vv_sos_events set status=p_status where id=p_id and (user_id=auth.uid() or public.vv_supervisor());
 if not found then raise exception 'Incident unavailable';end if;
 update public.vv_sos_jobs set state='cancelled' where event_id=p_id and state='pending';
 insert into public.vv_sos_audit(event_id,actor_id,action) values(p_id,auth.uid(),p_status);
end $$;

create or replace function public.vv_sos_team() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin if not public.vv_supervisor() then raise exception 'Supervisor required';end if;
 return (select coalesce(jsonb_agg(to_jsonb(r)-'position'),'[]'::jsonb) from public.vv_sos_responders r);
end $$;

create or replace function public.vv_sos_areas() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin if not public.vv_supervisor() then raise exception 'Supervisor required';end if;
 return jsonb_build_object('regions',(select jsonb_agg(to_jsonb(r)-'boundary'||jsonb_build_object('geometry',extensions.st_asgeojson(r.boundary::extensions.geometry)::jsonb)) from public.vv_sos_regions r),'agencies',(select coalesce(jsonb_agg(to_jsonb(a)-'boundary'||jsonb_build_object('geometry',extensions.st_asgeojson(a.boundary::extensions.geometry)::jsonb)),'[]'::jsonb) from public.vv_sos_agencies a));
end $$;


create or replace function public.vv_sos_can_respond(p_event uuid,p_user uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.vv_sos_events e join public.vv_sos_offers o on o.event_id=e.id join public.vv_sos_responders r on r.user_id=o.responder_id join public.vv_sos_regions z on z.id=r.region_id left join public.vv_sos_agencies a on a.id=r.agency_id where e.id=p_event and r.user_id=p_user and r.approved and public.vv_worker_eligible(r.user_id,'emergency_responder') and not public.vv_worker_blocked(e.user_id,r.user_id) and r.duty_until>now() and e.status='active' and e.expires_at>now() and ((r.kind='volunteer' and e.volunteers and z.volunteer_enabled and z.boundary is not null) or (r.kind='police' and e.police and a.enabled and a.verified_at is not null and a.region_id=r.region_id)));
$$;

create or replace function public.vv_sos_start(p_id uuid,p_alias text,p_contacts jsonb,p_region text,p_relay boolean,p_volunteers boolean,p_police boolean,p_location jsonb default null,p_callback text default null) returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid=auth.uid(); c jsonb; pos extensions.geography; lat double precision;lon double precision; ts timestamptz;acc double precision; area text;agency uuid;agency_count integer; prior public.vv_sos_events;
begin
 if uid is null or not exists(select 1 from auth.users where id=uid and (email is not null or phone is not null)) then raise exception 'Sign in required';end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,7));
 select * into prior from public.vv_sos_events where id=p_id;
 if found then if prior.user_id<>uid then raise exception 'Incident unavailable';end if;return p_id;end if;
 if (select count(*) from public.vv_sos_events where user_id=uid and created_at>now()-interval '24 hours')>=3 then raise exception 'Relay incident limit reached; local SMS and calling remain available';end if;
 if p_contacts is null or jsonb_typeof(p_contacts)<>'array' or jsonb_array_length(p_contacts) not between 1 and 5 then raise exception 'Choose 1 to 5 contacts';end if;
 if p_location is not null then
  lat=(p_location->>'latitude')::double precision;lon=(p_location->>'longitude')::double precision;ts=to_timestamp((p_location->>'timestamp')::double precision/1000);acc=(p_location->>'accuracy')::double precision;
  if lat between -90 and 90 and lon between -180 and 180 and ts between now()-interval '1 minute' and now() and acc>=0 and acc<=5000 then pos=extensions.st_setsrid(extensions.st_makepoint(lon,lat),4326)::extensions.geography;else ts=null;acc=null;end if;
 end if;
 -- A selected region is a UI hint. Only reviewed geography can authorize matching.
 select id into area from public.vv_sos_regions where boundary is not null and verified_at is not null and extensions.st_covers(boundary::extensions.geometry,pos::extensions.geometry) order by id limit 1;
 insert into public.vv_sos_events(id,user_id,alias,callback,position,position_at,accuracy,region_id,relay,volunteers,police,routing) values(p_id,uid,btrim(p_alias),p_callback,pos,ts,acc,coalesce(area,p_region),p_relay,p_volunteers,p_police,case when not p_police then 'not_requested' when pos is null then 'location_unavailable' else 'no_verified_route' end);
 for c in select * from jsonb_array_elements(p_contacts) loop
  if length(btrim(c->>'name')) not between 1 and 100 or (c->>'phone') !~ '^\+[1-9][0-9]{7,14}$' then raise exception 'Invalid contact';end if;
  insert into public.vv_sos_recipients(event_id,contact_id,name,phone) values(p_id,(c->>'id')::uuid,c->>'name',c->>'phone');
 end loop;
 if p_volunteers and pos is not null and area is not null then
  insert into public.vv_sos_offers(event_id,responder_id)
   select p_id,r.user_id from public.vv_sos_responders r join public.vv_sos_regions z on z.id=r.region_id
   where r.user_id<>uid and r.approved and public.vv_worker_eligible(r.user_id,'emergency_responder') and not public.vv_worker_blocked(uid,r.user_id) and r.kind='volunteer' and r.region_id=area and z.volunteer_enabled and r.duty_until>now() and r.position_at>now()-interval '5 minutes' and extensions.st_dwithin(r.position,pos,3000)
   and extensions.st_covers(z.boundary::extensions.geometry,r.position::extensions.geometry)
   order by extensions.st_distance(r.position,pos) limit 3;
 end if;
 if p_police and pos is not null and acc is not null then
  select count(*),(array_agg(id))[1] into agency_count,agency from public.vv_sos_agencies where enabled and verified_at is not null and boundary is not null and extensions.st_covers(boundary::extensions.geometry,extensions.st_buffer(pos,greatest(acc,1))::extensions.geometry);
  if agency_count=1 then
   update public.vv_sos_events set region_id=(select region_id from public.vv_sos_agencies where id=agency) where id=p_id;
   insert into public.vv_sos_offers(event_id,responder_id) select p_id,user_id from public.vv_sos_responders where user_id<>uid and approved and public.vv_worker_eligible(user_id,'emergency_responder') and not public.vv_worker_blocked(uid,user_id) and kind='police' and agency_id=agency and duty_until>now() limit 3 on conflict do nothing;
   update public.vv_sos_events set routing=case when exists(select 1 from public.vv_sos_offers o join public.vv_sos_responders r on r.user_id=o.responder_id where o.event_id=p_id and r.kind='police') then 'offered' else 'no_on_duty_recipient' end where id=p_id;
  elsif agency_count>1 then update public.vv_sos_events set routing='ambiguous_jurisdiction' where id=p_id;end if;
 end if;
 insert into public.vv_sos_jobs(event_id,recipient_id,kind) select p_id,responder_id,'push' from public.vv_sos_offers where event_id=p_id;
 insert into public.vv_sos_audit(event_id,actor_id,action) values(p_id,uid,'incident_created');
 return p_id;
end $$;


create or replace function public.vv_sos_duty(p_on boolean,p_lat double precision default null,p_lon double precision default null) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.vv_staff_mfa() or not public.vv_worker_eligible(auth.uid(),'emergency_responder') then raise exception 'Reviewed responder and two-step verification required';end if;
 if not exists(select 1 from public.vv_sos_responders where user_id=auth.uid() and approved) then raise exception 'Approved responder required';end if;
 if p_on and (p_lat is null or p_lon is null or p_lat not between -90 and 90 or p_lon not between -180 and 180) then raise exception 'Fresh position required';end if;
 update public.vv_sos_responders set duty_until=case when p_on then now()+interval '15 minutes' else null end,position=case when p_on then extensions.st_setsrid(extensions.st_makepoint(p_lon,p_lat),4326)::extensions.geography else null end,position_at=case when p_on then now() else null end where user_id=auth.uid();
end $$;

create or replace function public.vv_sos_accept(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare e public.vv_sos_events;
begin
 if not public.vv_staff_mfa() or not public.vv_worker_eligible(auth.uid(),'emergency_responder') then raise exception 'Reviewed responder and two-step verification required';end if;
 select * into e from public.vv_sos_events where id=p_id for update;
 if not found or e.status<>'active' or e.expires_at<now() then raise exception 'Incident inactive';end if;
 if not exists(select 1 from public.vv_sos_offers o join public.vv_sos_responders r on r.user_id=o.responder_id where o.event_id=p_id and r.user_id=auth.uid() and public.vv_sos_can_respond(p_id,r.user_id)) then raise exception 'Current offer and approved on-duty role required';end if;
 perform 1 from public.vv_sos_events where id=p_id for update;
 if (select count(*) from public.vv_sos_offers where event_id=p_id and accepted_at is not null)>=2 and not exists(select 1 from public.vv_sos_offers where event_id=p_id and responder_id=auth.uid() and accepted_at is not null) then raise exception 'Incident already assigned';end if;
 update public.vv_sos_offers set accepted_at=coalesce(accepted_at,now()) where event_id=p_id and responder_id=auth.uid();
 insert into public.vv_sos_audit(event_id,actor_id,action) values(p_id,auth.uid(),'accepted');
end $$;

create or replace function public.vv_sos_read(p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare e public.vv_sos_events;owner_or_admin boolean; details boolean;
begin
 if auth.uid() is null then raise exception 'Sign in required';end if;
 select * into e from public.vv_sos_events where id=p_id;
 if not found then raise exception 'Incident unavailable';end if;
 owner_or_admin=(e.user_id=auth.uid() or public.vv_supervisor());
 if not owner_or_admin and not public.vv_staff_mfa() then raise exception 'Two-step verification required';end if;
 details=owner_or_admin or (e.status='active' and e.expires_at>now() and exists(select 1 from public.vv_sos_offers o join public.vv_sos_responders r on r.user_id=o.responder_id where o.event_id=p_id and r.user_id=auth.uid() and public.vv_sos_can_respond(p_id,r.user_id) and o.accepted_at is not null and o.access_until>now()));
 if not owner_or_admin and not exists(select 1 from public.vv_sos_offers o join public.vv_sos_responders r on r.user_id=o.responder_id where o.event_id=p_id and o.responder_id=auth.uid() and public.vv_sos_can_respond(p_id,r.user_id)) then raise exception 'Incident unavailable';end if;
 if details and e.user_id<>auth.uid() and not exists(select 1 from public.vv_sos_audit where event_id=p_id and actor_id=auth.uid() and action='precise_context_viewed' and created_at>now()-interval '1 minute') then insert into public.vv_sos_audit(event_id,actor_id,action) values(p_id,auth.uid(),'precise_context_viewed');end if;
 return jsonb_build_object('id',e.id,'created_at',e.created_at,'status',e.status,'expires_at',e.expires_at,'region_id',e.region_id,'routing',e.routing,
  'alias',case when details then e.alias end,'callback',case when details then e.callback end,
  'latitude',case when details then extensions.st_y(e.position::extensions.geometry) end,'longitude',case when details then extensions.st_x(e.position::extensions.geometry) end,'accuracy',case when details then e.accuracy end,
  'recipients',case when owner_or_admin then (select coalesce(jsonb_agg(jsonb_build_object('id',contact_id,'name',name,'state',state)),'[]'::jsonb) from public.vv_sos_recipients where event_id=p_id) end,
  'accepted', (select count(*) from public.vv_sos_offers o join public.vv_sos_responders r on r.user_id=o.responder_id where event_id=p_id and accepted_at is not null and r.approved),
  'offers',(select count(*) from public.vv_sos_offers where event_id=p_id), 'details_allowed',details);
end $$;

create or replace function public.vv_sos_list() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(x),'[]'::jsonb) from (
 select distinct e.id,e.created_at,e.status,e.region_id,e.routing from public.vv_sos_events e
 where e.user_id=auth.uid() or public.vv_supervisor() or (public.vv_staff_mfa() and e.status='active' and e.expires_at>now() and exists(select 1 from public.vv_sos_offers o join public.vv_sos_responders r on r.user_id=o.responder_id where o.event_id=e.id and o.responder_id=auth.uid() and public.vv_sos_can_respond(e.id,r.user_id)))
 order by e.created_at desc limit 40) x;
$$;

create or replace function public.vv_staff_role() returns text language sql stable security definer set search_path='' as $$
 select case when public.is_admin() then 'admin' else coalesce((select case when w.requested_role='case_worker' then 'case_worker' else 'volunteer' end from public.vv_support_staff s join public.vv_workforce w on w.user_id=s.user_id where s.user_id=auth.uid() and s.enabled and public.vv_worker_eligible(s.user_id)),'none') end;
$$;
create or replace function public.vv_list_staff() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.vv_supervisor() then raise exception 'Supervisor sign-in with two-step verification required';end if;
 return(select coalesce(jsonb_agg(jsonb_build_object('user_id',s.user_id,'display_name',s.display_name,'enabled',s.enabled,'role',w.requested_role,'organisation',w.organisation,'languages',w.languages,'skills',w.skills,'available_until',w.available_until)),'[]') from public.vv_support_staff s join public.vv_workforce w on w.user_id=s.user_id where public.vv_worker_eligible(s.user_id));
end $$;
create or replace function public.vv_worker_console() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required';end if;
 if not public.vv_supervisor() then return jsonb_build_object('profile',(select to_jsonb(w)-'review_reference'-'reviewed_by' from public.vv_workforce w where user_id=auth.uid()));end if;
 return jsonb_build_object(
 'invites',(select coalesce(jsonb_agg(to_jsonb(i)),'[]') from (select id,account_id,role,region,expires_at from public.vv_workforce_invites where consumed_at is null and expires_at>now() order by expires_at limit 100) i),
 'workers',(select coalesce(jsonb_agg(to_jsonb(w)),'[]') from (select * from public.vv_workforce order by created_at desc limit 100) w),
 'reports',(select coalesce(jsonb_agg(to_jsonb(r)),'[]') from (select * from public.vv_safety_reports where state<>'closed' order by created_at limit 100) r),
 'reassignment_requests',(select coalesce(jsonb_agg(to_jsonb(q)),'[]') from (select distinct on (v.request_id) v.request_id,v.created_at from public.vv_case_events v where v.action='reassignment_requested' and not exists(select 1 from public.vv_case_assignments a where a.request_id=v.request_id and a.active and a.assigned_at>v.created_at) order by v.request_id,v.created_at desc limit 100) q),
 'overdue_cases',(select coalesce(jsonb_agg(to_jsonb(a)),'[]') from (select request_id,user_id,acknowledge_by,expires_at from public.vv_case_assignments where active and ((accepted_at is null and acknowledge_by<=now()) or expires_at<=now()) order by acknowledge_by limit 100) a),
 'overdue_sos',(select coalesce(jsonb_agg(to_jsonb(e)),'[]') from (select id,region_id,created_at from public.vv_sos_events e where status='active' and expires_at>now() and created_at<now()-interval '2 minutes' and (volunteers or police) and not exists(select 1 from public.vv_sos_offers o where o.event_id=e.id and o.accepted_at is not null and o.access_until>now() and public.vv_sos_can_respond(e.id,o.responder_id)) order by created_at limit 100) e),
 'access_review',(select coalesce(jsonb_agg(to_jsonb(q)),'[]') from (select actor_id,count(*) as evidence_opens from public.vv_case_events where action='evidence_opened' and created_at>now()-interval '1 hour' group by actor_id having count(*)>=20 order by count(*) desc limit 100) q));
end $$;
create or replace function public.vv_review_report(p_id uuid,p_state text,p_resolution text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.vv_supervisor() then raise exception 'Supervisor sign-in with two-step verification required';end if;
 if length(btrim(coalesce(p_resolution,'')))<5 then raise exception 'Record the action taken before updating the report';end if;
 update public.vv_safety_reports set state=p_state,resolution=p_resolution,reviewed_by=auth.uid() where id=p_id;
 if not found then raise exception 'Report not found';end if;
 perform public.vv_log_case(null,'safety_report_'||p_state,p_id);
end $$;
create or replace function public.vv_dispatch_team(p_event uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.vv_supervisor() and not exists(select 1 from public.vv_sos_events where id=p_event and user_id=auth.uid()) then raise exception 'Incident owner or verified supervisor required';end if;
 return(select coalesce(jsonb_agg(jsonb_build_object('user_id',r.user_id,'display_name',r.display_name,'organisation',w.organisation,'kind',r.kind,'accepted_at',o.accepted_at,'access_until',o.access_until)),'[]') from public.vv_sos_offers o join public.vv_sos_responders r on r.user_id=o.responder_id join public.vv_workforce w on w.user_id=r.user_id where event_id=p_event and r.approved and public.vv_worker_eligible(r.user_id) and not public.vv_worker_blocked((select user_id from public.vv_sos_events where id=p_event),r.user_id));
end $$;
create or replace function public.vv_set_support_consent(p_request_id uuid,p_allowed boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.support_requests where id=p_request_id and user_id=auth.uid()) then raise exception 'Only the case owner can change consent';end if;
 update public.support_requests set allow_volunteer_support=p_allowed where id=p_request_id;
 if not p_allowed then
 update public.vv_case_assignments a set active=false from public.vv_workforce w where a.request_id=p_request_id and w.user_id=a.user_id and w.requested_role='support_volunteer';
 delete from public.vv_evidence_grants g using public.vv_case_evidence e,public.vv_workforce w where g.evidence_id=e.id and e.request_id=p_request_id and w.user_id=g.worker_id and w.requested_role='support_volunteer';
 end if;
 perform public.vv_log_case(p_request_id,case when p_allowed then 'volunteer_consent_given' else 'volunteer_consent_withdrawn' end);
end $$;
create or replace function public.vv_list_evidence(p_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if not public.vv_can_access_case(p_request_id) then raise exception 'Case access denied' using errcode='42501'; end if;
 -- Link destinations and storage paths are released only through the audited open RPC.
 select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) into result from
 (select id,label,kind,mime_type,byte_size,sha256,review_status,created_at from public.vv_case_evidence
 where request_id=p_request_id and ready and public.vv_can_view_evidence(id) order by created_at desc,id desc limit 20) q;
 return result;
end; $$;
create or replace function public.vv_revoke_worker_invite(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.vv_supervisor() then raise exception 'Supervisor sign-in with two-step verification required';end if;
 update public.vv_workforce_invites set expires_at=now() where id=p_id and consumed_at is null;
 perform public.vv_log_case(null,'worker_invitation_revoked',p_id);
end $$;
-- No direct client access to review records, reports, invites, blocks or evidence grants.
do $$ declare t text; f record; begin
 foreach t in array array['vv_workforce','vv_workforce_invites','vv_worker_blocks','vv_safety_reports','vv_evidence_grants'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 end loop;
 for f in select oid::regprocedure as signature from pg_proc where pronamespace='public'::regnamespace and proname in(
 'vv_staff_mfa','vv_supervisor','vv_worker_eligible','vv_worker_blocked','vv_can_view_evidence','vv_create_worker_invite','vv_apply_worker','vv_review_worker','vv_worker_availability','vv_accept_case','vv_my_assignments','vv_set_evidence_grant','vv_evidence_permissions','vv_report_worker','vv_remove_worker','vv_dispatch_responder','vv_worker_console','vv_review_report','vv_dispatch_team','vv_revoke_worker_invite') loop
 execute format('revoke all on function %s from public,anon',f.signature);execute format('grant execute on function %s to authenticated',f.signature);
 end loop;
 -- Worker helper is needed by the existing service-role outbox, never by anonymous users.
 grant execute on function public.vv_worker_eligible(uuid,text),public.vv_worker_blocked(uuid,uuid) to service_role;
end $$;
notify pgrst,'reload schema';
$governance_ddl$;
begin
 select n.nspname into geo_schema from pg_extension e join pg_namespace n on n.oid=e.extnamespace where e.extname='postgis';
 if geo_schema is null then raise exception 'Install the SOS schema first';end if;
 execute replace(ddl,'extensions.',quote_ident(geo_schema)||'.');
end $governance_install$;
commit;
