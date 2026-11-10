#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd "$(dirname "$0")/.." && pwd)"
test_container="victimvoice-governance-qa-$$"
# Fail quickly if the engine is unavailable; do not restart unrelated containers.
python3 - <<'PY_CHECK'
import subprocess
subprocess.run(['docker','info','--format','{{.ServerVersion}}'],check=True,timeout=8,stdout=subprocess.DEVNULL)
PY_CHECK
cleanup(){
 python3 - "$test_container" <<'PY_CLEAN'
import subprocess,sys
try: subprocess.run(['docker','stop','--time','3',sys.argv[1]],timeout=10,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
except subprocess.TimeoutExpired: print('Cleanup timed out for '+sys.argv[1],file=sys.stderr)
PY_CLEAN
}
trap cleanup EXIT
docker run --platform linux/amd64 --rm --name "$test_container" --network none -e POSTGRES_HOST_AUTH_METHOD=trust -d postgis/postgis:17-3.5 >/dev/null
for attempt in $(seq 1 40); do
 if docker exec "$test_container" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; then break; fi
 sleep 1
done
docker exec -i "$test_container" psql -U postgres -v ON_ERROR_STOP=1 <<'SQL'
create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;
create schema auth;create table auth.users(id uuid primary key,email text,phone text);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
grant usage on schema auth to anon,authenticated,service_role;
grant execute on all functions in schema auth to anon,authenticated,service_role;
SQL
for file in schema.sql mobile-schema.sql tests/storage-bootstrap.sql support-workspace.sql journey-sharing.sql sos.sql safety-governance.sql safety-governance.sql tests/governance-access.sql; do
 docker cp "$project_dir/supabase/$file" "$test_container:/tmp/input.sql" >/dev/null
 docker exec "$test_container" psql -U postgres -v ON_ERROR_STOP=1 -f /tmp/input.sql
done
