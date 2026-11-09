#!/usr/bin/env bash
set -euo pipefail
# PostgreSQL 17+ binaries must be on PATH. Uses an isolated socket, no TCP listener.
project_dir="$(cd "$(dirname "$0")/.." && pwd)"
test_dir="$(mktemp -d "${TMPDIR:-/tmp}/victimvoice-db.XXXXXX")"
cleanup() {
  pg_ctl -D "$test_dir/data" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$test_dir"
}
trap cleanup EXIT
initdb -D "$test_dir/data" -A trust -U postgres > "$test_dir/init.log"
pg_ctl -D "$test_dir/data" -l "$test_dir/server.log" -o "-h '' -k '$test_dir' -p 55440" start >/dev/null
cat > "$test_dir/bootstrap.sql" <<'SQL'
-- Minimal Supabase Auth contract for offline policy tests, not a replacement Auth service.
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users(id uuid primary key, email text, phone text);
create function auth.uid() returns uuid language sql stable as $$
 select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
SQL
psql -h "$test_dir" -p 55440 -U postgres -d postgres -v ON_ERROR_STOP=1 \
  -f "$test_dir/bootstrap.sql" \
  -f "$project_dir/supabase/schema.sql" \
  -f "$project_dir/supabase/tests/access-control.sql" \
  -f "$project_dir/supabase/mobile-schema.sql" \
  -f "$project_dir/supabase/mobile-schema.sql" \
  -f "$project_dir/supabase/tests/mobile-access.sql" \
  -f "$project_dir/supabase/tests/storage-bootstrap.sql" \
  -f "$project_dir/supabase/support-workspace.sql" \
  -f "$project_dir/supabase/support-workspace.sql" \
  -f "$project_dir/supabase/tests/support-access.sql" \
  -f "$project_dir/supabase/journey-sharing.sql" \
  -f "$project_dir/supabase/journey-sharing.sql" \
  -f "$project_dir/supabase/tests/journey-sharing.sql"
