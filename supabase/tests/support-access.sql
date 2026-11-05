begin;
create or replace function pg_temp.assert(ok boolean,msg text) returns void language plpgsql as $$begin if ok is not true then raise exception '%',msg; end if; end;$$;
insert into auth.users(id,email) values
 ('00000000-0000-0000-0000-000000000021','owner@example.test'),
 ('00000000-0000-0000-0000-000000000022','other@example.test'),
 ('00000000-0000-0000-0000-000000000023','supervisor@example.test'),
 ('00000000-0000-0000-0000-000000000024','assigned@example.test'),
 ('00000000-0000-0000-0000-000000000025','unassigned@example.test');
insert into public.admin_users values('00000000-0000-0000-0000-000000000023');
insert into public.support_requests(id,user_id,description,harassment_type,severity_level) values
 ('10000000-0000-0000-0000-000000000021','00000000-0000-0000-0000-000000000021','Fictional support case','other','medium'),
 ('10000000-0000-0000-0000-000000000022','00000000-0000-0000-0000-000000000022','Different private case','other','low');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000023',true);
do $$begin
 begin perform public.vv_set_volunteer('00000000-0000-0000-0000-000000000023','Misleading volunteer role',true); raise exception 'Supervisor silently treated as a restricted volunteer'; exception when raise_exception then if SQLERRM='Supervisor silently treated as a restricted volunteer' then raise; end if; end;
end;$$;
select public.vv_set_volunteer('00000000-0000-0000-0000-000000000024','Maya · support',true);
select public.vv_set_volunteer('00000000-0000-0000-0000-000000000025','Other volunteer',true);
do $$begin
 begin perform public.vv_assign_case('10000000-0000-0000-0000-000000000021','00000000-0000-0000-0000-000000000024'); raise exception 'Assignment without consent allowed'; exception when raise_exception then if SQLERRM='Assignment without consent allowed' then raise; end if; end;
end;$$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000021',true);
select public.vv_set_support_consent('10000000-0000-0000-0000-000000000021',true);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000023',true);
select public.vv_assign_case('10000000-0000-0000-0000-000000000021','00000000-0000-0000-0000-000000000024');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000024',true);
select pg_temp.assert(public.vv_staff_role()='volunteer','Approved volunteer recognized');
select pg_temp.assert(jsonb_array_length(public.vv_list_cases())=1,'Only assigned case listed');
select pg_temp.assert((select count(*)=0 from public.support_requests),'Volunteer cannot read raw private identities');
select pg_temp.assert(not(public.vv_open_case('10000000-0000-0000-0000-000000000021') ? 'email'),'Case view excludes email');
select pg_temp.assert(not(public.vv_open_case('10000000-0000-0000-0000-000000000021') ? 'phone'),'Case view excludes phone');
insert into public.comments(request_id,content) values('10000000-0000-0000-0000-000000000021','Fictional support reply');
select pg_temp.assert((select sender='admin' from public.comments limit 1),'Staff sender derived by database');
select public.vv_add_case_note('10000000-0000-0000-0000-000000000021','Follow up on the timeline; this is not an authenticity finding.');
select public.vv_set_case_status('10000000-0000-0000-0000-000000000021','in_progress');
do $$begin
 begin perform public.vv_open_case('10000000-0000-0000-0000-000000000022'); raise exception 'Other case exposed'; exception when insufficient_privilege then null; end;
 begin perform public.vv_set_volunteer(auth.uid(),'Self-promoted',true); raise exception 'Self approval allowed'; exception when insufficient_privilege then null; end;
 begin perform public.vv_assign_case('10000000-0000-0000-0000-000000000022',auth.uid()); raise exception 'Self assignment allowed'; exception when insufficient_privilege then null; end;
 begin insert into public.vv_case_events(actor_name,action) values('Forged','evidence_opened'); raise exception 'Audit fabrication allowed'; exception when insufficient_privilege then null; end;
end;$$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000021',true);
do $$begin
 begin perform public.vv_case_activity('10000000-0000-0000-0000-000000000021','notes'); raise exception 'Internal notes exposed to owner'; exception when insufficient_privilege then null; end;
end;$$;
select public.vv_add_evidence_link('10000000-0000-0000-0000-000000000021','Fictional link','https://example.org/resource');
select pg_temp.assert(jsonb_array_length(public.vv_list_evidence('10000000-0000-0000-0000-000000000021'))=1,'Owner can list evidence');
select pg_temp.assert(not((public.vv_list_evidence('10000000-0000-0000-0000-000000000021')->0) ? 'url'),'Destination is hidden until audited open');
-- Reserve a file and simulate Storage metadata produced by the upload service.
select public.vv_reserve_evidence('10000000-0000-0000-0000-000000000021','Fictional PNG','image/png',100,repeat('a',64)) as reserved \gset
select set_config('test.evidence_id',(:'reserved'::jsonb->>'id'),true);
select set_config('test.evidence_path',(:'reserved'::jsonb->>'storage_path'),true);
insert into storage.objects(bucket_id,name,metadata) values('case-evidence',current_setting('test.evidence_path'),'{"size":100,"mimetype":"image/png"}');
select public.vv_finish_evidence(current_setting('test.evidence_id')::uuid);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000024',true);
select set_config('storage.operation','storage.object.get_authenticated',true);
select pg_temp.assert((select count(*)=0 from storage.objects),'Read denied without an audited lease');
select public.vv_open_evidence(current_setting('test.evidence_id')::uuid);
select pg_temp.assert((select count(*)=1 from storage.objects),'Assigned volunteer reads leased evidence');
select set_config('storage.operation','storage.object.sign',true);
select pg_temp.assert((select count(*)=0 from storage.objects),'Cannot mint a long-lived signed URL');
select set_config('storage.operation','storage.object.list',true);
select pg_temp.assert((select count(*)=0 from storage.objects),'Cannot browse the storage bucket');
select set_config('storage.operation','storage.object.get_authenticated',true);
select public.vv_review_evidence(current_setting('test.evidence_id')::uuid,'under_review');
select pg_temp.assert(jsonb_array_length(public.vv_case_activity('10000000-0000-0000-0000-000000000021'))>0,'Access and actions are audited');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000025',true);
select pg_temp.assert(jsonb_array_length(public.vv_list_cases())=0,'Unassigned volunteer has no case directory');
select pg_temp.assert((select count(*)=0 from storage.objects),'Unassigned volunteer cannot read object');
do $$begin
 begin perform public.vv_open_evidence(current_setting('test.evidence_id')::uuid); raise exception 'Unassigned evidence exposed'; exception when insufficient_privilege then null; end;
 begin insert into public.comments(request_id,content) values('10000000-0000-0000-0000-000000000021','Unauthorized'); raise exception 'Unassigned reply allowed'; exception when insufficient_privilege then null; end;
end;$$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000021',true);
select public.vv_set_support_consent('10000000-0000-0000-0000-000000000021',false);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000024',true);
select pg_temp.assert(not public.vv_can_access_case('10000000-0000-0000-0000-000000000021'),'Consent withdrawal revokes case access immediately');
select pg_temp.assert((select count(*)=0 from storage.objects),'Revocation invalidates even an unexpired evidence lease');
select pg_temp.assert((select count(*)=0 from public.comments),'Revoked volunteer cannot read conversation');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000021',true);
select public.vv_set_support_consent('10000000-0000-0000-0000-000000000021',true);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000024',true);
select pg_temp.assert(not public.vv_can_work_case('10000000-0000-0000-0000-000000000021'),'Re-consenting does not revive revoked assignments');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000023',true);
select public.vv_assign_case('10000000-0000-0000-0000-000000000021','00000000-0000-0000-0000-000000000024');
select public.vv_set_volunteer('00000000-0000-0000-0000-000000000024','Maya · support',false);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000024',true);
select pg_temp.assert(public.vv_staff_role()='none','Suspension takes effect without refreshing a JWT');
select pg_temp.assert(not public.vv_can_work_case('10000000-0000-0000-0000-000000000021'),'Suspension revokes case access');
-- File limits are enforced by the database, independently of client UI.
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000021',true);
do $$begin
 begin perform public.vv_reserve_evidence('10000000-0000-0000-0000-000000000021','Too large','image/png',10485761,repeat('b',64)); raise exception 'Oversized media allowed'; exception when check_violation then null; end;
 begin perform public.vv_reserve_evidence('10000000-0000-0000-0000-000000000021','Active content','image/svg+xml',100,repeat('b',64)); raise exception 'SVG media allowed'; exception when check_violation then null; end;
end;$$;
-- Deleting the Auth row first must not orphan a real Storage object.
do $$begin
 begin perform public.vv_delete_my_account(); raise exception 'Account deleted before media cleanup'; exception when raise_exception then if SQLERRM='Account deleted before media cleanup' then raise; end if; end;
end;$$;
select public.vv_prepare_account_deletion();
select set_config('storage.operation','storage.object.delete_many',true);
select pg_temp.assert((select count(*)=1 from storage.objects),'Owner can select objects only for requested cleanup');
delete from storage.objects where bucket_id='case-evidence' and name=current_setting('test.evidence_path');
select public.vv_delete_my_account();
reset role;
select pg_temp.assert(not exists(select 1 from auth.users where id='00000000-0000-0000-0000-000000000021'),'Account deleted after successful Storage cleanup');
select pg_temp.assert(exists(select 1 from public.support_requests where id='10000000-0000-0000-0000-000000000022'),'Other case survives account deletion');
select pg_temp.assert(not (select public from storage.buckets where id='case-evidence'),'Evidence bucket is private');
rollback;
\echo 'Support assignment, consent, redaction, evidence lease, audit and revocation checks passed.'
