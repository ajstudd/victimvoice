begin;
insert into auth.users(id,email) values('00000000-0000-0000-0000-000000000091','journey@example.test'),('00000000-0000-0000-0000-000000000092','other@example.test');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000091',true);
select public.vv_journey_start('10000000-0000-0000-0000-000000000091','20000000-0000-0000-0000-000000000091',30);
select public.vv_journey_update('10000000-0000-0000-0000-000000000091',23,77,20);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000092',true);
do $$ begin
 begin perform public.vv_journey_update('10000000-0000-0000-0000-000000000091',24,78,20);raise exception 'Unexpected owner bypass';exception when raise_exception then if SQLERRM='Unexpected owner bypass' then raise;end if;end;
end $$;
set local role anon;
do $$ begin
 if (public.vv_journey_view('20000000-0000-0000-0000-000000000091')->>'latitude')::float<>23 then raise exception 'Valid link not usable';end if;
 if public.vv_journey_view('20000000-0000-0000-0000-000000000092') is not null then raise exception 'Wrong token disclosed data';end if;
 begin perform * from public.vv_journey_live;raise exception 'Direct read bypass';exception when insufficient_privilege then null;end;
end $$;
reset role;
update public.vv_journey_live set updated_at=now()-interval '1 minute';
set local role anon;
do $$ begin if public.vv_journey_view('20000000-0000-0000-0000-000000000091')->>'latitude' is not null then raise exception 'Stale point exposed as current';end if;end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000091',true);
select public.vv_journey_stop('10000000-0000-0000-0000-000000000091');
set local role anon;
do $$ begin if public.vv_journey_view('20000000-0000-0000-0000-000000000091') is not null then raise exception 'Stopped link still usable';end if;end $$;
rollback;
