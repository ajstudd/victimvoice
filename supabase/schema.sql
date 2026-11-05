-- One-time setup for a new, empty VictimVoice Supabase project.
-- Creates tables and access rules; does not import or delete existing data.
begin;

-- Only a trusted database operator can grant admin access.
create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.admin_users enable row level security;
revoke all on public.admin_users from anon, authenticated;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.admin_users where user_id = (select auth.uid())); $$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create table public.support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  email text not null default '',
  phone text not null default '',
  user_address text not null check (length(user_address) between 1 and 1000),
  accused_name text not null check (length(accused_name) between 1 and 200),
  accused_address text not null check (length(accused_address) between 1 and 1000),
  accused_phone text not null default '' check (length(accused_phone) <= 40),
  harassment_type text not null check (harassment_type in ('cyber_harassment', 'workplace_harassment', 'stalking', 'verbal_abuse', 'physical_threat', 'other')),
  severity_level text not null check (severity_level in ('low', 'medium', 'high', 'critical')),
  description text not null check (length(description) between 1 and 20000),
  screenshot_url text check (screenshot_url is null or (length(screenshot_url) <= 2048 and screenshot_url ~* '^https?://[^[:space:]]+$')),
  video_url text check (video_url is null or (length(video_url) <= 2048 and video_url ~* '^https?://[^[:space:]]+$')),
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'resolved', 'closed')),
  created_at timestamptz not null default now()
);
create index support_requests_owner_created on public.support_requests(user_id, created_at desc, id desc);
create index support_requests_created on public.support_requests(created_at desc, id desc);

-- Contact details are always from the verified Auth user, never supplied by the browser.
create function public.set_request_contact() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  select coalesce(email, ''), coalesce(phone, '') into new.email, new.phone
    from auth.users where id = new.user_id;
  return new;
end;
$$;
revoke all on function public.set_request_contact() from public;
create trigger request_contact before insert on public.support_requests
for each row execute function public.set_request_contact();

alter table public.support_requests enable row level security;
revoke all on public.support_requests from anon, authenticated;
grant select on public.support_requests to authenticated;
grant insert (user_address, accused_name, accused_address, accused_phone, harassment_type, severity_level, description, screenshot_url, video_url) on public.support_requests to authenticated;
grant update (status) on public.support_requests to authenticated;
create policy read_requests on public.support_requests for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy create_request on public.support_requests for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'pending');
create policy admin_update_status on public.support_requests for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.support_requests(id) on delete cascade,
  author_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  sender text not null check (sender in ('admin', 'user')),
  content text not null check (length(btrim(content)) between 1 and 5000),
  created_at timestamptz not null default now()
);
create index comments_request_created on public.comments(request_id, created_at, id);
create function public.set_comment_sender() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.sender := case when public.is_admin() then 'admin' else 'user' end;
  return new;
end;
$$;
revoke all on function public.set_comment_sender() from public;
create trigger comment_sender before insert on public.comments
for each row execute function public.set_comment_sender();
alter table public.comments enable row level security;
revoke all on public.comments from anon, authenticated;
grant select on public.comments to authenticated;
grant insert (request_id, content) on public.comments to authenticated;
create policy read_comments on public.comments for select to authenticated
  using (exists (select 1 from public.support_requests r where r.id = request_id));
create policy create_comment on public.comments for insert to authenticated
  with check (author_id = (select auth.uid()) and exists (
    select 1 from public.support_requests r where r.id = request_id
  ));

commit;
