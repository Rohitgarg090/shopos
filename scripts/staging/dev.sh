#!/usr/bin/env bash
# Runs the app on http://localhost:3001 against the pre-production database (.env.staging).
set -euo pipefail
cd "$(dirname "$0")/../.."
[ -f .env.staging ] || { echo "Missing .env.staging — copy scripts/staging/env.staging.example to .env.staging and fill it in."; exit 1; }
STAGING_URL=$(grep -E '^NEXT_PUBLIC_SUPABASE_URL=' .env.staging | cut -d= -f2-)
PROD_URL=$(grep -E '^NEXT_PUBLIC_SUPABASE_URL=' .env.local 2>/dev/null | cut -d= -f2- || true)
[ -n "$STAGING_URL" ] || { echo ".env.staging has no NEXT_PUBLIC_SUPABASE_URL"; exit 1; }
if [ -n "$PROD_URL" ] && [ "$STAGING_URL" = "$PROD_URL" ]; then echo "STOP: .env.staging points at the PRODUCTION database."; exit 1; fi
grep -qE '^RAZORPAY_KEY_ID=rzp_live' .env.staging && { echo "STOP: use Razorpay TEST keys (rzp_test_...) in .env.staging"; exit 1; }
# Values already in the environment win over .env.local, so these override production settings.
set -a; . ./.env.staging; set +a
echo "▶ PRE-PRODUCTION  ·  database: $STAGING_URL  ·  http://localhost:3001"
exec npx next dev -p 3001
