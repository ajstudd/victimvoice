-- Additive scoped workforce. Apply after safety-governance.sql / responder-contact-privacy.sql.
-- Existing global admin_users membership becomes database-only superadmin authority.
-- No account is silently promoted or assigned a new staff/volunteer role.
begin;
do $scoped_install$
declare geo_schema text; ddl text := $scoped_ddl$
create table if not exists public.vv_operating_scopes (
 id text primary key,name text not null check(length(btrim(name)) between 2 and 100),
 kind text not null check(kind in('country','state','city','district','service_area','region')),
 parent_id text references public.vv_operating_scopes,accept_applications boolean not null default false,
 created_by uuid references auth.users on delete set null,created_at timestamptz not null default now(),
 check(parent_id is null or parent_id<>id)
);
insert into public.vv_operating_scopes(id,name,kind,parent_id,accept_applications) values
 ('india','India','country',null,false),('madhya_pradesh','Madhya Pradesh','state','india',false),
 ('odisha','Odisha','state','india',false),('tripura','Tripura','state','india',true),
 ('bhopal','Bhopal','city','madhya_pradesh',true),('bhubaneswar','Bhubaneswar','city','odisha',true)
on conflict(id) do nothing;
create table if not exists public.vv_response_scopes (
 region_id text primary key references public.vv_sos_regions,scope_id text not null unique references public.vv_operating_scopes
);
insert into public.vv_response_scopes values('bhopal','bhopal'),('tripura','tripura'),('bhubaneswar','bhubaneswar') on conflict do nothing;
create table if not exists public.vv_staff_profiles (
 user_id uuid primary key references auth.users on delete cascade,
 display_name text not null check(length(btrim(display_name)) between 2 and 80),
 organisation text not null check(length(btrim(organisation)) between 2 and 120),
 languages text not null default '' check(length(languages)<=250),skills text not null default '' check(length(skills)<=500)
);
create table if not exists public.vv_staff_memberships (
 user_id uuid not null references public.vv_staff_profiles on delete cascade,
 scope_id text not null references public.vv_operating_scopes,
 role text not null check(role in('admin','employee')),enabled boolean not null default true,
 sponsor_id uuid references auth.users on delete set null,granted_by uuid references auth.users on delete set null,
 review_reference text not null check(length(btrim(review_reference)) between 5 and 300),
 expires_at timestamptz not null,available_until timestamptz,created_at timestamptz not null default now(),
 primary key(user_id,scope_id)
);
create index if not exists vv_staff_memberships_active on public.vv_staff_memberships(user_id,role) where enabled;
create table if not exists public.vv_staff_invites (
 id uuid primary key default gen_random_uuid(),account_id uuid not null references auth.users on delete cascade,
 scope_id text not null references public.vv_operating_scopes,role text not null check(role in('admin','employee')),
 display_name text not null check(length(btrim(display_name)) between 2 and 80),organisation text not null check(length(btrim(organisation)) between 2 and 120),
 token_hash text not null unique,created_by uuid references auth.users on delete cascade,
 review_reference text not null check(length(btrim(review_reference)) between 5 and 300),
 expires_at timestamptz not null default now()+interval '7 days',review_until timestamptz not null default now()+interval '90 days',
 consumed_at timestamptz,revoked_at timestamptz,created_at timestamptz not null default now()
);
create table if not exists public.vv_volunteer_applications (
 user_id uuid primary key references auth.users on delete cascade,scope_id text not null references public.vv_operating_scopes,
 display_name text not null check(length(btrim(display_name)) between 2 and 80),
 organisation text not null default '' check(length(organisation)<=120),languages text not null check(length(btrim(languages)) between 2 and 250),
 skills text not null check(length(btrim(skills)) between 2 and 500),availability text not null check(length(btrim(availability)) between 2 and 500),
 notice_version text not null default '2026-11-10',status text not null default 'submitted' check(status in('submitted','changes_requested','rejected','approved','suspended')),
 reviewer_id uuid references auth.users on delete set null,review_started_at timestamptz,reviewed_by uuid references auth.users on delete set null,
 checks jsonb not null default '{}'::jsonb,review_reference text,decision_reason text,review_due timestamptz,
 field_status text not null default 'pending' check(field_status in('pending','approved','suspended')),
 field_approved_by uuid references auth.users on delete set null,field_review_due timestamptz,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
alter table public.vv_volunteer_applications add column if not exists applicant_note text check(length(applicant_note)<=2000);
create table if not exists public.vv_governance_audit (
 id uuid primary key default gen_random_uuid(),actor_id uuid references auth.users on delete set null,
 actor_role text not null,action text not null,scope_id text references public.vv_operating_scopes,
 subject_id uuid,request_id uuid references public.support_requests on delete set null,event_id uuid references public.vv_sos_events on delete set null,
 reason text not null default '' check(length(reason)<=2000),details jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create index if not exists vv_governance_audit_scope on public.vv_governance_audit(scope_id,created_at desc);
create table if not exists public.vv_oversight_leases (
 user_id uuid references auth.users on delete cascade,resource_id uuid not null,
 kind text not null check(kind in('case','incident')),reason text not null check(length(btrim(reason)) between 15 and 500),
 expires_at timestamptz not null,primary key(user_id,resource_id,kind)
);
alter table public.support_requests add column if not exists scope_id text references public.vv_operating_scopes;
grant insert(scope_id) on public.support_requests to authenticated;
-- Legacy assignments referenced the retired staff profile table. Preserve rows while
-- moving the identity FK to Auth; scoped authorization is checked by every RPC.
alter table public.vv_case_assignments drop constraint if exists vv_case_assignments_user_id_fkey;
alter table public.vv_case_assignments add constraint vv_case_assignments_user_id_fkey foreign key(user_id) references auth.users(id) on delete cascade;

create or replace function public.vv2_superadmin(p_user uuid default auth.uid()) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.admin_users where user_id=p_user)$$;
create or replace function public.vv2_scope_within(p_child text,p_parent text) returns boolean language sql stable security definer set search_path='' as $$
 with recursive tree as(
 select id,parent_id,array[id] as path from public.vv_operating_scopes where id=p_child
 union all select s.id,s.parent_id,t.path||s.id from tree t join public.vv_operating_scopes s on s.id=t.parent_id where not s.id=any(t.path) and cardinality(t.path)<16)
 select exists(select 1 from tree where id=p_parent);
$$;
create or replace function public.vv2_staff_valid(p_user uuid,p_role text,p_scope text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.vv_staff_memberships m where m.user_id=p_user and m.role=p_role and m.enabled and m.expires_at>now() and public.vv2_scope_within(p_scope,m.scope_id)
 and (m.role='admin' or public.vv2_superadmin(m.sponsor_id) or exists(select 1 from public.vv_staff_memberships a where a.user_id=m.sponsor_id and a.role='admin' and a.enabled and a.expires_at>now() and public.vv2_scope_within(m.scope_id,a.scope_id))));
$$;
create or replace function public.vv2_manage_scope(p_scope text) returns boolean language sql stable security definer set search_path='' as $$select public.vv_staff_mfa() and (public.vv2_superadmin() or public.vv2_staff_valid(auth.uid(),'admin',p_scope))$$;
create or replace function public.vv2_employee_scope(p_scope text) returns boolean language sql stable security definer set search_path='' as $$select public.vv_staff_mfa() and public.vv2_staff_valid(auth.uid(),'employee',p_scope)$$;
create or replace function public.vv2_role() returns text language sql stable security definer set search_path='' as $$
 select case when auth.uid() is null then 'none' when public.vv2_superadmin() then 'superadmin'
 when exists(select 1 from public.vv_staff_memberships where user_id=auth.uid() and public.vv2_staff_valid(auth.uid(),'admin',scope_id)) then 'admin'
 when exists(select 1 from public.vv_staff_memberships where user_id=auth.uid() and public.vv2_staff_valid(auth.uid(),'employee',scope_id)) then 'employee'
 when exists(select 1 from public.vv_volunteer_applications where user_id=auth.uid()) then 'volunteer' else 'member' end;
$$;
create or replace function public.vv2_name(p_user uuid default auth.uid()) returns text language sql stable security definer set search_path='' as $$
 select case when public.vv2_superadmin(p_user) then 'Platform owner' else coalesce((select display_name from public.vv_staff_profiles where user_id=p_user),(select display_name from public.vv_volunteer_applications where user_id=p_user),'Case owner') end;
$$;
create or replace function public.vv2_verified_account(p_user uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users u where id=p_user and (nullif(to_jsonb(u)->>'email_confirmed_at','') is not null or nullif(to_jsonb(u)->>'phone_confirmed_at','') is not null));
$$;
create or replace function public.vv2_log(p_action text,p_scope text default null,p_subject uuid default null,p_reason text default '',p_details jsonb default '{}',p_request uuid default null,p_event uuid default null) returns void language plpgsql security definer set search_path='' as $$
begin
 insert into public.vv_governance_audit(actor_id,actor_role,action,scope_id,subject_id,reason,details,request_id,event_id)
 values(auth.uid(),public.vv2_role(),p_action,p_scope,p_subject,left(coalesce(p_reason,''),2000),coalesce(p_details,'{}'),p_request,p_event);
end $$;
create or replace function public.vv2_context() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='28000';end if;
 return jsonb_build_object('role',public.vv2_role(),'mfa',public.vv_staff_mfa(),'display_name',public.vv2_name(),'memberships',(select coalesce(jsonb_agg(jsonb_build_object('scope_id',m.scope_id,'scope_name',s.name,'role',m.role,'expires_at',m.expires_at,'available_until',m.available_until)),'[]') from public.vv_staff_memberships m join public.vv_operating_scopes s on s.id=m.scope_id where user_id=auth.uid() and public.vv2_staff_valid(m.user_id,m.role,m.scope_id)));
end $$;
create or replace function public.vv2_scopes(p_management boolean default false) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required';end if;
 return(select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'name',s.name,'kind',s.kind,'parent_id',s.parent_id,'accept_applications',s.accept_applications,'response_region',r.region_id) order by s.name),'[]') from public.vv_operating_scopes s left join public.vv_response_scopes r on r.scope_id=s.id where (not p_management and s.accept_applications and r.region_id is not null) or (p_management and public.vv2_manage_scope(s.id)));
end $$;
create or replace function public.vv2_create_scope(p_name text,p_kind text,p_parent text) returns text language plpgsql security definer set search_path='' as $$
declare sid text:=gen_random_uuid()::text;
begin
 if not public.vv_staff_mfa() or not public.vv2_superadmin() then raise exception 'Superadmin verification required';end if;
 if not exists(select 1 from public.vv_operating_scopes where id=p_parent) then raise exception 'Choose an existing parent area';end if;
 if exists(select 1 from public.vv_operating_scopes where parent_id=p_parent and lower(name)=lower(btrim(p_name))) then raise exception 'This area already exists under that parent';end if;
 insert into public.vv_operating_scopes(id,name,kind,parent_id,created_by) values(sid,btrim(p_name),p_kind,p_parent,auth.uid());
 perform public.vv2_log('scope_created',sid,null,'Administrative scope created',jsonb_build_object('parent',p_parent,'kind',p_kind));return sid;
end $$;
create or replace function public.vv2_invite_staff(p_account uuid,p_role text,p_scope text,p_name text,p_organisation text,p_reference text,p_checks boolean) returns text language plpgsql security definer set search_path='' as $$
declare token text:=gen_random_uuid()::text;
begin
 if not public.vv_staff_mfa() or p_account=auth.uid() or public.vv2_superadmin(p_account) then raise exception 'Independent, verified staff provisioning required';end if;
 if p_role='admin' then
 if not public.vv2_superadmin() then raise exception 'Only the superadmin can appoint area admins';end if;
 elsif p_role='employee' then
 if public.vv2_superadmin() or not public.vv2_staff_valid(auth.uid(),'admin',p_scope) then raise exception 'An area admin must invite employees within their own area';end if;
 else raise exception 'Only admins and employees use staff invitations. Volunteers apply in the app';end if;
 if not public.vv2_verified_account(p_account) then raise exception 'The invited person must sign in and verify their account first';end if;
 if not coalesce(p_checks,false) or length(btrim(coalesce(p_reference,'')))<5 then raise exception 'Complete identity, reference, interview, training and confidentiality checks and add the review reference';end if;
 if exists(select 1 from public.vv_staff_memberships where user_id=p_account and enabled and expires_at>now() and role<>p_role) or exists(select 1 from public.vv_volunteer_applications where user_id=p_account and status in('approved','submitted')) then raise exception 'Resolve this account’s existing role before granting a different role';end if;
 if (select count(*) from public.vv_staff_invites where created_by=auth.uid() and consumed_at is null and revoked_at is null and expires_at>now())>=30 then raise exception 'Review outstanding invitations first';end if;
 insert into public.vv_staff_invites(account_id,scope_id,role,display_name,organisation,token_hash,created_by,review_reference)
 values(p_account,p_scope,p_role,btrim(p_name),btrim(p_organisation),encode(sha256(convert_to(token,'UTF8')),'hex'),auth.uid(),p_reference);
 perform public.vv2_log('staff_invited',p_scope,p_account,p_reference,jsonb_build_object('role',p_role));return token;
end $$;
create or replace function public.vv2_accept_staff(p_token text) returns void language plpgsql security definer set search_path='' as $$
declare i public.vv_staff_invites;
begin
 if not public.vv_staff_mfa() or not public.vv2_verified_account(auth.uid()) then raise exception 'Verified sign-in and authenticator verification required';end if;
 select * into i from public.vv_staff_invites where account_id=auth.uid() and token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') and consumed_at is null and revoked_at is null and expires_at>now() and review_until>now() for update;
 if not found then raise exception 'This invitation is invalid, expired, revoked or for a different account';end if;
 if (i.role='admin' and not public.vv2_superadmin(i.created_by)) or (i.role='employee' and not public.vv2_staff_valid(i.created_by,'admin',i.scope_id)) then raise exception 'The inviting account no longer has authority for this area';end if;
 if public.vv2_superadmin() or exists(select 1 from public.vv_staff_memberships where user_id=auth.uid() and enabled and expires_at>now() and role<>i.role) or exists(select 1 from public.vv_volunteer_applications where user_id=auth.uid() and status in('approved','submitted')) then raise exception 'This invitation conflicts with the account’s existing role';end if;
 insert into public.vv_staff_profiles(user_id,display_name,organisation) values(auth.uid(),i.display_name,i.organisation) on conflict(user_id) do update set display_name=excluded.display_name,organisation=excluded.organisation;
 insert into public.vv_staff_memberships(user_id,scope_id,role,sponsor_id,granted_by,review_reference,expires_at)
 values(auth.uid(),i.scope_id,i.role,i.created_by,i.created_by,i.review_reference,i.review_until)
 on conflict(user_id,scope_id) do update set role=excluded.role,enabled=true,sponsor_id=excluded.sponsor_id,granted_by=excluded.granted_by,review_reference=excluded.review_reference,expires_at=excluded.expires_at,available_until=null;
 update public.vv_staff_invites set consumed_at=now() where id=i.id;
 perform public.vv2_log('staff_invitation_accepted',i.scope_id,auth.uid(),i.review_reference,jsonb_build_object('role',i.role));
end $$;
create or replace function public.vv2_revoke_invite(p_id uuid,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare i public.vv_staff_invites;
begin
 select * into i from public.vv_staff_invites where id=p_id for update;
 if not found or not public.vv_staff_mfa() or (not public.vv2_superadmin() and (i.role<>'employee' or not public.vv2_manage_scope(i.scope_id))) then raise exception 'Invitation management access denied';end if;
 if length(btrim(p_reason))<5 then raise exception 'Record a reason';end if;
 update public.vv_staff_invites set revoked_at=now() where id=i.id;
 perform public.vv2_log('staff_invitation_revoked',i.scope_id,i.account_id,p_reason);
end $$;
create or replace function public.vv2_set_staff_access(p_user uuid,p_scope text,p_enabled boolean,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare m public.vv_staff_memberships;
begin
 select * into m from public.vv_staff_memberships where user_id=p_user and scope_id=p_scope for update;
 if not found or p_user=auth.uid() or not public.vv_staff_mfa() or (not public.vv2_superadmin() and (m.role<>'employee' or not public.vv2_manage_scope(m.scope_id))) then raise exception 'Staff access change denied';end if;
 if length(btrim(p_reason))<10 then raise exception 'Record the reason for this access decision';end if;
 -- Re-enabling still requires the existing review to be current. Renew via a new reviewed invitation.
 if p_enabled and m.expires_at<=now() then raise exception 'A new reviewed invitation is required after review expiry';end if;
 update public.vv_staff_memberships set enabled=p_enabled,available_until=null where user_id=p_user and scope_id=p_scope;
 if not p_enabled then
 delete from public.vv_oversight_leases where user_id=p_user;
 delete from public.vv_evidence_leases where user_id=p_user;
 end if;
 perform public.vv2_log(case when p_enabled then 'staff_access_restored' else 'staff_access_suspended' end,p_scope,p_user,p_reason,jsonb_build_object('role',m.role));
end $$;
create or replace function public.vv2_staff_availability(p_on boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.vv_staff_mfa() or public.vv2_role()<>'employee' then raise exception 'An active employee account and authenticator verification are required';end if;
 update public.vv_staff_memberships set available_until=case when p_on then now()+interval '4 hours' else null end where user_id=auth.uid() and role='employee' and public.vv2_staff_valid(auth.uid(),'employee',scope_id);
end $$;

-- Volunteer applicants provide no public account access and never become staff through this form.
create or replace function public.vv2_apply_volunteer(p_scope text,p_name text,p_organisation text,p_languages text,p_skills text,p_availability text,p_consent boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.vv2_verified_account(auth.uid()) then raise exception 'Sign in with a verified account first';end if;
 if not coalesce(p_consent,false) then raise exception 'Read the application notice and confirm your agreement to review and training';end if;
 if public.vv2_superadmin() or exists(select 1 from public.vv_staff_memberships where user_id=auth.uid() and enabled and expires_at>now()) then raise exception 'Staff and volunteer response roles must use separate approved accounts';end if;
 if not exists(select 1 from public.vv_operating_scopes s join public.vv_response_scopes r on r.scope_id=s.id where s.id=p_scope and s.accept_applications) then raise exception 'Choose an area accepting volunteer applications';end if;
 insert into public.vv_volunteer_applications(user_id,scope_id,display_name,organisation,languages,skills,availability)
 values(auth.uid(),p_scope,btrim(p_name),btrim(p_organisation),btrim(p_languages),btrim(p_skills),btrim(p_availability));
 perform public.vv2_log('volunteer_application_submitted',p_scope,auth.uid(),'Applicant requested review');
end $$;
create or replace function public.vv2_volunteer_profile() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('application',to_jsonb(a)-'checks'-'review_reference'-'reviewer_id'-'reviewed_by'-'field_approved_by','responder',(select to_jsonb(r)-'position' from public.vv_sos_responders r where user_id=auth.uid())) from public.vv_volunteer_applications a where user_id=auth.uid();
$$;
create or replace function public.vv2_claim_volunteer_review(p_user uuid,p_no_conflict boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.vv_volunteer_applications;
begin
 select * into a from public.vv_volunteer_applications where user_id=p_user for update;
 if not found or not public.vv2_employee_scope(a.scope_id) or p_user=auth.uid() or not coalesce(p_no_conflict,false) then raise exception 'A local employee with no conflict must take this review';end if;
 if a.reviewer_id is not null and a.reviewer_id<>auth.uid() and a.review_started_at>now()-interval '7 days' and public.vv2_staff_valid(a.reviewer_id,'employee',a.scope_id) then raise exception 'This application is being reviewed by another employee';end if;
 update public.vv_volunteer_applications set reviewer_id=auth.uid(),review_started_at=now() where user_id=p_user returning * into a;
 perform public.vv2_log('volunteer_review_opened',a.scope_id,p_user,'Reviewer confirmed no conflict');return to_jsonb(a);
end $$;
create or replace function public.vv2_review_volunteer(p_user uuid,p_decision text,p_checks jsonb,p_reference text,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare a public.vv_volunteer_applications;
begin
 select * into a from public.vv_volunteer_applications where user_id=p_user for update;
 if not found or not public.vv2_employee_scope(a.scope_id) or a.reviewer_id is distinct from auth.uid() or p_user=auth.uid() then raise exception 'The assigned local employee must review this application';end if;
 if p_decision not in('approved','rejected','changes_requested','suspended') or length(btrim(coalesce(p_reason,'')))<10 then raise exception 'Choose a decision and record its reason';end if;
 if p_decision='approved' and (not coalesce(p_checks @> '{"identity":true,"contact":true,"references":true,"interview":true,"training":true,"confidentiality":true,"local_area":true}',false) or length(btrim(coalesce(p_reference,'')))<5) then raise exception 'Complete the required human checks and provide the review record reference';end if;
 update public.vv_volunteer_applications set status=p_decision,checks=coalesce(p_checks,'{}'),review_reference=p_reference,decision_reason=p_reason,reviewed_by=auth.uid(),review_due=case when p_decision='approved' then now()+interval '30 days' else null end,field_status='pending',field_approved_by=null,field_review_due=null,updated_at=now() where user_id=p_user;
 update public.vv_sos_responders set approved=false,duty_until=null,position=null,position_at=null where user_id=p_user;
 update public.vv_sos_offers set access_until=null where responder_id=p_user;
 perform public.vv2_log('volunteer_'||p_decision,a.scope_id,p_user,p_reason,jsonb_build_object('checks',p_checks,'review_reference',p_reference));
end $$;
create or replace function public.vv2_field_review(p_user uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.vv_volunteer_applications;
begin
 select * into a from public.vv_volunteer_applications where user_id=p_user;
 if not found or not public.vv2_manage_scope(a.scope_id) or p_user=auth.uid() or a.reviewed_by=auth.uid() then raise exception 'Independent local admin required';end if;
 perform public.vv2_log('field_review_opened',a.scope_id,p_user,'Independent admin opened employee review',jsonb_build_object('review_updated_at',a.updated_at));
 return to_jsonb(a);
end $$;
create or replace function public.vv2_approve_field_response(p_user uuid,p_allow boolean,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare a public.vv_volunteer_applications;rid text;
begin
 select * into a from public.vv_volunteer_applications where user_id=p_user for update;
 if not found or not public.vv2_manage_scope(a.scope_id) or p_user=auth.uid() or a.reviewed_by=auth.uid() then raise exception 'An independent area admin must authorize field response';end if;
 if length(btrim(coalesce(p_reason,'')))<10 then raise exception 'Record the reason for this field response decision';end if;
 if p_allow and not exists(select 1 from public.vv_governance_audit where actor_id=auth.uid() and subject_id=p_user and action='field_review_opened' and created_at>now()-interval '10 minutes' and (details->>'review_updated_at')::timestamptz=a.updated_at) then raise exception 'Open the current employee review before authorizing field response';end if;
 if p_allow and (a.status<>'approved' or a.review_due is null or a.review_due<=now() or a.reviewed_by is null or not public.vv2_staff_valid(a.reviewed_by,'employee',a.scope_id)) then raise exception 'Current employee review is required before field approval';end if;
 select region_id into rid from public.vv_response_scopes where scope_id=a.scope_id;
 if rid is null then raise exception 'This area is not configured for response';end if;
 update public.vv_volunteer_applications set field_status=case when p_allow then 'approved' else 'suspended' end,field_approved_by=auth.uid(),field_review_due=least(a.review_due,now()+interval '30 days'),updated_at=now() where user_id=p_user;
 insert into public.vv_sos_responders(user_id,display_name,region_id,kind,approved) values(p_user,a.display_name,rid,'volunteer',p_allow)
 on conflict(user_id) do update set display_name=excluded.display_name,region_id=excluded.region_id,kind='volunteer',approved=p_allow,duty_until=null,position=null,position_at=null,agency_id=null;
 update public.vv_sos_offers set access_until=null where responder_id=p_user;
 perform public.vv2_log(case when p_allow then 'field_response_approved' else 'field_response_suspended' end,a.scope_id,p_user,p_reason,jsonb_build_object('reviewer_id',a.reviewed_by));
end $$;
create or replace function public.vv2_field_eligible(p_user uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.vv_volunteer_applications a where user_id=p_user and status='approved' and field_status='approved' and review_due>now() and field_review_due>now() and reviewed_by is not null and field_approved_by is not null and reviewed_by<>field_approved_by
 and public.vv2_staff_valid(reviewed_by,'employee',scope_id) and (public.vv2_superadmin(field_approved_by) or public.vv2_staff_valid(field_approved_by,'admin',scope_id)));
$$;

-- Accountable management views: never expose account passwords, personal phone numbers or raw identity documents.
create or replace function public.vv2_console() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.vv_staff_mfa() or public.vv2_role() not in('superadmin','admin','employee') then raise exception 'Verified staff access required';end if;
 return jsonb_build_object(
 'staff',(select coalesce(jsonb_agg(to_jsonb(q)),'[]') from(select m.user_id,m.scope_id,s.name as scope_name,m.role,m.enabled,m.expires_at,m.sponsor_id,p.display_name,p.organisation,m.available_until from public.vv_staff_memberships m join public.vv_staff_profiles p using(user_id) join public.vv_operating_scopes s on s.id=m.scope_id where public.vv2_superadmin() or (m.role='employee' and public.vv2_manage_scope(m.scope_id)) order by p.display_name limit 200) q),
 'invites',(select coalesce(jsonb_agg(to_jsonb(q)),'[]') from(select id,account_id,scope_id,role,display_name,expires_at from public.vv_staff_invites where consumed_at is null and revoked_at is null and expires_at>now() and (public.vv2_superadmin() or (role='employee' and public.vv2_manage_scope(scope_id))) order by created_at desc limit 100) q),
 'applications',(select coalesce(jsonb_agg(to_jsonb(q)),'[]') from(select a.user_id,a.scope_id,s.name as scope_name,a.display_name,a.organisation,a.status,a.field_status,a.reviewer_id,a.reviewed_by,a.review_due,a.field_review_due,a.created_at from public.vv_volunteer_applications a join public.vv_operating_scopes s on s.id=a.scope_id where public.vv2_manage_scope(a.scope_id) or public.vv2_employee_scope(a.scope_id) order by a.updated_at desc limit 100) q),
 'audit',(select coalesce(jsonb_agg(to_jsonb(q)),'[]') from(select id,actor_id,actor_role,action,scope_id,subject_id,reason,details,created_at from public.vv_governance_audit where public.vv2_superadmin() or (scope_id is not null and public.vv2_manage_scope(scope_id)) order by created_at desc limit 100) q),
 'reports',(select coalesce(jsonb_agg(to_jsonb(q)),'[]') from(select r.* from public.vv_safety_reports r left join public.support_requests c on c.id=r.request_id left join public.vv_sos_events e on e.id=r.event_id left join public.vv_response_scopes z on z.region_id=e.region_id where r.state<>'closed' and (public.vv2_superadmin() or public.vv2_manage_scope(coalesce(c.scope_id,z.scope_id))) order by r.created_at limit 100) q));
end $$;
create or replace function public.vv2_correct_application(p_languages text,p_skills text,p_availability text,p_note text) returns void language plpgsql security definer set search_path='' as $$
declare a public.vv_volunteer_applications;
begin
 select * into a from public.vv_volunteer_applications where user_id=auth.uid() for update;
 if not found or a.status not in('changes_requested','rejected') then raise exception 'Corrections are available after a review asks for changes or rejects an application';end if;
 if length(btrim(p_note))<10 then raise exception 'Explain the correction or appeal';end if;
 update public.vv_volunteer_applications set languages=btrim(p_languages),skills=btrim(p_skills),availability=btrim(p_availability),applicant_note=btrim(p_note),status='submitted',reviewer_id=null,review_started_at=null,updated_at=now() where user_id=auth.uid();
 perform public.vv2_log('volunteer_correction_submitted',a.scope_id,auth.uid(),p_note);
end $$;
create or replace function public.vv2_case_manager(p_request uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.support_requests where id=p_request and (public.vv2_manage_scope(scope_id) or (scope_id is null and public.vv_staff_mfa() and public.vv2_superadmin())));
$$;
create or replace function public.vv2_incident_manager(p_event uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.vv_sos_events e left join public.vv_response_scopes s on s.region_id=e.region_id where e.id=p_event and (public.vv2_manage_scope(s.scope_id) or (s.scope_id is null and public.vv_staff_mfa() and public.vv2_superadmin())));
$$;
create or replace function public.vv2_purpose_access(p_id uuid,p_kind text,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare sid text;owner uuid;
begin
 if length(btrim(coalesce(p_reason,''))) not between 15 and 500 then raise exception 'Explain why access is needed (15–500 characters)';end if;
 if p_kind='case' and public.vv2_case_manager(p_id) then select scope_id,user_id into sid,owner from public.support_requests where id=p_id;
 elsif p_kind='incident' and public.vv2_incident_manager(p_id) then select s.scope_id,e.user_id into sid,owner from public.vv_sos_events e left join public.vv_response_scopes s on s.region_id=e.region_id where e.id=p_id;
 else raise exception 'Access denied for this area';end if;
 if public.vv_worker_blocked(owner,auth.uid()) then raise exception 'The owner has blocked this account. Another authorized coordinator must handle this request';end if;
 if (select count(*) from public.vv_governance_audit where actor_id=auth.uid() and action='purpose_access_opened' and created_at>now()-interval '1 hour')>=30 then raise exception 'Sensitive access limit reached. Ask another authorized coordinator to assist';end if;
 insert into public.vv_oversight_leases values(auth.uid(),p_id,p_kind,btrim(p_reason),now()+interval '10 minutes') on conflict(user_id,resource_id,kind) do update set reason=excluded.reason,expires_at=excluded.expires_at;
 perform public.vv2_log('purpose_access_opened',sid,null,p_reason,jsonb_build_object('kind',p_kind),case when p_kind='case' then p_id end,case when p_kind='incident' then p_id end);
end $$;
create or replace function public.vv2_set_case_scope(p_request uuid,p_scope text,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare old_scope text;
begin
 select scope_id into old_scope from public.support_requests where id=p_request for update;
 if not found or not public.vv_staff_mfa() or not public.vv2_superadmin() then raise exception 'Superadmin triage required for area assignment or handover';end if;
 if not exists(select 1 from public.vv_operating_scopes where id=p_scope) or length(btrim(coalesce(p_reason,'')))<15 then raise exception 'Choose a service area and record the handover reason';end if;
 update public.support_requests set scope_id=p_scope where id=p_request;
 update public.vv_case_assignments set active=false where request_id=p_request;
 delete from public.vv_oversight_leases where kind='case' and resource_id=p_request;
 delete from public.vv_evidence_grants where evidence_id in(select id from public.vv_case_evidence where request_id=p_request);
 delete from public.vv_evidence_leases where evidence_id in(select id from public.vv_case_evidence where request_id=p_request);
 perform public.vv2_log('case_area_assigned',p_scope,null,p_reason,jsonb_build_object('previous_scope',old_scope),p_request);
end $$;
create or replace function public.vv_staff_role() returns text language sql stable security definer set search_path='' as $$select case public.vv2_role() when 'superadmin' then 'admin' when 'admin' then 'admin' when 'employee' then 'case_worker' else 'none' end$$;
create or replace function public.vv_actor_name() returns text language sql stable security definer set search_path='' as $$select public.vv2_name()$$;
create or replace function public.vv_worker_eligible(p_user uuid,p_role text default null) returns boolean language sql stable security definer set search_path='' as $$
 select case when p_role='emergency_responder' then public.vv2_field_eligible(p_user) when p_role='support_volunteer' then false when p_role is not null and p_role<>'case_worker' then false else exists(select 1 from public.vv_staff_memberships where user_id=p_user and role='employee' and public.vv2_staff_valid(user_id,'employee',scope_id)) or (p_role is null and public.vv2_field_eligible(p_user)) end;
$$;
create or replace function public.vv_can_work_case(p_request_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.vv_staff_mfa() and exists(select 1 from public.support_requests r where id=p_request_id and not public.vv_worker_blocked(r.user_id,auth.uid()) and (
 (public.vv2_case_manager(r.id) and exists(select 1 from public.vv_oversight_leases where user_id=auth.uid() and kind='case' and resource_id=r.id and expires_at>now()))
 or (r.status not in('closed','resolved') and public.vv2_employee_scope(r.scope_id) and exists(select 1 from public.vv_case_assignments a where a.request_id=r.id and a.user_id=auth.uid() and a.active and a.accepted_at is not null and a.conflict_clear and a.expires_at>now()))));
$$;
drop policy if exists read_requests on public.support_requests;
create policy read_requests on public.support_requests for select to authenticated using(user_id=auth.uid());
drop policy if exists admin_update_status on public.support_requests;
-- Staff status changes pass through the audited RPC, not a general table update.
create or replace function public.vv_list_cases(p_page integer default 0,p_status text default '',p_search text default '') returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not public.vv_staff_mfa() or public.vv_staff_role()='none' then raise exception 'Verified support access required';end if;
 return(select coalesce(jsonb_agg(q),'[]') from(select r.id,case when public.vv_can_work_case(r.id) then left(r.description,180) else 'Private request · record a purpose to open' end as description,r.status,r.harassment_type,r.severity_level,r.created_at,r.scope_id,false as allow_volunteer_support,(select count(*) from public.comments c where c.request_id=r.id) as message_count,(select count(*) from public.vv_case_evidence e where e.request_id=r.id and e.ready) as evidence_count from public.support_requests r
 where (public.vv2_case_manager(r.id) or public.vv_can_work_case(r.id)) and (p_status='' or r.status=p_status) and (p_search='' or r.id::text ilike '%'||left(p_search,80)||'%' or (public.vv_can_work_case(r.id) and r.description ilike '%'||left(p_search,80)||'%')) order by case r.severity_level when 'critical' then 0 when 'high' then 1 else 2 end,r.created_at limit 25 offset greatest(0,least(p_page,10000))*25) q);
end $$;
create or replace function public.vv_open_case(p_request_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if not public.vv_can_access_case(p_request_id) then raise exception 'Case access denied' using errcode='42501';end if;
 select jsonb_build_object('id',r.id,'description',r.description,'status',r.status,'harassment_type',r.harassment_type,'severity_level',r.severity_level,'created_at',r.created_at,'scope_id',r.scope_id,'allow_volunteer_support',false,
 'team',(select coalesce(jsonb_agg(t),'[]') from(
 select a.user_id,p.display_name,'employee'::text as role,p.organisation,a.accepted_at from public.vv_case_assignments a join public.vv_staff_profiles p using(user_id) where a.request_id=r.id and a.active and a.expires_at>now() and (a.accepted_at is not null or a.acknowledge_by>now()) and public.vv2_staff_valid(a.user_id,'employee',r.scope_id) and not public.vv_worker_blocked(r.user_id,a.user_id)
 union select l.user_id,public.vv2_name(l.user_id),'oversight','Staff coordinator',now() from public.vv_oversight_leases l where l.kind='case' and l.resource_id=r.id and l.expires_at>now() and (public.vv2_superadmin(l.user_id) or public.vv2_staff_valid(l.user_id,'admin',r.scope_id)) and not public.vv_worker_blocked(r.user_id,l.user_id)) t)) into result from public.support_requests r where id=p_request_id;
 if public.vv_can_work_case(p_request_id) then perform public.vv_log_case(p_request_id,'case_opened');end if;return result;
end $$;
create or replace function public.vv_list_staff() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.vv_staff_mfa() or public.vv2_role() not in('superadmin','admin') then raise exception 'Area management access required';end if;
 return(select coalesce(jsonb_agg(q),'[]') from(select m.user_id,p.display_name,m.enabled,'case_worker'::text as role,p.organisation,p.languages,p.skills,m.available_until,m.scope_id from public.vv_staff_memberships m join public.vv_staff_profiles p using(user_id) where m.role='employee' and public.vv2_staff_valid(m.user_id,'employee',m.scope_id) and public.vv2_manage_scope(m.scope_id)) q);
end $$;
create or replace function public.vv_assign_case(p_request_id uuid,p_user_id uuid,p_active boolean default true) returns void language plpgsql security definer set search_path='' as $$
declare r public.support_requests;
begin
 select * into r from public.support_requests where id=p_request_id for update;
 if not found or not public.vv2_case_manager(r.id) then raise exception 'Area manager required';end if;
 if p_active then
 if r.status in('closed','resolved') or not public.vv2_staff_valid(p_user_id,'employee',r.scope_id) or not exists(select 1 from public.vv_staff_memberships m where user_id=p_user_id and role='employee' and public.vv2_scope_within(r.scope_id,m.scope_id) and enabled and expires_at>now() and available_until>now()) then raise exception 'Choose a current, available employee in this case’s area';end if;
 if public.vv_worker_blocked(r.user_id,p_user_id) then raise exception 'This owner has blocked that employee';end if;
 perform 1 from public.vv_staff_profiles where user_id=p_user_id for update;
 if (select count(*) from public.vv_case_assignments where user_id=p_user_id and active and expires_at>now() and (accepted_at is not null or acknowledge_by>now()))>=5 then raise exception 'Employee has reached the five-case workload limit';end if;
 end if;
 insert into public.vv_case_assignments(request_id,user_id,assigned_by,active,accepted_at,acknowledge_by,expires_at,conflict_clear) values(p_request_id,p_user_id,auth.uid(),p_active,null,now()+interval '15 minutes',now()+interval '7 days',false) on conflict(request_id,user_id) do update set active=p_active,assigned_by=auth.uid(),assigned_at=now(),accepted_at=null,acknowledge_by=excluded.acknowledge_by,expires_at=excluded.expires_at,conflict_clear=false;
 delete from public.vv_evidence_grants where worker_id=p_user_id and evidence_id in(select id from public.vv_case_evidence where request_id=p_request_id);
 perform public.vv2_log(case when p_active then 'employee_case_assigned' else 'employee_case_removed' end,r.scope_id,p_user_id,'Assignment updated','{}',p_request_id);
end $$;
create or replace function public.vv_accept_case(p_request_id uuid,p_no_conflict boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.vv_staff_mfa() or not coalesce(p_no_conflict,false) then raise exception 'Authenticator and conflict-of-interest confirmation required';end if;
 update public.vv_case_assignments a set accepted_at=now(),conflict_clear=true from public.support_requests r where a.request_id=p_request_id and a.user_id=auth.uid() and a.active and a.accepted_at is null and a.acknowledge_by>now() and a.expires_at>now() and r.id=a.request_id and r.status not in('closed','resolved') and public.vv2_employee_scope(r.scope_id) and not public.vv_worker_blocked(r.user_id,a.user_id);
 if not found then raise exception 'This assignment is no longer available';end if;
 perform public.vv_log_case(p_request_id,'assignment_acknowledged',auth.uid());
end $$;
create or replace function public.vv_my_assignments() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('request_id',a.request_id,'acknowledge_by',a.acknowledge_by,'accepted_at',a.accepted_at,'expires_at',a.expires_at,'severity',r.severity_level)),'[]') from public.vv_case_assignments a join public.support_requests r on r.id=a.request_id where public.vv_staff_mfa() and public.vv2_employee_scope(r.scope_id) and a.user_id=auth.uid() and a.active and a.expires_at>now() and (a.accepted_at is not null or a.acknowledge_by>now()) and r.status not in('resolved','closed') and not public.vv_worker_blocked(r.user_id,a.user_id);
$$;
create or replace function public.vv_worker_availability(p_on boolean) returns void language plpgsql security definer set search_path='' as $$begin perform public.vv2_staff_availability(p_on);end $$;
create or replace function public.vv_can_view_evidence(p_evidence uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.vv_case_evidence e join public.support_requests r on r.id=e.request_id where e.id=p_evidence and (r.user_id=auth.uid() or (public.vv_can_work_case(r.id) and exists(select 1 from public.vv_evidence_grants g where g.evidence_id=e.id and g.worker_id=auth.uid() and g.expires_at>now()))));
$$;
create or replace function public.vv_set_evidence_grant(p_evidence uuid,p_worker uuid,p_allowed boolean) returns void language plpgsql security definer set search_path='' as $$
declare r public.support_requests;
begin
 select s.* into r from public.support_requests s join public.vv_case_evidence e on e.request_id=s.id where e.id=p_evidence and s.user_id=auth.uid();
 if not found then raise exception 'Only the case owner can share this evidence';end if;
 if p_allowed then
 if public.vv_worker_blocked(auth.uid(),p_worker) or not ((public.vv2_staff_valid(p_worker,'employee',r.scope_id) and exists(select 1 from public.vv_case_assignments where request_id=r.id and user_id=p_worker and active and accepted_at is not null and expires_at>now())) or ((public.vv2_superadmin(p_worker) or public.vv2_staff_valid(p_worker,'admin',r.scope_id)) and exists(select 1 from public.vv_oversight_leases where user_id=p_worker and resource_id=r.id and kind='case' and expires_at>now()))) then raise exception 'Choose a current employee or coordinator shown in your case team';end if;
 insert into public.vv_evidence_grants values(p_evidence,p_worker,auth.uid(),now()+interval '7 days') on conflict(evidence_id,worker_id) do update set expires_at=excluded.expires_at;
 else delete from public.vv_evidence_grants where evidence_id=p_evidence and worker_id=p_worker;delete from public.vv_evidence_leases where evidence_id=p_evidence and user_id=p_worker;end if;
 perform public.vv_log_case(r.id,case when p_allowed then 'evidence_access_given' else 'evidence_access_removed' end,p_worker);
end $$;
-- Retire legacy invitation/review endpoints; older clients receive a safe upgrade notice.
create or replace function public.vv_create_worker_invite(p_account uuid,p_role text,p_region text) returns text language plpgsql security definer set search_path='' as $$begin raise exception 'Use the updated Team workspace for scoped staff invitations. Volunteers apply in the app';end $$;
create or replace function public.vv_apply_worker(p_token text,p_name text,p_organisation text,p_languages text,p_skills text) returns void language plpgsql security definer set search_path='' as $$begin raise exception 'Update Victim Voice to apply as a volunteer, or use the Team workspace to accept a staff invitation';end $$;
create or replace function public.vv_review_worker(p_user uuid,p_status text,p_checks boolean,p_reference text) returns void language plpgsql security definer set search_path='' as $$begin raise exception 'Use the scoped employee review and independent admin field approval';end $$;
create or replace function public.vv_sos_approve(p_user uuid,p_approved boolean,p_kind text default 'volunteer',p_agency uuid default null) returns void language plpgsql security definer set search_path='' as $$begin raise exception 'Field response requires a current employee review and independent area-admin approval in Team';end $$;

create or replace function public.vv_sos_role() returns text language sql stable security definer set search_path='' as $$select case when public.vv2_role() in('superadmin','admin') then 'admin' when public.vv2_field_eligible(auth.uid()) then 'volunteer' when public.vv2_role()='volunteer' then 'pending' else null end$$;
create or replace function public.vv_sos_profile() returns jsonb language sql stable security definer set search_path='' as $$select to_jsonb(r)-'position'||jsonb_build_object('approved',r.approved and public.vv2_field_eligible(r.user_id)) from public.vv_sos_responders r where user_id=auth.uid()$$;
create or replace function public.vv_sos_list() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(q),'[]') from(select e.id,e.created_at,e.status,e.region_id,e.routing from public.vv_sos_events e where e.user_id=auth.uid() or public.vv2_incident_manager(e.id) or (public.vv_staff_mfa() and public.vv_sos_can_respond(e.id,auth.uid())) order by e.created_at desc limit 40) q;
$$;
create or replace function public.vv2_incident_access(p_event uuid,p_user uuid default auth.uid()) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.vv_sos_events e left join public.vv_response_scopes s on s.region_id=e.region_id where e.id=p_event and e.status='active' and e.expires_at>now() and (
 e.user_id=p_user or (not public.vv_worker_blocked(e.user_id,p_user) and (
 ((public.vv2_superadmin(p_user) or public.vv2_staff_valid(p_user,'admin',s.scope_id)) and exists(select 1 from public.vv_oversight_leases where user_id=p_user and resource_id=e.id and kind='incident' and expires_at>now()))
 or (public.vv_sos_can_respond(e.id,p_user) and exists(select 1 from public.vv_sos_offers where event_id=e.id and responder_id=p_user and accepted_at is not null and access_until>now()))))));
$$;
create or replace function public.vv_sos_read(p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare e public.vv_sos_events;own boolean;details boolean;
begin
 select * into e from public.vv_sos_events where id=p_id;
 if not found or auth.uid() is null then raise exception 'Incident unavailable';end if;
 own=e.user_id=auth.uid();
 if not own and (not public.vv_staff_mfa() or (not public.vv2_incident_manager(p_id) and not public.vv_sos_can_respond(p_id,auth.uid()))) then raise exception 'Incident unavailable';end if;
 details=own or public.vv2_incident_access(p_id);
 if details and not own and not exists(select 1 from public.vv_sos_audit where event_id=p_id and actor_id=auth.uid() and action='precise_context_viewed' and created_at>now()-interval '1 minute') then insert into public.vv_sos_audit(event_id,actor_id,action) values(p_id,auth.uid(),'precise_context_viewed');end if;
 return jsonb_build_object('id',e.id,'created_at',e.created_at,'status',e.status,'expires_at',e.expires_at,'region_id',e.region_id,'routing',e.routing,'alias',case when details then e.alias end,'callback',case when own then e.callback end,
 'latitude',case when details then extensions.st_y(e.position::extensions.geometry) end,'longitude',case when details then extensions.st_x(e.position::extensions.geometry) end,'accuracy',case when details then e.accuracy end,
 'recipients',case when own then(select coalesce(jsonb_agg(jsonb_build_object('id',contact_id,'name',name,'state',state)),'[]') from public.vv_sos_recipients where event_id=p_id) end,
 'accepted',(select count(*) from public.vv_sos_offers where event_id=p_id and accepted_at is not null and public.vv_sos_can_respond(p_id,responder_id)),
 'offers',(select count(*) from public.vv_sos_offers where event_id=p_id),'details_allowed',details,'chat_allowed',public.vv2_incident_access(p_id) and (own or public.vv_staff_mfa()));
end $$;
create or replace function public.vv_dispatch_responder(p_event uuid,p_worker uuid,p_allow boolean) returns void language plpgsql security definer set search_path='' as $$
declare sid text;
begin
 if not public.vv2_incident_manager(p_event) or not public.vv2_incident_access(p_event) then raise exception 'Open this incident with an accountable purpose before dispatch';end if;
 perform 1 from public.vv_sos_events where id=p_event and status='active' and expires_at>now() for update;
 if not found then raise exception 'This incident is no longer active';end if;
 if p_allow and (not public.vv_sos_can_respond(p_event,p_worker) or not exists(select 1 from public.vv_sos_offers where event_id=p_event and responder_id=p_worker and accepted_at is not null and response_state not in('withdrawn','unsafe'))) then raise exception 'Choose an eligible available responder who acknowledged this offer';end if;
 update public.vv_sos_offers set dispatched_by=auth.uid(),access_until=case when p_allow then now()+interval '15 minutes' else null end,response_state=case when p_allow then 'assigned' else 'acknowledged' end where event_id=p_event and responder_id=p_worker;
 if not found then raise exception 'No current offer exists';end if;
 select scope_id into sid from public.vv_response_scopes s join public.vv_sos_events e on e.region_id=s.region_id where e.id=p_event;
 perform public.vv2_log(case when p_allow then 'responder_dispatched' else 'responder_access_revoked' end,sid,p_worker,'Dispatch updated','{}',null,p_event);
end $$;
alter table public.vv_sos_offers add column if not exists response_state text not null default 'offered' check(response_state in('offered','acknowledged','assigned','en_route','arrived','withdrawn','unsafe'));
alter table public.vv_sos_offers add column if not exists check_in_at timestamptz;
create or replace function public.vv_sos_can_respond(p_event uuid,p_user uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.vv_sos_events e join public.vv_sos_offers o on o.event_id=e.id join public.vv_sos_responders r on r.user_id=o.responder_id join public.vv_sos_regions z on z.id=r.region_id left join public.vv_sos_agencies a on a.id=r.agency_id where e.id=p_event and r.user_id=p_user and o.response_state not in('withdrawn','unsafe') and r.approved and public.vv2_field_eligible(p_user) and not public.vv_worker_blocked(e.user_id,p_user) and r.duty_until>now() and e.status='active' and e.expires_at>now() and r.region_id=e.region_id and ((r.kind='volunteer' and e.volunteers and z.volunteer_enabled and z.boundary is not null) or (r.kind='police' and e.police and a.enabled and a.verified_at is not null and a.region_id=r.region_id)));
$$;
create or replace function public.vv_sos_accept(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.vv_staff_mfa() or not public.vv_sos_can_respond(p_id,auth.uid()) then raise exception 'Current approved responder and authenticator verification required';end if;
 perform 1 from public.vv_sos_events where id=p_id for update;
 -- One active physical-response assignment during the initial reviewed period.
 perform 1 from public.vv_sos_responders where user_id=auth.uid() for update;
 if exists(select 1 from public.vv_sos_offers o join public.vv_sos_events e on e.id=o.event_id where o.responder_id=auth.uid() and o.event_id<>p_id and o.accepted_at is not null and o.response_state not in('withdrawn','unsafe') and e.status='active' and e.expires_at>now()) then raise exception 'You already have an active response. Ask your coordinator before taking another';end if;
 if(select count(*) from public.vv_sos_offers where event_id=p_id and accepted_at is not null and response_state not in('withdrawn','unsafe'))>=2 then raise exception 'Two responders have already acknowledged. Ask the coordinator before attending';end if;
 update public.vv_sos_offers set accepted_at=coalesce(accepted_at,now()),response_state='acknowledged',check_in_at=now() where event_id=p_id and responder_id=auth.uid() and accepted_at is null;
 if not found then raise exception 'Offer already acknowledged or unavailable';end if;
 insert into public.vv_sos_audit(event_id,actor_id,action) values(p_id,auth.uid(),'offer_acknowledged');
end $$;
create or replace function public.vv2_responder_checkin(p_event uuid,p_state text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.vv_staff_mfa() or p_state not in('en_route','arrived','withdrawn','unsafe') then raise exception 'Choose a valid check-in';end if;
 -- Withdrawal remains available even when duty/review/location access has expired.
 update public.vv_sos_offers set response_state=p_state,check_in_at=now(),access_until=case when p_state in('withdrawn','unsafe') then null else access_until end where event_id=p_event and responder_id=auth.uid() and (p_state in('withdrawn','unsafe') or (public.vv_sos_can_respond(p_event,auth.uid()) and accepted_at is not null and access_until>now()));
 if not found then raise exception 'No current assignment';end if;
 insert into public.vv_sos_audit(event_id,actor_id,action) values(p_event,auth.uid(),'responder_reported_'||p_state);
end $$;
create or replace function public.vv_dispatch_team(p_event uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.vv2_incident_manager(p_event) and not exists(select 1 from public.vv_sos_events where id=p_event and user_id=auth.uid()) then raise exception 'Incident owner or local coordinator required';end if;
 return(select coalesce(jsonb_agg(jsonb_build_object('user_id',r.user_id,'display_name',r.display_name,'organisation',a.organisation,'kind',r.kind,'accepted_at',o.accepted_at,'access_until',o.access_until,'response_state',o.response_state,'check_in_at',o.check_in_at)),'[]') from public.vv_sos_offers o join public.vv_sos_responders r on r.user_id=o.responder_id join public.vv_volunteer_applications a on a.user_id=r.user_id where event_id=p_event and public.vv2_field_eligible(r.user_id) and not public.vv_worker_blocked((select user_id from public.vv_sos_events where id=p_event),r.user_id));
end $$;
create or replace function public.vv_sos_team() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.vv_staff_mfa() or public.vv2_role() not in('superadmin','admin') then raise exception 'Local admin access required';end if;
 return(select coalesce(jsonb_agg(to_jsonb(r)-'position'),'[]') from public.vv_sos_responders r join public.vv_response_scopes s on s.region_id=r.region_id where public.vv2_manage_scope(s.scope_id));
end $$;
create or replace function public.vv_sos_areas() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.vv_staff_mfa() or public.vv2_role() not in('superadmin','admin') then raise exception 'Local admin access required';end if;
 return jsonb_build_object('regions',(select coalesce(jsonb_agg(to_jsonb(r)-'boundary'||jsonb_build_object('geometry',case when public.vv2_superadmin() then extensions.st_asgeojson(r.boundary::extensions.geometry)::jsonb end)),'[]') from public.vv_sos_regions r join public.vv_response_scopes s on s.region_id=r.id where public.vv2_manage_scope(s.scope_id)),
 'agencies',(select coalesce(jsonb_agg(to_jsonb(a)-'boundary'),'[]') from public.vv_sos_agencies a join public.vv_response_scopes s on s.region_id=a.region_id where public.vv2_manage_scope(s.scope_id)));
end $$;
create or replace function public.vv_sos_close(p_id uuid,p_status text) returns void language plpgsql security definer set search_path='' as $$
begin
 if p_status not in('cancelled','resolved') then raise exception 'Invalid closure';end if;
 update public.vv_sos_events set status=p_status where id=p_id and (user_id=auth.uid() or (public.vv2_incident_manager(p_id) and public.vv2_incident_access(p_id)));
 if not found then raise exception 'Incident unavailable';end if;
 update public.vv_sos_jobs set state='cancelled' where event_id=p_id and state='pending';update public.vv_sos_offers set access_until=null where event_id=p_id;
 insert into public.vv_sos_audit(event_id,actor_id,action) values(p_id,auth.uid(),p_status);
end $$;

-- Separate incident conversation. Assignment/purpose is checked on every read and send.
create table if not exists public.vv_incident_messages (
 id uuid primary key default gen_random_uuid(),event_id uuid not null references public.vv_sos_events on delete cascade,
 author_id uuid references auth.users on delete set null,author_name text not null,author_role text not null,
 content text not null check(length(btrim(content)) between 1 and 2000),created_at timestamptz not null default now()
);
create index if not exists vv_incident_messages_event on public.vv_incident_messages(event_id,created_at,id);
create or replace function public.vv2_chat_allowed(p_event uuid) returns boolean language sql stable security definer set search_path='' as $$select public.vv2_incident_access(p_event) and (exists(select 1 from public.vv_sos_events where id=p_event and user_id=auth.uid()) or public.vv_staff_mfa())$$;
create or replace function public.vv2_incident_messages(p_event uuid,p_before timestamptz default null) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not public.vv2_chat_allowed(p_event) then raise exception 'Incident conversation access has ended';end if;
 return(select coalesce(jsonb_agg(q order by q.created_at,q.id),'[]') from(select id,author_id,author_name,author_role,content,created_at from public.vv_incident_messages where event_id=p_event and (p_before is null or created_at<p_before) order by created_at desc,id desc limit 50) q);
end $$;
create or replace function public.vv2_send_incident_message(p_event uuid,p_id uuid,p_content text) returns void language plpgsql security definer set search_path='' as $$
declare own boolean;
begin
 if not public.vv2_chat_allowed(p_event) then raise exception 'Incident conversation access has ended';end if;
 perform 1 from public.vv_sos_events where id=p_event for update;
 if exists(select 1 from public.vv_incident_messages where id=p_id and event_id=p_event and author_id=auth.uid()) then return;end if;
 if (select count(*) from public.vv_incident_messages)>=25000 then raise exception 'The pilot chat capacity is full. Use the emergency call option if urgent';end if;
 if (select count(*) from public.vv_incident_messages where author_id=auth.uid() and created_at>now()-interval '1 minute')>=20 or (select count(*) from public.vv_incident_messages where event_id=p_event)>=2000 then raise exception 'Message limit reached. Use the emergency call option if urgent';end if;
 if p_content ~ '[+]?[0-9][0-9 ()-]{7,}[0-9]' or p_content ~* '[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}' then raise exception 'Keep personal phone numbers and email addresses out of incident chat. Continue here in the app';end if;
 select user_id=auth.uid() into own from public.vv_sos_events where id=p_event;
 insert into public.vv_incident_messages(id,event_id,author_id,author_name,author_role,content) values(p_id,p_event,auth.uid(),case when own then 'Person requesting help' else public.vv2_name() end,case when own then 'owner' when public.vv2_incident_manager(p_event) then 'coordinator' else 'volunteer' end,btrim(p_content));
end $$;

-- Incident media is separate from case evidence. Sharing snapshots the current named participants;
-- later responders/coordinators do not inherit earlier uploads.
create table if not exists public.vv_incident_evidence (
 id uuid primary key default gen_random_uuid(),request_id uuid not null references public.vv_sos_events on delete cascade,
 uploader_id uuid not null default auth.uid() references auth.users,
 kind text not null check(kind in('file','link')),label text not null check(length(btrim(label)) between 1 and 160),
 url text check(url is null or (length(url)<=2048 and url ~ '^https://[^[:space:]@]+$')),
 storage_path text unique,mime_type text,byte_size bigint not null default 0 check(byte_size between 0 and 5242880),
 sha256 text check(sha256 is null or sha256 ~ '^[0-9a-f]{64}$'),ready boolean not null default false,
 review_status text not null default 'new',created_at timestamptz not null default now(),
 check((kind='link' and url is not null and storage_path is null and byte_size=0) or (kind='file' and url is null and storage_path is not null and byte_size>0 and sha256 is not null and mime_type in('image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','audio/mpeg','audio/mp4','audio/wav','audio/ogg','application/pdf','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document')))
);
create table if not exists public.vv_incident_evidence_grants(evidence_id uuid references public.vv_incident_evidence on delete cascade,user_id uuid references auth.users on delete cascade,primary key(evidence_id,user_id));
create table if not exists public.vv_incident_evidence_leases(evidence_id uuid references public.vv_incident_evidence on delete cascade,user_id uuid references auth.users on delete cascade,expires_at timestamptz not null,primary key(evidence_id,user_id));
create or replace function public.vv2_snapshot_media_team(p_evidence uuid,p_participants uuid[]) returns void language plpgsql security definer set search_path='' as $$
declare eid uuid;
begin
 select request_id into eid from public.vv_incident_evidence where id=p_evidence;
 if p_participants is null or cardinality(p_participants)>10 then raise exception 'Review the current named participants before sharing';end if;
 if exists(select 1 from unnest(p_participants) u(id) where not public.vv2_incident_access(eid,u.id)) then raise exception 'The incident team changed. Review the current participants and try again';end if;
 insert into public.vv_incident_evidence_grants(evidence_id,user_id)
 select p_evidence,u.id from(select unnest(p_participants) as id union select user_id from public.vv_sos_events where id=eid union select uploader_id from public.vv_incident_evidence where id=p_evidence) u where public.vv2_incident_access(eid,u.id) on conflict do nothing;
end $$;
create or replace function public.vv2_can_view_incident_evidence(p_evidence uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.vv_incident_evidence e where e.id=p_evidence and public.vv2_chat_allowed(e.request_id) and (e.uploader_id=auth.uid() or exists(select 1 from public.vv_incident_evidence_grants where evidence_id=e.id and user_id=auth.uid())));
$$;
create or replace function public.vv2_reserve_evidence(p_request_id uuid,p_label text,p_mime text,p_bytes bigint,p_sha256 text,p_participants uuid[]) returns jsonb language plpgsql security definer set search_path='' as $$
declare eid uuid:=gen_random_uuid();pathname text:=p_request_id::text||'/'||eid::text;
begin
 if not public.vv2_chat_allowed(p_request_id) then raise exception 'Incident conversation access has ended';end if;
 perform pg_advisory_xact_lock(89213462);
 if (select count(*) from public.vv_incident_evidence where request_id=p_request_id)>=20 or (select coalesce(sum(case when kind='file' and not ready then 5242880 else byte_size end),0) from public.vv_incident_evidence where request_id=p_request_id)+5242880>20971520 then raise exception 'Incident media limit reached (20 items / 20 MiB)';end if;
 if (select coalesce(sum(case when kind='file' and not ready then 5242880 else byte_size end),0) from public.vv_incident_evidence)+5242880>104857600 then raise exception 'Incident media storage is full. Continue with text or a link';end if;
 insert into public.vv_incident_evidence(id,request_id,kind,label,storage_path,mime_type,byte_size,sha256) values(eid,p_request_id,'file',btrim(p_label),pathname,p_mime,p_bytes,p_sha256);
 perform public.vv2_snapshot_media_team(eid,p_participants);return jsonb_build_object('id',eid,'storage_path',pathname);
end $$;
create or replace function public.vv2_finish_evidence(p_evidence_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare e public.vv_incident_evidence;
begin
 select * into e from public.vv_incident_evidence where id=p_evidence_id and uploader_id=auth.uid() for update;
 if not found or not public.vv2_chat_allowed(e.request_id) then raise exception 'Incident conversation access has ended';end if;
 if e.kind<>'file' or not exists(select 1 from storage.objects where bucket_id='incident-evidence' and name=e.storage_path and (metadata->>'size')::bigint=e.byte_size and metadata->>'mimetype'=e.mime_type) then raise exception 'Uploaded file does not match its reserved size or media type';end if;
 update public.vv_incident_evidence set ready=true where id=e.id;
 insert into public.vv_sos_audit(event_id,actor_id,action) values(e.request_id,auth.uid(),'incident_media_shared');
end $$;
create or replace function public.vv2_cancel_evidence(p_evidence_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 delete from public.vv_incident_evidence e where e.id=p_evidence_id and e.uploader_id=auth.uid() and not e.ready and not exists(select 1 from storage.objects where bucket_id='incident-evidence' and name=e.storage_path);
 if not found then raise exception 'Remove the unfinished upload before cancelling';end if;
end $$;
create or replace function public.vv2_add_evidence_link(p_request_id uuid,p_label text,p_url text,p_participants uuid[]) returns void language plpgsql security definer set search_path='' as $$
declare eid uuid;
begin
 if not public.vv2_chat_allowed(p_request_id) then raise exception 'Incident conversation access has ended';end if;
 perform pg_advisory_xact_lock(89213462);
 if(select count(*) from public.vv_incident_evidence where request_id=p_request_id)>=20 then raise exception 'Incident attachment limit reached';end if;
 if p_url ~* '^https://(localhost|127\.|10\.|192\.168\.|169\.254\.|\[|0\.|172\.(1[6-9]|2[0-9]|3[01])\.)' then raise exception 'Use a public HTTPS link';end if;
 insert into public.vv_incident_evidence(request_id,kind,label,url,ready) values(p_request_id,'link',btrim(p_label),p_url,true) returning id into eid;
 perform public.vv2_snapshot_media_team(eid,p_participants);
 insert into public.vv_sos_audit(event_id,actor_id,action) values(p_request_id,auth.uid(),'incident_link_shared');
end $$;
create or replace function public.vv2_list_evidence(p_request_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not public.vv2_chat_allowed(p_request_id) then raise exception 'Incident conversation access has ended';end if;
 return(select coalesce(jsonb_agg(q),'[]') from(select id,label,kind,mime_type,byte_size,sha256,review_status,created_at from public.vv_incident_evidence where request_id=p_request_id and ready and public.vv2_can_view_incident_evidence(id) order by created_at desc,id desc limit 20) q);
end $$;
create or replace function public.vv2_open_evidence(p_evidence_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare e public.vv_incident_evidence;
begin
 select * into e from public.vv_incident_evidence where id=p_evidence_id and ready;
 if not found or not public.vv2_can_view_incident_evidence(e.id) then raise exception 'Incident media access denied';end if;
 insert into public.vv_incident_evidence_leases values(e.id,auth.uid(),now()+interval '30 seconds') on conflict(evidence_id,user_id) do update set expires_at=excluded.expires_at;
 if not exists(select 1 from public.vv_sos_audit where event_id=e.request_id and actor_id=auth.uid() and action='incident_media_opened' and created_at>now()-interval '1 minute') then insert into public.vv_sos_audit(event_id,actor_id,action) values(e.request_id,auth.uid(),'incident_media_opened');end if;
 return jsonb_build_object('id',e.id,'kind',e.kind,'storage_path',e.storage_path,'url',e.url,'mime_type',e.mime_type,'sha256',e.sha256);
end $$;
create or replace function public.vv2_incident_storage_allowed(p_path text,p_action text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.vv_incident_evidence e where storage_path=p_path and case when p_action='upload' then uploader_id=auth.uid() and not ready and public.vv2_chat_allowed(request_id) when p_action='cleanup' then not ready and (uploader_id=auth.uid() or exists(select 1 from public.vv_sos_events where id=e.request_id and user_id=auth.uid())) when p_action='read' then ready and public.vv2_can_view_incident_evidence(id) and exists(select 1 from public.vv_incident_evidence_leases where evidence_id=e.id and user_id=auth.uid() and expires_at>now()) else false end);
$$;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) select 'incident-evidence','incident-evidence',false,5242880,allowed_mime_types from storage.buckets where id='case-evidence' on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists vv_incident_upload on storage.objects;
create policy vv_incident_upload on storage.objects for insert to authenticated with check(bucket_id='incident-evidence' and public.vv2_incident_storage_allowed(name,'upload'));
drop policy if exists vv_incident_read on storage.objects;
create policy vv_incident_read on storage.objects for select to authenticated using(bucket_id='incident-evidence' and ((storage.allow_only_operation('object.get_authenticated') and public.vv2_incident_storage_allowed(name,'read')) or ((storage.allow_only_operation('object.delete') or storage.allow_only_operation('object.delete_many')) and public.vv2_incident_storage_allowed(name,'cleanup'))));
drop policy if exists vv_incident_cleanup on storage.objects;
create policy vv_incident_cleanup on storage.objects for delete to authenticated using(bucket_id='incident-evidence' and public.vv2_incident_storage_allowed(name,'cleanup'));
create or replace function public.vv2_prepare_incident_deletion() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required';end if;
 update public.vv_incident_evidence set ready=false where uploader_id=auth.uid() or request_id in(select id from public.vv_sos_events where user_id=auth.uid());
 return(select coalesce(jsonb_agg(storage_path),'[]') from public.vv_incident_evidence where kind='file' and (uploader_id=auth.uid() or request_id in(select id from public.vv_sos_events where user_id=auth.uid())));
end $$;
create or replace function public.vv2_expired_media() returns jsonb language sql security definer set search_path='' as $$
 select coalesce(jsonb_agg(storage_path),'[]') from(select v.storage_path from public.vv_incident_evidence v join public.vv_sos_events e on e.id=v.request_id where v.kind='file' and (e.created_at<now()-interval '7 days' or (not v.ready and v.created_at<now()-interval '1 day')) limit 100) q;
$$;
create or replace function public.vv_sos_cleanup() returns void language plpgsql security definer set search_path='' as $$
begin
 update public.vv_sos_responders set position=null,position_at=null,duty_until=null where duty_until<now();
 -- Scrub sensitive event context even if Storage is temporarily unavailable.
 update public.vv_sos_events set position=null,callback=null,alias='Expired request' where created_at<now()-interval '7 days';
 delete from public.vv_sos_recipients where event_id in(select id from public.vv_sos_events where created_at<now()-interval '7 days');
 delete from public.vv_incident_messages where event_id in(select id from public.vv_sos_events where created_at<now()-interval '7 days');
 delete from public.vv_incident_evidence v where not v.ready and v.created_at<now()-interval '1 day' and not exists(select 1 from storage.objects where bucket_id='incident-evidence' and name=v.storage_path);
 delete from public.vv_sos_events e where created_at<now()-interval '7 days' and not exists(select 1 from public.vv_incident_evidence v join storage.objects o on o.bucket_id='incident-evidence' and o.name=v.storage_path where v.request_id=e.id);
 delete from public.vv_sos_budgets where day<current_date-30;
 delete from public.vv_oversight_leases where expires_at<=now();delete from public.vv_incident_evidence_leases where expires_at<=now();
end $$;

create or replace function public.vv2_helper_report(p_event uuid,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare owner uuid;
begin
 if not public.vv_staff_mfa() or length(btrim(coalesce(p_reason,''))) not between 10 and 2000 or not exists(select 1 from public.vv_sos_offers where event_id=p_event and responder_id=auth.uid()) then raise exception 'Choose an offered incident and describe your concern';end if;
 if(select count(*) from public.vv_safety_reports where owner_id=auth.uid() and created_at>now()-interval '1 day')>=10 then raise exception 'Your reports are saved. Contact your coordinator for further updates';end if;
 select user_id into owner from public.vv_sos_events where id=p_event;
 insert into public.vv_safety_reports(owner_id,worker_id,event_id,reason) values(auth.uid(),owner,p_event,btrim(p_reason));
 update public.vv_sos_offers set response_state='unsafe',check_in_at=now(),access_until=null where event_id=p_event and responder_id=auth.uid();
 insert into public.vv_sos_audit(event_id,actor_id,action) values(p_event,auth.uid(),'helper_safety_reported');
end $$;
create or replace function public.vv_remove_worker(p_request uuid,p_worker uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.support_requests where id=p_request and user_id=auth.uid()) then raise exception 'Case owner required';end if;
 update public.vv_case_assignments set active=false where request_id=p_request and user_id=p_worker;
 delete from public.vv_oversight_leases where resource_id=p_request and kind='case' and user_id=p_worker;
 insert into public.vv_worker_blocks(owner_id,worker_id) values(auth.uid(),p_worker) on conflict do nothing;
 delete from public.vv_evidence_grants where worker_id=p_worker and evidence_id in(select id from public.vv_case_evidence where request_id=p_request);
 delete from public.vv_evidence_leases where user_id=p_worker and evidence_id in(select id from public.vv_case_evidence where request_id=p_request);
 perform public.vv_log_case(p_request,'reassignment_requested',p_worker);
end $$;
create or replace function public.vv_report_worker(p_worker uuid,p_reason text,p_request uuid default null,p_event uuid default null) returns void language plpgsql security definer set search_path='' as $$
begin
 if num_nonnulls(p_request,p_event)<>1 or length(btrim(coalesce(p_reason,''))) not between 5 and 2000 then raise exception 'Choose a request and describe your concern';end if;
 if not(exists(select 1 from public.support_requests r where r.id=p_request and r.user_id=auth.uid() and (exists(select 1 from public.vv_case_assignments where request_id=r.id and user_id=p_worker) or exists(select 1 from public.vv_oversight_leases where kind='case' and resource_id=r.id and user_id=p_worker) or exists(select 1 from public.vv_governance_audit where request_id=r.id and actor_id=p_worker and action='purpose_access_opened'))) or exists(select 1 from public.vv_sos_events e where e.id=p_event and e.user_id=auth.uid() and (exists(select 1 from public.vv_sos_offers where event_id=e.id and responder_id=p_worker) or exists(select 1 from public.vv_oversight_leases where kind='incident' and resource_id=e.id and user_id=p_worker) or exists(select 1 from public.vv_governance_audit where event_id=e.id and actor_id=p_worker and action='purpose_access_opened')))) then raise exception 'Choose a person associated with your request';end if;
 if(select count(*) from public.vv_safety_reports where owner_id=auth.uid() and created_at>now()-interval '1 day')>=10 then raise exception 'Your reports are saved. Contact the coordinator for further updates';end if;
 insert into public.vv_safety_reports(owner_id,worker_id,request_id,event_id,reason) values(auth.uid(),p_worker,p_request,p_event,btrim(p_reason));
 insert into public.vv_worker_blocks(owner_id,worker_id) values(auth.uid(),p_worker) on conflict do nothing;
 update public.vv_case_assignments set active=false where user_id=p_worker and request_id in(select id from public.support_requests where user_id=auth.uid());
 delete from public.vv_evidence_grants where worker_id=p_worker and granted_by=auth.uid();
 delete from public.vv_oversight_leases where user_id=p_worker and (resource_id in(select id from public.support_requests where user_id=auth.uid()) or resource_id in(select id from public.vv_sos_events where user_id=auth.uid()));
 update public.vv_sos_offers set access_until=null where responder_id=p_worker and event_id in(select id from public.vv_sos_events where user_id=auth.uid());
 perform public.vv_log_case(p_request,'worker_access_blocked',p_worker);
end $$;
create or replace function public.vv_review_report(p_id uuid,p_state text,p_resolution text) returns void language plpgsql security definer set search_path='' as $$
declare sid text;
begin
 select coalesce(c.scope_id,z.scope_id) into sid from public.vv_safety_reports r left join public.support_requests c on c.id=r.request_id left join public.vv_sos_events e on e.id=r.event_id left join public.vv_response_scopes z on z.region_id=e.region_id where r.id=p_id;
 if not found or not public.vv_staff_mfa() or (not public.vv2_superadmin() and not public.vv2_manage_scope(sid)) then raise exception 'Local admin review required';end if;
 if exists(select 1 from public.vv_safety_reports where id=p_id and (worker_id=auth.uid() or owner_id=auth.uid())) then raise exception 'An independent admin must review reports involving you';end if;
 if length(btrim(coalesce(p_resolution,'')))<10 or p_state not in('reviewing','closed') then raise exception 'Record the action taken and choose a review state';end if;
 update public.vv_safety_reports set state=p_state,resolution=p_resolution,reviewed_by=auth.uid() where id=p_id;
 perform public.vv2_log('safety_report_'||p_state,sid,null,p_resolution,jsonb_build_object('report_id',p_id));
end $$;
create or replace function public.vv_worker_console() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare c jsonb;
begin
 if public.vv2_role() not in('superadmin','admin','employee') then return jsonb_build_object('profile',null);end if;
 c=public.vv2_console();
 return c||jsonb_build_object('workers','[]'::jsonb,'reassignment_requests','[]'::jsonb,'access_review','[]'::jsonb,
 'overdue_cases',(select coalesce(jsonb_agg(q),'[]') from(select a.request_id,a.user_id,a.acknowledge_by,a.expires_at from public.vv_case_assignments a where public.vv2_case_manager(a.request_id) and a.active and ((a.accepted_at is null and a.acknowledge_by<=now()) or a.expires_at<=now()) limit 100) q),
 'helper_alerts',(select coalesce(jsonb_agg(q),'[]') from(select o.event_id as id,e.region_id,o.check_in_at from public.vv_sos_offers o join public.vv_sos_events e on e.id=o.event_id where public.vv2_incident_manager(e.id) and e.status='active' and e.expires_at>now() and o.response_state='unsafe' order by o.check_in_at desc limit 100) q),
 'overdue_sos',(select coalesce(jsonb_agg(q),'[]') from(select e.id,e.region_id,e.created_at from public.vv_sos_events e where public.vv2_incident_manager(e.id) and e.status='active' and e.expires_at>now() and e.created_at<now()-interval '2 minutes' and (e.volunteers or e.police) and not exists(select 1 from public.vv_sos_offers o where o.event_id=e.id and o.access_until>now() and public.vv_sos_can_respond(e.id,o.responder_id)) limit 100) q));
end $$;
create or replace function public.vv_sos_duty(p_on boolean,p_lat double precision default null,p_lon double precision default null) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required';end if;
 if not p_on then update public.vv_sos_responders set duty_until=null,position=null,position_at=null where user_id=auth.uid();return;end if;
 if not public.vv_staff_mfa() or not public.vv2_field_eligible(auth.uid()) then raise exception 'Current independent field approval and authenticator required';end if;
 if p_lat is null or p_lon is null or p_lat not between -90 and 90 or p_lon not between -180 and 180 then raise exception 'Fresh location required';end if;
 update public.vv_sos_responders set duty_until=now()+interval '15 minutes',position=extensions.st_setsrid(extensions.st_makepoint(p_lon,p_lat),4326)::extensions.geography,position_at=now() where user_id=auth.uid() and approved;
 if not found then raise exception 'Approved responder required';end if;
end $$;
-- A new case may choose an intake area, but cannot create arbitrary geographic authorizations.
create or replace function public.vv2_check_case_scope() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.scope_id is not null and not exists(select 1 from public.vv_operating_scopes where id=new.scope_id and accept_applications) then raise exception 'Choose a supported service area';end if;
 new.allow_volunteer_support=false;return new;
end $$;
drop trigger if exists vv2_case_intake_scope on public.support_requests;
create trigger vv2_case_intake_scope before insert on public.support_requests for each row execute function public.vv2_check_case_scope();
create or replace function public.vv_set_support_consent(p_request_id uuid,p_allowed boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.support_requests where id=p_request_id and user_id=auth.uid()) then raise exception 'Case owner required';end if;
 update public.support_requests set allow_volunteer_support=false where id=p_request_id;
end $$;
-- Old account deletion is replaced to include both private media buckets without leaving orphaned files.
create or replace function public.vv_delete_my_account() returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required';end if;
 if exists(select 1 from public.vv_case_evidence e join storage.objects o on o.bucket_id='case-evidence' and o.name=e.storage_path where e.uploader_id=auth.uid()) or exists(select 1 from public.vv_incident_evidence e join storage.objects o on o.bucket_id='incident-evidence' and o.name=e.storage_path where e.uploader_id=auth.uid() or e.request_id in(select id from public.vv_sos_events where user_id=auth.uid())) then raise exception 'Finish removing shared media before deleting the account';end if;
 delete from public.support_requests where user_id=auth.uid();delete from public.vv_sos_events where user_id=auth.uid();delete from public.vv_incident_evidence where uploader_id=auth.uid();delete from auth.users where id=auth.uid();
end $$;
create or replace function public.vv2_incident_participants(p_event uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not public.vv2_chat_allowed(p_event) then raise exception 'Incident conversation access has ended';end if;
 return(select coalesce(jsonb_agg(q),'[]') from(
 select r.user_id,r.display_name,'volunteer'::text as role,a.organisation from public.vv_sos_offers o join public.vv_sos_responders r on r.user_id=o.responder_id join public.vv_volunteer_applications a on a.user_id=r.user_id where o.event_id=p_event and o.access_until>now() and public.vv_sos_can_respond(p_event,r.user_id)
 union select l.user_id,public.vv2_name(l.user_id),'coordinator','Staff coordinator' from public.vv_oversight_leases l where l.kind='incident' and l.resource_id=p_event and l.expires_at>now() and public.vv2_incident_access(p_event,l.user_id)) q);
end $$;
-- Direct database provisioning remains the ONLY superadmin enrollment mechanism.
-- Private tables have no client policies/grants; all returned fields are selected by scoped RPCs.
do $$declare t text;f record;begin
 foreach t in array array['vv_operating_scopes','vv_response_scopes','vv_staff_profiles','vv_staff_memberships','vv_staff_invites','vv_volunteer_applications','vv_governance_audit','vv_oversight_leases','vv_incident_messages','vv_incident_evidence','vv_incident_evidence_grants','vv_incident_evidence_leases'] loop execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from public,anon,authenticated',t);end loop;
 for f in select oid::regprocedure as sig,proname from pg_proc where pronamespace='public'::regnamespace and proname like 'vv2_%' loop
 execute format('revoke all on function %s from public,anon,authenticated',f.sig);
 if f.proname in('vv2_field_review','vv2_incident_participants','vv2_context','vv2_scopes','vv2_create_scope','vv2_invite_staff','vv2_accept_staff','vv2_revoke_invite','vv2_set_staff_access','vv2_staff_availability','vv2_apply_volunteer','vv2_volunteer_profile','vv2_claim_volunteer_review','vv2_review_volunteer','vv2_approve_field_response','vv2_console','vv2_correct_application','vv2_purpose_access','vv2_set_case_scope','vv2_responder_checkin','vv2_incident_messages','vv2_send_incident_message','vv2_reserve_evidence','vv2_finish_evidence','vv2_cancel_evidence','vv2_add_evidence_link','vv2_list_evidence','vv2_open_evidence','vv2_incident_storage_allowed','vv2_prepare_incident_deletion','vv2_helper_report') then execute format('grant execute on function %s to authenticated',f.sig);end if;
 end loop;
 grant execute on function public.vv2_expired_media() to service_role;
 grant execute on function public.vv_worker_eligible(uuid,text),public.vv_worker_blocked(uuid,uuid),public.vv_sos_can_respond(uuid,uuid),public.vv_sos_cleanup() to service_role;
end $$;
notify pgrst,'reload schema';
$scoped_ddl$;
begin
 select n.nspname into geo_schema from pg_extension e join pg_namespace n on n.oid=e.extnamespace where e.extname='postgis';
 if geo_schema is null then raise exception 'Install sos.sql first';end if;
 execute replace(ddl,'extensions.',quote_ident(geo_schema)||'.');
end $scoped_install$;
commit;
