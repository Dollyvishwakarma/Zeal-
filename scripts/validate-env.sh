#!/usr/bin/env bash
# =============================================================================
# ZEAL — ENV VAR VALIDATOR
# =============================================================================
# Verifies every required env var is set before deploy.
# Usage: bash scripts/validate-env.sh [--app web|admin|all]
# =============================================================================

set -euo pipefail

APP="${1:-all}"
[[ "$APP" == "--app" ]] && APP="${2:-all}"

if [[ -t 1 ]]; then
  RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
  BOLD='\033[1m'; NC='\033[0m'
else
  RED=''; GREEN=''; YELLOW=''; BOLD=''; NC=''
fi

pass()  { echo -e "${GREEN}✓${NC} $1"; }
fail()  { echo -e "${RED}✗${NC} $1"; FAILED=$((FAILED+1)); }
warnv() { echo -e "${YELLOW}○${NC} $1 (optional)"; }

FAILED=0

check() {
  local name="$1" required="$2"
  local val="${!name:-}"
  if [[ -n "$val" ]]; then
    pass "$name"
  elif [[ "$required" == "required" ]]; then
    fail "$name (REQUIRED)"
  else
    warnv "$name"
  fi
}

check_file() {
  local file="$1"
  if [[ ! -f "$file" ]]; then
    echo -e "${YELLOW}→${NC} No $file found — checking process env"
    return
  fi
  # Load into shell (ignore errors from odd chars)
  set +u
  while IFS='=' read -r key value; do
    [[ "$key" =~ ^#.*$ || -z "$key" ]] && continue
    value="${value%\"}"; value="${value#\"}"
    value="${value%\'}"; value="${value#\'}"
    export "$key=$value"
  done < "$file"
  set -u
}

load_env() {
  local app="$1"
  check_file "$REPO_ROOT/apps/$app/.env.local"
  check_file "$REPO_ROOT/apps/$app/.env"
  check_file "$REPO_ROOT/.env.local"
  check_file "$REPO_ROOT/.env"
}

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ "$APP" == "all" || "$APP" == "web" ]]; then
  echo ""
  echo -e "${BOLD}Web app env vars${NC}"
  load_env web

  check NEXT_PUBLIC_SUPABASE_URL       required
  check NEXT_PUBLIC_SUPABASE_ANON_KEY  required
  check SUPABASE_SERVICE_ROLE_KEY      required
  check GROQ_API_KEY                   required
  check AGNES_API_KEY                  optional
  check ASTROASK_API_KEY               optional
  check UPSTASH_REDIS_REST_URL         required
  check UPSTASH_REDIS_REST_TOKEN       required
  check INSTAMOJO_API_KEY              optional
  check INSTAMOJO_AUTH_TOKEN           optional
  check INSTAMOJO_SALT                 optional
  check NEXT_PUBLIC_APP_URL            required
  check NEXT_PUBLIC_SITE_URL           required
  check NEXT_PUBLIC_ADMIN_URL          required
  check NEXT_PUBLIC_REALTIME_ENABLED   optional
  check CRON_SECRET                    optional
fi

if [[ "$APP" == "all" || "$APP" == "admin" ]]; then
  echo ""
  echo -e "${BOLD}Admin app env vars${NC}"
  load_env admin

  check NEXT_PUBLIC_SUPABASE_URL       required
  check NEXT_PUBLIC_SUPABASE_ANON_KEY  required
  check SUPABASE_SERVICE_ROLE_KEY      required
  check NEXT_PUBLIC_ADMIN_URL          required
fi

echo ""
if [[ $FAILED -gt 0 ]]; then
  echo -e "${RED}${BOLD}✗ $FAILED required var(s) missing${NC}"
  exit 1
else
  echo -e "${GREEN}${BOLD}✓ All required vars present${NC}"
fi