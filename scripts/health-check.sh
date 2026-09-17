#!/usr/bin/env bash
# =============================================================================
# ZEAL — POST-DEPLOY SMOKE TEST
# =============================================================================
# Pings critical endpoints on web + admin.
# Usage: bash scripts/health-check.sh [web_url] [admin_url]
# =============================================================================

set -euo pipefail

WEB_URL="${1:-${NEXT_PUBLIC_APP_URL:-http://localhost:3000}}"
ADMIN_URL="${2:-${NEXT_PUBLIC_ADMIN_URL:-http://localhost:3001}}"

if [[ -t 1 ]]; then
  RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
  BOLD='\033[1m'; NC='\033[0m'
else
  RED=''; GREEN=''; YELLOW=''; BOLD=''; NC=''
fi

PASS=0; FAIL=0

check_url() {
  local label="$1" url="$2" expect="$3"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "000")
  if [[ "$code" == "$expect" ]]; then
    echo -e "${GREEN}✓${NC} $label → $code"
    PASS=$((PASS+1))
  else
    echo -e "${RED}✗${NC} $label → $code (expected $expect)"
    FAIL=$((FAIL+1))
  fi
}

check_json() {
  local label="$1" url="$2"
  local body
  body=$(curl -s --max-time 10 "$url" 2>/dev/null || echo "")
  if echo "$body" | grep -q '"status"'; then
    echo -e "${GREEN}✓${NC} $label → JSON OK"
    PASS=$((PASS+1))
  else
    echo -e "${RED}✗${NC} $label → invalid response"
    FAIL=$((FAIL+1))
  fi
}

echo ""
echo -e "${BOLD}Web app ($WEB_URL)${NC}"
check_url  "GET /"               "$WEB_URL/"                    200
check_url  "GET /login"          "$WEB_URL/login"               200
check_url  "GET /services"       "$WEB_URL/services"            200
check_url  "GET /api/health"     "$WEB_URL/api/health"          200
check_json "GET /api/health"     "$WEB_URL/api/health"

echo ""
echo -e "${BOLD}API auth guards${NC}"
check_url  "GET /api/admin/stats (anon)"  "$WEB_URL/api/admin/stats"  401
check_url  "GET /api/users/me/profile"    "$WEB_URL/api/users/me/profile" 401

echo ""
echo -e "${BOLD}Admin app ($ADMIN_URL)${NC}"
check_url  "GET /login"          "$ADMIN_URL/login"             200
check_url  "GET /"               "$ADMIN_URL/"                  200

echo ""
if [[ $FAIL -gt 0 ]]; then
  echo -e "${RED}${BOLD}✗ $FAIL check(s) failed, $PASS passed${NC}"
  exit 1
else
  echo -e "${GREEN}${BOLD}✓ All $PASS checks passed${NC}"
fi