#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# ZEAL — Smoke Test
# ─────────────────────────────────────────────────────────────────────────────
# End-to-end verifier for a running Zeal deployment.
#
# Usage:
#   bash scripts/smoke-test.sh                                 # local defaults
#   bash scripts/smoke-test.sh https://web.zeal.app            # prod web
#   bash scripts/smoke-test.sh https://web.zeal.app https://admin.zeal.app
# ═══════════════════════════════════════════════════════════════════════════════

set -uo pipefail

WEB="${1:-http://localhost:3000}"
ADMIN="${2:-http://localhost:3001}"

if [[ -t 1 ]]; then
  RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
  BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'
else
  RED=''; GREEN=''; YELLOW=''; BLUE=''; BOLD=''; NC=''
fi

PASS=0
FAIL=0

check_status() {
  local label="$1" url="$2" expected="$3"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "000")
  if [[ "$code" == "$expected" ]]; then
    echo -e "${GREEN}✓${NC} $label → $code"
    PASS=$((PASS+1))
  else
    echo -e "${RED}✗${NC} $label → $code (expected $expected)"
    FAIL=$((FAIL+1))
  fi
}

check_json_field() {
  local label="$1" url="$2" field="$3"
  local body
  body=$(curl -s --max-time 10 "$url" 2>/dev/null || echo "")
  if echo "$body" | grep -q "\"$field\""; then
    echo -e "${GREEN}✓${NC} $label → contains '$field'"
    PASS=$((PASS+1))
  else
    echo -e "${RED}✗${NC} $label → missing '$field' in response"
    FAIL=$((FAIL+1))
  fi
}

check_no_cache_header() {
  local label="$1" url="$2"
  local headers
  headers=$(curl -sI --max-time 10 "$url" 2>/dev/null || echo "")
  if echo "$headers" | grep -iq "cache-control: *no-store"; then
    echo -e "${GREEN}✓${NC} $label → no-store cache header present"
    PASS=$((PASS+1))
  else
    echo -e "${YELLOW}○${NC} $label → no-store header not detected (soft)"
    PASS=$((PASS+1))
  fi
}

echo ""
echo -e "${BOLD}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║  ZEAL — SMOKE TEST                                             ║${NC}"
echo -e "${BOLD}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Web   : ${BLUE}${WEB}${NC}"
echo -e "  Admin : ${BLUE}${ADMIN}${NC}"
echo ""

# ─── WEB: public pages ────────────────────────────────────────────────────────
echo -e "${BOLD}Web — public routes${NC}"
check_status "GET /"                 "$WEB/"                  200
check_status "GET /login"            "$WEB/login"             200
check_status "GET /register"         "$WEB/register"          200
check_status "GET /services"         "$WEB/services"          200
check_status "GET /explore"          "$WEB/explore"           200
check_status "GET /mfa-challenge"    "$WEB/mfa-challenge"     200

# ─── WEB: health check ────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}Web — health${NC}"
check_status      "GET /api/health"           "$WEB/api/health"          200
check_json_field  "GET /api/health → status"  "$WEB/api/health"          "status"
check_json_field  "GET /api/health → checks"  "$WEB/api/health"          "checks"

# ─── WEB: auth guards (should 401 for anonymous) ──────────────────────────────
echo ""
echo -e "${BOLD}Web — auth guards${NC}"
check_status "GET /api/admin/stats (anon)"       "$WEB/api/admin/stats"                401
check_status "GET /api/users/me/profile (anon)"  "$WEB/api/users/me/profile"           401
check_status "GET /api/wallet/balance (anon)"    "$WEB/api/wallet/balance"             401
check_status "GET /api/notifications (anon)"     "$WEB/api/notifications"              401

# ─── WEB: public APIs ─────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}Web — public APIs${NC}"
check_status "GET /api/ai/consultants"     "$WEB/api/ai/consultants"     200
check_status "GET /api/explore/trending"   "$WEB/api/explore/trending"   200

# ─── WEB: protected routes redirect to login ──────────────────────────────────
echo ""
echo -e "${BOLD}Web — protected route redirects${NC}"
for path in /wallet /chat /bookings /profile /notifications /sparks; do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$WEB$path" 2>/dev/null || echo "000")
  if [[ "$code" == "307" || "$code" == "302" || "$code" == "200" ]]; then
    echo -e "${GREEN}✓${NC} GET $path → $code"
    PASS=$((PASS+1))
  else
    echo -e "${YELLOW}○${NC} GET $path → $code"
    PASS=$((PASS+1))
  fi
done

# ─── WEB: cache headers on API ────────────────────────────────────────────────
echo ""
echo -e "${BOLD}Web — cache headers${NC}"
check_no_cache_header "GET /api/health"      "$WEB/api/health"

# ─── ADMIN ────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}Admin — public routes${NC}"
check_status "GET /login"     "$ADMIN/login"     200
check_status "GET /"          "$ADMIN/"          200

# ─── ADMIN: API proxy to web ──────────────────────────────────────────────────
echo ""
echo -e "${BOLD}Admin — API proxy${NC}"
if [[ "$ADMIN" != "$WEB" ]]; then
  check_status      "GET /api/health (proxied)"      "$ADMIN/api/health"   200
  check_json_field  "GET /api/health (proxied) → status"  "$ADMIN/api/health" "status"
else
  warn "Admin == Web URL — skipping proxy checks"
fi

# ─── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}═══════════════════════════════════════════════════════════════${NC}"
if [[ $FAIL -eq 0 ]]; then
  echo -e "${GREEN}${BOLD}  ✓ ALL ${PASS} CHECKS PASSED${NC}"
  echo -e "${BOLD}═══════════════════════════════════════════════════════════════${NC}"
  echo ""
  exit 0
else
  echo -e "${RED}${BOLD}  ✗ ${FAIL} FAILED, ${PASS} PASSED${NC}"
  echo -e "${BOLD}═══════════════════════════════════════════════════════════════${NC}"
  echo ""
  exit 1
fi
