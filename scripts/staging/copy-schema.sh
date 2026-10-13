#!/usr/bin/env bash
# Copies the production database STRUCTURE (tables, functions, RLS policies, grants) into the
# staging Supabase project. No customer data is copied. Reads .env.db in the project root:
#   PROD_DB_URL=postgresql://...      (production  — Supabase → Connect → Session pooler)
#   STAGING_DB_URL=postgresql://...   (pre-production project)
# Usage: bash scripts/staging/copy-schema.sh            (first time)
#        bash scripts/staging/copy-schema.sh --reset    (wipe staging tables and copy again)
set -euo pipefail
cd "$(dirname "$0")/../.."

[ -f .env.db ] || { echo "Missing .env.db — create it from scripts/staging/env.db.example"; exit 1; }
set -a; . ./.env.db; set +a
: "${PROD_DB_URL:?PROD_DB_URL missing in .env.db}"; : "${STAGING_DB_URL:?STAGING_DB_URL missing in .env.db}"

nopass() { echo "$1" | sed -E 's#^([a-z]+://[^:@/]+):[^@]*@#\1@#; s#\?.*$##'; }   # URL without password/query
if [ "$(nopass "$PROD_DB_URL")" = "$(nopass "$STAGING_DB_URL")" ]; then
  echo "STOP: PROD_DB_URL and STAGING_DB_URL point to the same database."; exit 1
fi

# Supabase runs Postgres 15+; pg_dump must be at least as new as the server.
PGBIN="${PGBIN:-}"   # override for testing
[ -n "$PGBIN" ] || for d in /opt/homebrew/opt/libpq/bin /opt/homebrew/opt/postgresql@17/bin /opt/homebrew/opt/postgresql@16/bin /opt/homebrew/opt/postgresql@15/bin /usr/local/opt/libpq/bin; do
  [ -x "$d/pg_dump" ] && { PGBIN="$d"; break; }
done
[ -n "$PGBIN" ] || { echo "Need a newer pg_dump. Run:  brew install libpq   then run this script again."; exit 1; }
echo "Using $("$PGBIN/pg_dump" --version)"

echo "Checking connections..."
"$PGBIN/psql" "$PROD_DB_URL" -Atc "select 'production ok: ' || count(*) || ' tables' from pg_tables where schemaname='public'"
"$PGBIN/psql" "$STAGING_DB_URL" -Atc "select 'staging ok: ' || count(*) || ' tables' from pg_tables where schemaname='public'"

EXISTING=$("$PGBIN/psql" "$STAGING_DB_URL" -Atc "select count(*) from pg_tables where schemaname='public'")
if [ "$EXISTING" != "0" ]; then
  if [ "${1:-}" != "--reset" ]; then
    echo "Staging already has $EXISTING tables. Re-run with --reset to wipe staging and copy again."; exit 1
  fi
  echo "Resetting staging public schema..."
  "$PGBIN/psql" "$STAGING_DB_URL" -v ON_ERROR_STOP=1 -q <<'SQL'
drop schema public cascade;
create schema public;
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on all tables in schema public to postgres, anon, authenticated, service_role;
grant all on all functions in schema public to postgres, anon, authenticated, service_role;
grant all on all sequences in schema public to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;
SQL
fi

DUMP=$(mktemp -t shopos-schema).sql
echo "Dumping production structure (no data)..."
"$PGBIN/pg_dump" "$PROD_DB_URL" --schema=public --schema-only --no-owner --no-comments -f "$DUMP"
# the public schema already exists on the new project
sed -i '' -E '/^CREATE SCHEMA public;$/d; /^COMMENT ON SCHEMA public/d' "$DUMP"

echo "Restoring into staging..."
"$PGBIN/psql" "$STAGING_DB_URL" -q -v ON_ERROR_STOP=0 -f "$DUMP" 2> /tmp/shopos-restore-errors.txt || true
ERRS=$(grep -c "ERROR" /tmp/shopos-restore-errors.txt || true)
"$PGBIN/psql" "$STAGING_DB_URL" -c "notify pgrst, 'reload schema';" -q
rm -f "$DUMP"

echo
"$PGBIN/psql" "$STAGING_DB_URL" -Atc "select 'staging now has ' || count(*) || ' tables' from pg_tables where schemaname='public'"
if [ "$ERRS" != "0" ]; then
  echo "$ERRS statement(s) reported errors (often harmless 'already exists'). Details: /tmp/shopos-restore-errors.txt"
else
  echo "Done with no errors."
fi
