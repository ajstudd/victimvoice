-- Minimal Storage policy contract for isolated SQL tests; not a Storage server.
create schema storage;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text,metadata jsonb, unique(bucket_id,name));
alter table storage.objects enable row level security;
grant usage on schema storage to authenticated;
grant select,insert,update,delete on storage.objects to authenticated;
create function storage.allow_only_operation(op text) returns boolean language sql stable as $$
 select replace(current_setting('storage.operation',true),'storage.','')=replace(op,'storage.','');
$$;
