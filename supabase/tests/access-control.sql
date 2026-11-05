-- Run with psql against a disposable database after applying schema.sql. Rolls back all fixtures.
\set ON_ERROR_STOP on
begin;
create function pg_temp.assert(ok boolean, message text) returns void language plpgsql as $$
begin if not coalesce(ok, false) then raise exception 'FAIL: %', message; end if; end;
$$;
insert into auth.users(id, email, phone) values
 ('00000000-0000-0000-0000-000000000001', 'owner@example.test', null),
 ('00000000-0000-0000-0000-000000000002', 'other@example.test', '919876543210'),
 ('00000000-0000-0000-0000-000000000003', 'admin@example.test', null);
insert into public.admin_users values ('00000000-0000-0000-0000-000000000003');
insert into public.support_requests(id, user_id, user_address, accused_name, accused_address, harassment_type, severity_level, description) values
 ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Address', 'Name', 'Address', 'other', 'low', 'Owner fixture'),
 ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'Address', 'Name', 'Address', 'other', 'low', 'Other fixture');

set local role anon;
do $$ begin
  begin perform * from public.support_requests; raise exception 'Anonymous reports exposed';
  exception when insufficient_privilege then null; end;
  begin perform * from public.comments; raise exception 'Anonymous comments exposed';
  exception when insufficient_privilege then null; end;
end $$;

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select pg_temp.assert(not public.is_admin(), 'User must not be admin');
select pg_temp.assert((select count(*) = 1 from public.support_requests), 'Owner sees only own report');
insert into public.support_requests(user_address, accused_name, accused_address, harassment_type, severity_level, description)
 values ('Address', 'Name', 'Address', 'other', 'medium', 'Google user without phone');
select pg_temp.assert((select email = 'owner@example.test' and phone = '' and status = 'pending'
 from public.support_requests where description = 'Google user without phone'), 'Verified email and empty phone are supported');
insert into public.comments(request_id, content) values ('10000000-0000-0000-0000-000000000001', 'Owner message');
select pg_temp.assert((select sender = 'user' from public.comments where content = 'Owner message'), 'Sender is derived');
do $$ declare changed integer; begin
  update public.support_requests set status = 'resolved' where id = '10000000-0000-0000-0000-000000000001';
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'User changed status'; end if;
  begin insert into public.admin_users values (auth.uid()); raise exception 'User granted admin';
  exception when insufficient_privilege then null; end;
  begin insert into public.comments(request_id, content, sender) values ('10000000-0000-0000-0000-000000000001', 'Spoof', 'admin'); raise exception 'Sender spoof allowed';
  exception when insufficient_privilege then null; end;
  begin insert into public.support_requests(user_id, user_address, accused_name, accused_address, harassment_type, severity_level, description)
    values ('00000000-0000-0000-0000-000000000002', 'A', 'N', 'A', 'other', 'low', 'Spoof'); raise exception 'Owner spoof allowed';
  exception when insufficient_privilege then null; end;
  begin update public.support_requests set description = 'Tampered'; raise exception 'Report content editable';
  exception when insufficient_privilege then null; end;
  begin delete from public.comments; raise exception 'Comments deletable';
  exception when insufficient_privilege then null; end;
  begin insert into public.support_requests(user_address, accused_name, accused_address, harassment_type, severity_level, description, screenshot_url)
    values ('A', 'N', 'A', 'other', 'low', 'Invalid evidence', 'javascript:alert(1)'); raise exception 'Unsafe evidence allowed';
  exception when check_violation then null; end;
end $$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
select pg_temp.assert((select count(*) = 1 from public.support_requests), 'Other user sees only own report');
select pg_temp.assert((select count(*) = 0 from public.comments), 'Other user cannot read owner comments');
do $$ begin
  begin insert into public.comments(request_id, content) values ('10000000-0000-0000-0000-000000000001', 'Unauthorized'); raise exception 'Cross-user comment allowed';
  exception when insufficient_privilege then null; end;
end $$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', true);
select pg_temp.assert(public.is_admin(), 'Granted admin recognized');
select pg_temp.assert((select count(*) = 3 from public.support_requests), 'Admin can read all reports');
update public.support_requests set status = 'in_progress' where id = '10000000-0000-0000-0000-000000000001';
select pg_temp.assert((select status = 'in_progress' from public.support_requests where id = '10000000-0000-0000-0000-000000000001'), 'Admin status update succeeds');
insert into public.comments(request_id, content) values ('10000000-0000-0000-0000-000000000001', 'Admin reply');
select pg_temp.assert((select sender = 'admin' from public.comments where content = 'Admin reply'), 'Admin sender derived');
do $$ begin
  begin update public.support_requests set email = 'spoof@example.test'; raise exception 'Admin contact spoof allowed';
  exception when insufficient_privilege then null; end;
  begin update public.support_requests set status = 'invalid'; raise exception 'Invalid status allowed';
  exception when check_violation then null; end;
end $$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select pg_temp.assert((select count(*) = 2 from public.comments), 'Owner can read admin reply');
reset role;
-- Simulate admin access being revoked; it must take effect without refreshing JWTs.
delete from public.admin_users;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', true);
select pg_temp.assert(not public.is_admin(), 'Revocation is immediate');
select pg_temp.assert((select count(*) = 0 from public.support_requests), 'Revoked admin cannot see reports');
rollback;
\echo 'All access-control checks passed.'
