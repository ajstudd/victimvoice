\set ON_ERROR_STOP on
begin;
create function pg_temp.assert(ok boolean,message text) returns void language plpgsql as $$begin if not coalesce(ok,false) then raise exception 'FAIL %',message; end if; end;$$;
insert into auth.users(id,email) values ('00000000-0000-0000-0000-000000000011','mobile-a@example.test'),('00000000-0000-0000-0000-000000000012','mobile-b@example.test'),('00000000-0000-0000-0000-000000000013','mobile-admin@example.test');
insert into public.admin_users values('00000000-0000-0000-0000-000000000013');
set local role anon;
do $$ begin
 begin perform * from public.vv_contacts; raise exception 'anon contacts exposed';exception when insufficient_privilege then null;end;
 begin perform public.vv_delete_my_account();raise exception 'anon delete permitted';exception when insufficient_privilege then null;end;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000011',true);
insert into public.vv_contacts(id,name,phone,primary_contact) values('20000000-0000-0000-0000-000000000001','Trusted person','+919876543210',true);
insert into public.vv_safety_plans(safe_place,helpful_steps) values('My choice','My steps');
select pg_temp.assert((select count(*)=1 from public.vv_contacts),'owner reads own contacts');
do $$begin
 begin insert into public.vv_contacts(id,name,phone,primary_contact) values(gen_random_uuid(),'Other','+919876543211',true);raise exception 'two primary contacts allowed';exception when unique_violation then null;end;
 begin insert into public.vv_contacts(id,user_id,name,phone) values(gen_random_uuid(),'00000000-0000-0000-0000-000000000012','Spoof','+919876543212');raise exception 'owner spoof permitted';exception when insufficient_privilege then null;end;
 begin insert into public.vv_contacts(id,name,phone) values(gen_random_uuid(),'Invalid','bad');raise exception 'invalid phone allowed';exception when check_violation then null;end;
end $$;
insert into public.support_requests(description,harassment_type,severity_level) values('No forced address or accused','other','medium');
select pg_temp.assert((select count(*)=1 from public.support_requests),'request without address supported');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000012',true);
select pg_temp.assert((select count(*)=0 from public.vv_contacts),'other user cannot see contacts');
select pg_temp.assert((select count(*)=0 from public.vv_safety_plans),'other user cannot see plan');
do $$declare n integer;begin delete from public.vv_contacts;get diagnostics n=row_count;if n<>0 then raise exception 'cross user delete';end if;end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000013',true);
select pg_temp.assert((select count(*)=0 from public.vv_contacts),'admins cannot read private circle');
select pg_temp.assert((select count(*)=0 from public.vv_safety_plans),'admins cannot read private plan');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000011',true);
select public.vv_delete_my_account();
reset role;
select pg_temp.assert((select count(*)=0 from auth.users where id='00000000-0000-0000-0000-000000000011'),'self deletion removes own user');
select pg_temp.assert((select count(*)=2 from auth.users where id in ('00000000-0000-0000-0000-000000000012','00000000-0000-0000-0000-000000000013')),'self deletion preserves other accounts');
select pg_temp.assert((select count(*)=0 from public.vv_contacts),'self deletion cascades owned contacts');
rollback;
\echo 'Mobile ownership and deletion checks passed.'
