-- Additive, repeatable setup for the Android companion. No imported data or reset.
begin;
create table if not exists public.vv_contacts (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 100),
  phone text not null check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  relationship text not null default '' check (length(relationship) <= 100),
  primary_contact boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists vv_contacts_owner_phone on public.vv_contacts(user_id, phone);
create unique index if not exists vv_one_primary_contact on public.vv_contacts(user_id) where primary_contact;
create index if not exists vv_contacts_owner on public.vv_contacts(user_id);
alter table public.vv_contacts enable row level security;
revoke all on public.vv_contacts from anon, authenticated;
grant select, delete on public.vv_contacts to authenticated;
grant insert (id,name,phone,relationship,primary_contact) on public.vv_contacts to authenticated;
grant update (name,phone,relationship,primary_contact) on public.vv_contacts to authenticated;
drop policy if exists vv_contact_ownership on public.vv_contacts;
create policy vv_contact_ownership on public.vv_contacts for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create table if not exists public.vv_safety_plans (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  safe_place text not null default '' check (length(safe_place) <= 1000),
  helpful_steps text not null default '' check (length(helpful_steps) <= 4000)
);
alter table public.vv_safety_plans enable row level security;
revoke all on public.vv_safety_plans from anon, authenticated;
grant select, delete on public.vv_safety_plans to authenticated;
grant insert (safe_place,helpful_steps) on public.vv_safety_plans to authenticated;
grant update (safe_place,helpful_steps) on public.vv_safety_plans to authenticated;
drop policy if exists vv_plan_ownership on public.vv_safety_plans;
create policy vv_plan_ownership on public.vv_safety_plans for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- A survivor can request help without naming an accused or revealing a home address.
alter table public.support_requests alter column user_address drop not null;
alter table public.support_requests alter column accused_name drop not null;
alter table public.support_requests alter column accused_address drop not null;

-- Required for the mobile privacy control; deletes only the caller's own Auth account.
create or replace function public.vv_delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  delete from auth.users where id = auth.uid();
end;
$$;
revoke all on function public.vv_delete_my_account() from public, anon;
grant execute on function public.vv_delete_my_account() to authenticated;
commit;
