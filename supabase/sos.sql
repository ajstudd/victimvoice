-- Additive SOS pilot. No recipient is enabled and no external message is sent by this setup.
begin;
create schema if not exists extensions;
create extension if not exists postgis with schema extensions;

-- Respect an existing PostGIS installation's schema rather than relocating it.
do $sos_install$
declare geo_schema text; ddl text := $sos_ddl$
create table if not exists public.vv_sos_regions(
 id text primary key,name text not null,scope text not null,source_url text not null,
 boundary extensions.geography(multipolygon,4326),boundary_source text,verified_at timestamptz,
 volunteer_enabled boolean not null default false
);
insert into public.vv_sos_regions(id,name,scope,source_url) values
 ('bhopal','Bhopal','City / commissionerate','https://bhopal.mppolice.gov.in/contact/'),
 ('tripura','Tripura','Entire state; district-by-district onboarding','https://tripura.gov.in/'),
 ('bhubaneswar','Bhubaneswar','Urban Police District','https://bhubaneswarcuttackpolice.gov.in/know-your-police-station/')
on conflict(id) do update set name=excluded.name,scope=excluded.scope,source_url=excluded.source_url;
create index if not exists vv_sos_regions_geo on public.vv_sos_regions using gist(boundary);
create table if not exists public.vv_sos_agencies(
 id uuid primary key default gen_random_uuid(),region_id text not null references public.vv_sos_regions,
 name text not null check(length(name) between 1 and 120),source_url text not null check(source_url like 'https://%'),
 boundary extensions.geography(multipolygon,4326),verified_at timestamptz,enabled boolean not null default false
);
create index if not exists vv_sos_agencies_geo on public.vv_sos_agencies using gist(boundary);
create table if not exists public.vv_sos_responders(
 user_id uuid primary key references auth.users on delete cascade,display_name text not null check(length(display_name) between 1 and 80),
 region_id text not null references public.vv_sos_regions,kind text not null default 'volunteer' check(kind in('volunteer','police')),
 agency_id uuid references public.vv_sos_agencies,approved boolean not null default false,
 duty_until timestamptz,position extensions.geography(point,4326),position_at timestamptz,
 created_at timestamptz not null default now(),check(kind<>'police' or agency_id is not null or not approved)
);
create index if not exists vv_sos_responders_geo on public.vv_sos_responders using gist(position);
create table if not exists public.vv_sos_devices(
 user_id uuid not null references auth.users on delete cascade,token text not null check(token ~ '^(ExponentPushToken|ExpoPushToken)\[[a-zA-Z0-9_-]+\]$'),
 updated_at timestamptz not null default now(),primary key(user_id,token),unique(token)
);
create table if not exists public.vv_sos_events(
 id uuid primary key,user_id uuid not null references auth.users on delete cascade,
 created_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '30 minutes',
 status text not null default 'active' check(status in('active','cancelled','resolved')),
 alias text not null check(length(alias) between 1 and 60),callback text check(callback ~ '^\+[1-9][0-9]{7,14}$'),
 position extensions.geography(point,4326),position_at timestamptz,accuracy double precision check(accuracy>=0),
 region_id text references public.vv_sos_regions,relay boolean not null,volunteers boolean not null,police boolean not null,
 routing text not null default 'not_requested'
);
create index if not exists vv_sos_events_owner on public.vv_sos_events(user_id,created_at desc);
create table if not exists public.vv_sos_recipients(
 event_id uuid references public.vv_sos_events on delete cascade,contact_id uuid not null,name text not null,phone text not null,
 state text not null default 'pending' check(state in('pending','submitted','sent','delivered','failed','unknown','unavailable','relay_claimed','relay_accepted','relay_failed','relay_unknown','relay_delivered')),
 provider_sid text,updated_at timestamptz not null default now(),primary key(event_id,contact_id),unique(event_id,phone)
);
create table if not exists public.vv_sos_offers(
 event_id uuid references public.vv_sos_events on delete cascade,responder_id uuid references auth.users on delete cascade,
 offered_at timestamptz not null default now(),accepted_at timestamptz,primary key(event_id,responder_id)
);
create table if not exists public.vv_sos_jobs(
 id uuid primary key default gen_random_uuid(),event_id uuid not null references public.vv_sos_events on delete cascade,
 recipient_id uuid,contact_id uuid,kind text not null check(kind in('sms','push')),
 state text not null default 'pending' check(state in('pending','claimed','accepted','failed','unknown','cancelled')),
 created_at timestamptz not null default now(),claimed_at timestamptz,finished_at timestamptz,
 provider_id text,error_code text,unique(event_id,contact_id,kind),unique(event_id,recipient_id,kind)
);
create index if not exists vv_sos_jobs_pending on public.vv_sos_jobs(state,created_at);
create table if not exists public.vv_sos_audit(
 id bigint generated always as identity primary key,event_id uuid references public.vv_sos_events on delete cascade,
 actor_id uuid references auth.users on delete set null,action text not null,created_at timestamptz not null default now()
);
create table if not exists public.vv_sos_budgets(day date primary key,sms integer not null default 0,push integer not null default 0);

-- No direct writes: identity, role and transport transitions are checked in RPCs.
do $$ declare t text; begin
 foreach t in array array['vv_sos_regions','vv_sos_agencies','vv_sos_responders','vv_sos_devices','vv_sos_events','vv_sos_recipients','vv_sos_offers','vv_sos_jobs','vv_sos_audit','vv_sos_budgets'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon,authenticated',t);
 end loop;
end $$;
grant select on public.vv_sos_regions,public.vv_sos_agencies to authenticated;
drop policy if exists sos_regions_read on public.vv_sos_regions;
create policy sos_regions_read on public.vv_sos_regions for select to authenticated using(true);
drop policy if exists sos_agencies_read on public.vv_sos_agencies;
create policy sos_agencies_read on public.vv_sos_agencies for select to authenticated using(true);

create or replace function public.vv_sos_can_respond(p_event uuid,p_user uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.vv_sos_events e join public.vv_sos_offers o on o.event_id=e.id join public.vv_sos_responders r on r.user_id=o.responder_id join public.vv_sos_regions z on z.id=r.region_id left join public.vv_sos_agencies a on a.id=r.agency_id where e.id=p_event and r.user_id=p_user and r.approved and r.duty_until>now() and e.status='active' and e.expires_at>now() and ((r.kind='volunteer' and e.volunteers and z.volunteer_enabled and z.boundary is not null) or (r.kind='police' and e.police and a.enabled and a.verified_at is not null and a.region_id=r.region_id)));
$$;
create or replace function public.vv_sos_role() returns text language sql stable security definer set search_path='' as $$
 select case when auth.uid() is null then null when public.is_admin() then 'admin'
 else (select case when approved then kind else 'pending' end from public.vv_sos_responders where user_id=auth.uid()) end;
$$;
create or replace function public.vv_sos_profile() returns jsonb language sql stable security definer set search_path='' as $$
 select to_jsonb(r)-'position' from public.vv_sos_responders r where r.user_id=auth.uid();
$$;
create or replace function public.vv_sos_apply(p_region text,p_name text) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 insert into public.vv_sos_responders(user_id,display_name,region_id) values(auth.uid(),btrim(p_name),p_region)
 on conflict(user_id) do nothing;
end $$;
create or replace function public.vv_sos_approve(p_user uuid,p_approved boolean,p_kind text default 'volunteer',p_agency uuid default null) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Supervisor required'; end if;
 if p_kind='police' and p_approved and not exists(select 1 from public.vv_sos_agencies where id=p_agency and enabled and verified_at is not null and region_id=(select region_id from public.vv_sos_responders where user_id=p_user)) then raise exception 'Verify and enable a receiving agency first';end if;
 update public.vv_sos_responders set approved=p_approved,kind=p_kind,agency_id=case when p_kind='police' then p_agency else null end,duty_until=null,position=null,position_at=null where user_id=p_user;
 if not found then raise exception 'Responder must apply first';end if;
end $$;
create or replace function public.vv_sos_duty(p_on boolean,p_lat double precision default null,p_lon double precision default null) returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.vv_sos_responders where user_id=auth.uid() and approved) then raise exception 'Approved responder required';end if;
 if p_on and (p_lat is null or p_lon is null or p_lat not between -90 and 90 or p_lon not between -180 and 180) then raise exception 'Fresh position required';end if;
 update public.vv_sos_responders set duty_until=case when p_on then now()+interval '15 minutes' else null end,position=case when p_on then extensions.st_setsrid(extensions.st_makepoint(p_lon,p_lat),4326)::extensions.geography else null end,position_at=case when p_on then now() else null end where user_id=auth.uid();
end $$;
create or replace function public.vv_sos_register_push(p_token text) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required';end if;
 delete from public.vv_sos_devices where token=p_token;
 insert into public.vv_sos_devices(user_id,token) values(auth.uid(),p_token);
end $$;
create or replace function public.vv_sos_unregister_push(p_token text) returns void language sql security definer set search_path='' as $$
 delete from public.vv_sos_devices where user_id=auth.uid() and token=p_token;
$$;

-- Supervisor imports reviewed, authoritative geography. Seeding a region never fabricates a boundary.
create or replace function public.vv_sos_set_area(p_region text,p_geojson jsonb,p_source text,p_enabled boolean,p_agency uuid default null,p_name text default null) returns uuid language plpgsql security definer set search_path='' as $$
declare g extensions.geometry; target uuid;
begin
 if not public.is_admin() then raise exception 'Supervisor required';end if;
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
   where r.user_id<>uid and r.approved and r.kind='volunteer' and r.region_id=area and z.volunteer_enabled and r.duty_until>now() and r.position_at>now()-interval '5 minutes' and extensions.st_dwithin(r.position,pos,3000)
   and extensions.st_covers(z.boundary::extensions.geometry,r.position::extensions.geometry)
   order by extensions.st_distance(r.position,pos) limit 3;
 end if;
 if p_police and pos is not null and acc is not null then
  select count(*),(array_agg(id))[1] into agency_count,agency from public.vv_sos_agencies where enabled and verified_at is not null and boundary is not null and extensions.st_covers(boundary::extensions.geometry,extensions.st_buffer(pos,greatest(acc,1))::extensions.geometry);
  if agency_count=1 then
   update public.vv_sos_events set region_id=(select region_id from public.vv_sos_agencies where id=agency) where id=p_id;
   insert into public.vv_sos_offers(event_id,responder_id) select p_id,user_id from public.vv_sos_responders where user_id<>uid and approved and kind='police' and agency_id=agency and duty_until>now() limit 3 on conflict do nothing;
   update public.vv_sos_events set routing=case when exists(select 1 from public.vv_sos_offers o join public.vv_sos_responders r on r.user_id=o.responder_id where o.event_id=p_id and r.kind='police') then 'offered' else 'no_on_duty_recipient' end where id=p_id;
  elsif agency_count>1 then update public.vv_sos_events set routing='ambiguous_jurisdiction' where id=p_id;end if;
 end if;
 insert into public.vv_sos_jobs(event_id,recipient_id,kind) select p_id,responder_id,'push' from public.vv_sos_offers where event_id=p_id;
 insert into public.vv_sos_audit(event_id,actor_id,action) values(p_id,uid,'incident_created');
 return p_id;
end $$;

create or replace function public.vv_sos_native_result(p_id uuid,p_contact uuid,p_state text,p_fallback boolean) returns void language plpgsql security definer set search_path='' as $$
declare e public.vv_sos_events; r public.vv_sos_recipients;
begin
 select * into e from public.vv_sos_events where id=p_id and user_id=auth.uid() for update;
 if not found or e.status<>'active' or e.expires_at<now() then raise exception 'Incident inactive or unavailable';end if;
 if p_state not in('submitted','sent','delivered','failed','unknown','unavailable') then raise exception 'Invalid result';end if;
 select * into r from public.vv_sos_recipients where event_id=p_id and contact_id=p_contact for update;
 if not found then raise exception 'Contact unavailable';end if;
 if r.state like 'relay_%' or r.state='delivered' or (r.state='sent' and p_state<>'delivered') then return;end if;
 update public.vv_sos_recipients set state=p_state,updated_at=now() where event_id=p_id and contact_id=p_contact;
 if e.relay and p_fallback and p_state in('failed','unavailable') and e.created_at>now()-interval '5 minutes' then
  insert into public.vv_sos_jobs(event_id,contact_id,kind) values(p_id,p_contact,'sms') on conflict do nothing;
 end if;
end $$;
create or replace function public.vv_sos_close(p_id uuid,p_status text) returns void language plpgsql security definer set search_path='' as $$
begin
 if p_status not in('cancelled','resolved') then raise exception 'Invalid closure';end if;
 update public.vv_sos_events set status=p_status where id=p_id and (user_id=auth.uid() or public.is_admin());
 if not found then raise exception 'Incident unavailable';end if;
 update public.vv_sos_jobs set state='cancelled' where event_id=p_id and state='pending';
 insert into public.vv_sos_audit(event_id,actor_id,action) values(p_id,auth.uid(),p_status);
end $$;
create or replace function public.vv_sos_accept(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare e public.vv_sos_events;
begin
 select * into e from public.vv_sos_events where id=p_id for update;
 if not found or e.status<>'active' or e.expires_at<now() then raise exception 'Incident inactive';end if;
 if not exists(select 1 from public.vv_sos_offers o join public.vv_sos_responders r on r.user_id=o.responder_id where o.event_id=p_id and r.user_id=auth.uid() and public.vv_sos_can_respond(p_id,r.user_id)) then raise exception 'Current offer and approved on-duty role required';end if;
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
 owner_or_admin=(e.user_id=auth.uid() or public.is_admin());
 details=owner_or_admin or (e.status='active' and e.expires_at>now() and exists(select 1 from public.vv_sos_offers o join public.vv_sos_responders r on r.user_id=o.responder_id where o.event_id=p_id and r.user_id=auth.uid() and public.vv_sos_can_respond(p_id,r.user_id) and o.accepted_at is not null));
 if not owner_or_admin and not exists(select 1 from public.vv_sos_offers o join public.vv_sos_responders r on r.user_id=o.responder_id where o.event_id=p_id and o.responder_id=auth.uid() and public.vv_sos_can_respond(p_id,r.user_id)) then raise exception 'Incident unavailable';end if;
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
 where e.user_id=auth.uid() or public.is_admin() or (e.status='active' and e.expires_at>now() and exists(select 1 from public.vv_sos_offers o join public.vv_sos_responders r on r.user_id=o.responder_id where o.event_id=e.id and o.responder_id=auth.uid() and public.vv_sos_can_respond(e.id,r.user_id)))
 order by e.created_at desc limit 40) x;
$$;
create or replace function public.vv_sos_team() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin if not public.is_admin() then raise exception 'Supervisor required';end if;
 return (select coalesce(jsonb_agg(to_jsonb(r)-'position'),'[]'::jsonb) from public.vv_sos_responders r);
end $$;
create or replace function public.vv_sos_areas() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin if not public.is_admin() then raise exception 'Supervisor required';end if;
 return jsonb_build_object('regions',(select jsonb_agg(to_jsonb(r)-'boundary'||jsonb_build_object('geometry',extensions.st_asgeojson(r.boundary::extensions.geometry)::jsonb)) from public.vv_sos_regions r),'agencies',(select coalesce(jsonb_agg(to_jsonb(a)-'boundary'||jsonb_build_object('geometry',extensions.st_asgeojson(a.boundary::extensions.geometry)::jsonb)),'[]'::jsonb) from public.vv_sos_agencies a));
end $$;

-- Worker RPCs are service-role-only; a client cannot invoke provider dispatch.
create or replace function public.vv_sos_claim_job(p_kind text) returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.vv_sos_jobs;e public.vv_sos_events;count_now integer;
begin
 perform pg_advisory_xact_lock(827451);
 -- Never retry a claimed provider request with an unknown outcome.
 update public.vv_sos_jobs set state='unknown',error_code='worker_interrupted' where state='claimed' and claimed_at<now()-interval '2 minutes';
 update public.vv_sos_recipients r set state='relay_unknown' from public.vv_sos_jobs q where q.event_id=r.event_id and q.contact_id=r.contact_id and q.kind='sms' and q.state='unknown' and r.state='relay_claimed';
 update public.vv_sos_jobs q set state='cancelled' from public.vv_sos_events s where q.event_id=s.id and q.state='pending' and (s.status<>'active' or s.expires_at<now() or q.created_at<now()-interval '5 minutes');
 select q.* into j from public.vv_sos_jobs q join public.vv_sos_events s on s.id=q.event_id
 where q.state='pending' and q.kind=p_kind and s.status='active' and s.expires_at>now()
 and (q.kind='sms' or exists(select 1 from public.vv_sos_responders r where r.user_id=q.recipient_id and public.vv_sos_can_respond(q.event_id,r.user_id)))
 order by q.created_at for update of q skip locked limit 1;
 if not found then return null;end if;
 insert into public.vv_sos_budgets(day) values(current_date) on conflict do nothing;
 if p_kind='sms' then select sms into count_now from public.vv_sos_budgets where day=current_date for update;else select push into count_now from public.vv_sos_budgets where day=current_date for update;end if;
 if count_now >= (case when p_kind='sms' then 50 else 500 end) then
  update public.vv_sos_jobs set state='failed',error_code='daily_budget_limit' where id=j.id;
  if p_kind='sms' then update public.vv_sos_recipients set state='relay_failed' where event_id=j.event_id and contact_id=j.contact_id and state<>'relay_delivered';end if;
  return null;
 end if;
 update public.vv_sos_budgets set sms=sms+case when p_kind='sms' then 1 else 0 end,push=push+case when p_kind='push' then 1 else 0 end where day=current_date;
 update public.vv_sos_jobs set state='claimed',claimed_at=now() where id=j.id;
 select * into e from public.vv_sos_events where id=j.event_id;
 if p_kind='sms' then
  update public.vv_sos_recipients set state='relay_claimed' where event_id=j.event_id and contact_id=j.contact_id;
  return jsonb_build_object('job_id',j.id,'event_id',j.event_id,'contact_id',j.contact_id,'phone',(select phone from public.vv_sos_recipients where event_id=j.event_id and contact_id=j.contact_id),'alias',e.alias,'callback',e.callback,'latitude',extensions.st_y(e.position::extensions.geometry),'longitude',extensions.st_x(e.position::extensions.geometry),'position_at',e.position_at);
 end if;
 return jsonb_build_object('job_id',j.id,'event_id',j.event_id,'recipient_id',j.recipient_id,'tokens',(select coalesce(jsonb_agg(token),'[]'::jsonb) from public.vv_sos_devices where user_id=j.recipient_id and updated_at>now()-interval '30 days'));
end $$;
create or replace function public.vv_sos_finish_job(p_job uuid,p_state text,p_provider text default null,p_error text default null) returns void language plpgsql security definer set search_path='' as $$
declare j public.vv_sos_jobs;
begin
 if p_state not in('accepted','failed','unknown') then raise exception 'Invalid result';end if;
 update public.vv_sos_jobs set state=p_state,provider_id=p_provider,error_code=p_error,finished_at=now() where id=p_job and state='claimed' returning * into j;
 if found and j.kind='sms' then update public.vv_sos_recipients set state=case p_state when 'accepted' then 'relay_accepted' when 'failed' then 'relay_failed' else 'relay_unknown' end,provider_sid=p_provider,updated_at=now() where event_id=j.event_id and contact_id=j.contact_id and state not in('relay_delivered','relay_failed');end if;
end $$;
create or replace function public.vv_sos_delivery(p_job uuid,p_sid text,p_status text) returns void language plpgsql security definer set search_path='' as $$
declare j public.vv_sos_jobs;
begin
 select * into j from public.vv_sos_jobs where id=p_job and kind='sms' for update;
 if not found or (j.provider_id is not null and j.provider_id<>p_sid) then raise exception 'Callback does not match';end if;
 if p_status='delivered' then
  update public.vv_sos_recipients set state='relay_delivered',provider_sid=p_sid,updated_at=now() where event_id=j.event_id and contact_id=j.contact_id;
 elsif p_status in('failed','undelivered') then
  update public.vv_sos_recipients set state='relay_failed',provider_sid=p_sid,updated_at=now() where event_id=j.event_id and contact_id=j.contact_id and state<>'relay_delivered';
 end if;
 update public.vv_sos_jobs set provider_id=p_sid where id=p_job;
end $$;
-- Transient emergency coordinates/contact snapshots are not a permanent case archive.
create or replace function public.vv_sos_cleanup() returns void language plpgsql security definer set search_path='' as $$
begin
 update public.vv_sos_responders set position=null,position_at=null,duty_until=null where duty_until<now();
 delete from public.vv_sos_events where created_at<now()-interval '7 days';
 delete from public.vv_sos_budgets where day<current_date-30;
end $$;
-- Minimize service exposure too; worker receives only the row it claims.
do $$ declare r record;begin
 for r in select p.oid::regprocedure sig,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'vv_sos_%' loop
  execute format('revoke all on function %s from public,anon,authenticated',r.sig);
  if r.proname in('vv_sos_claim_job','vv_sos_finish_job','vv_sos_delivery','vv_sos_can_respond','vv_sos_cleanup') then execute format('grant execute on function %s to service_role',r.sig);
  else execute format('grant execute on function %s to authenticated',r.sig);end if;
 end loop;
end $$;
$sos_ddl$;
begin
 select quote_ident(n.nspname) into geo_schema from pg_extension e join pg_namespace n on n.oid=e.extnamespace where e.extname='postgis';
 execute replace(ddl,'extensions.',geo_schema||'.');
end $sos_install$;
commit;
