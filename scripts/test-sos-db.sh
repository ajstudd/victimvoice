#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd "$(dirname "$0")/.." && pwd)"
sos_container="victimvoice-sos-qa-$$"
cleanup(){ docker stop --time 3 "$sos_container" >/dev/null 2>&1 || true; }
trap cleanup EXIT
# Isolated fictional data, no host ports or host volumes. PostGIS image has no ARM64 build.
docker run --platform linux/amd64 --rm --name "$sos_container" --network none -e POSTGRES_HOST_AUTH_METHOD=trust -d postgis/postgis:17-3.5 >/dev/null
for attempt in $(seq 1 40); do
 if docker exec "$sos_container" pg_isready -U postgres >/dev/null 2>&1; then break; fi
 sleep 1
done
docker exec -i "$sos_container" psql -U postgres -v ON_ERROR_STOP=1 <<'SQL'
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users(id uuid primary key,email text,phone text);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth to anon,authenticated,service_role;
grant execute on function auth.uid() to anon,authenticated,service_role;
SQL
docker cp "$project_dir/supabase/schema.sql" "$sos_container:/tmp/schema.sql" >/dev/null
docker cp "$project_dir/supabase/sos.sql" "$sos_container:/tmp/sos.sql" >/dev/null
docker cp "$project_dir/supabase/tests/sos-access.sql" "$sos_container:/tmp/sos-access.sql" >/dev/null
docker exec "$sos_container" psql -U postgres -v ON_ERROR_STOP=1 -f /tmp/schema.sql -f /tmp/sos.sql -f /tmp/sos.sql -f /tmp/sos-access.sql
