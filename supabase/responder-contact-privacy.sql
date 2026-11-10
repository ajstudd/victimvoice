-- Keep callback numbers out of responder API responses. Owner / MFA root access is unchanged.
-- No alerts are sent and no contact values are deleted.
begin;
do $privacy_install$
declare geo_schema text; ddl text := $privacy_ddl$
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
  'alias',case when details then e.alias end,'callback',case when owner_or_admin then e.callback end,
  'latitude',case when details then extensions.st_y(e.position::extensions.geometry) end,'longitude',case when details then extensions.st_x(e.position::extensions.geometry) end,'accuracy',case when details then e.accuracy end,
  'recipients',case when owner_or_admin then (select coalesce(jsonb_agg(jsonb_build_object('id',contact_id,'name',name,'state',state)),'[]'::jsonb) from public.vv_sos_recipients where event_id=p_id) end,
  'accepted', (select count(*) from public.vv_sos_offers o join public.vv_sos_responders r on r.user_id=o.responder_id where event_id=p_id and accepted_at is not null and r.approved),
  'offers',(select count(*) from public.vv_sos_offers where event_id=p_id), 'details_allowed',details);
end $$;
$privacy_ddl$;
begin
 select n.nspname into geo_schema from pg_extension e join pg_namespace n on n.oid=e.extnamespace where e.extname='postgis';
 if geo_schema is null then raise exception 'Install the SOS schema first';end if;
 execute replace(ddl,'extensions.',quote_ident(geo_schema)||'.');
end $privacy_install$;
notify pgrst,'reload schema';
commit;
