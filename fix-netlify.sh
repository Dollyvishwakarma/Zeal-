#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# ZEAL — NETLIFY MONOREPO COMPLETE FIX
# ═══════════════════════════════════════════════════════════════════════════════
# Root cause: Base Directory = apps/web breaks Next.js Runtime v5 in monorepos
#             because `next` is hoisted to root node_modules.
# Fix: base unset (root), package directory = apps/web, publish = apps/web/.next
# Also: removes nested lockfiles, adds build optimizations, cleans cache.
# ═══════════════════════════════════════════════════════════════════════════════

set -uo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_ROOT" || exit 1

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
ARCHIVE_DIR="${REPO_ROOT}/_archive/netlify-fix-${TIMESTAMP}"
mkdir -p "$ARCHIVE_DIR"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'
info()   { echo -e "${BLUE}[INFO]${NC}    $1"; }
ok()     { echo -e "${GREEN}[OK]${NC}      $1"; }
warn()   { echo -e "${YELLOW}[WARN]${NC}    $1"; }
fail()   { echo -e "${RED}[FAIL]${NC}    $1"; }
header() { echo ""; echo -e "${BOLD}═══════════════════════════════════════════════════════════════${NC}"; echo -e "${BOLD}  $1${NC}"; echo -e "${BOLD}═══════════════════════════════════════════════════════════════${NC}"; echo ""; }

ERRORS=0

echo ""
echo -e "${BOLD}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║  ZEAL — NETLIFY MONOREPO COMPLETE FIX                          ║${NC}"
echo -e "${BOLD}║  Timestamp: ${TIMESTAMP}                                   ║${NC}"
echo -e "${BOLD}╚════════════════════════════════════════════════════════════════╝${NC}"

# ─── Step 0: Pre-flight ───────────────────────────────────────────────────────
header "STEP 0 — Pre-flight"
[[ -d "apps/web" ]] && ok "apps/web exists" || { fail "Not in repo root"; exit 1; }
[[ -d "apps/admin" ]] && ok "apps/admin exists" || { fail "apps/admin missing"; exit 1; }

# ─── Step 1: Remove nested lockfiles ──────────────────────────────────────────
header "STEP 1 — Remove nested lockfiles"
info "Nested lockfiles confuse Netlify's dependency resolution in monorepos."

for f in \
  "apps/web/package-lock.json" "apps/web/pnpm-lock.yaml" "apps/web/yarn.lock" \
  "apps/admin/package-lock.json" "apps/admin/pnpm-lock.yaml" "apps/admin/yarn.lock"; do
  if [[ -f "$f" ]]; then
    cp "$f" "${ARCHIVE_DIR}/backup-$(echo "$f" | sed 's|/|_|g')"
    rm -f "$f"
    ok "  Removed: $f"
  fi
done

# Keep only root lockfile
if [[ -f "package-lock.json" ]]; then
  ok "  Root package-lock.json kept"
else
  warn "  Root package-lock.json missing — Netlify will generate one"
fi

# ─── Step 2: Fix apps/web/netlify.toml ────────────────────────────────────────
header "STEP 2 — apps/web/netlify.toml"
[[ -f "apps/web/netlify.toml" ]] && cp "apps/web/netlify.toml" "${ARCHIVE_DIR}/backup-apps_web_netlify.toml"

cat > "apps/web/netlify.toml" << 'WEBTOML'
# ═══════════════════════════════════════════════════════════════════════════════
# ZEAL WEB — Netlify Configuration
# ─────────────────────────────────────────────────────────────────────────────
# ⚠️  CRITICAL: NO `base =` DIRECTIVE.
#
# In the Netlify UI, set:
#   Base directory    : (EMPTY — leave blank)
#   Package directory : apps/web
#   Build command     : (leave blank — this file provides it)
#   Publish directory : (leave blank — this file provides it)
#
# WHY: `next` is hoisted to root /node_modules by npm workspaces.
#      If base=apps/web, Netlify installs deps inside apps/web/node_modules
#      (where `next` doesn't exist), so the Lambda function crashes with
#      "Cannot find module 'next/dist/server/lib/start-server.js'".
#      With base unset, Netlify installs at root → finds `next` → works.
# ═══════════════════════════════════════════════════════════════════════════════

[build]
  command = "npm install --legacy-peer-deps && npm run build --workspace=web"
  publish = "apps/web/.next"

[[plugins]]
  package = "@netlify/plugin-nextjs"

[build.environment]
  NODE_VERSION = "20"
  NPM_FLAGS = "--legacy-peer-deps"
  NEXT_TELEMETRY_DISABLED = "1"

# ─── Scheduled cron functions ──────────────────────────────────────────────────
[functions]
  directory = "apps/web/netlify/functions"
  node_bundler = "esbuild"

# ─── Security headers ─────────────────────────────────────────────────────────
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "SAMEORIGIN"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(self), microphone=(self), geolocation=()"
    Strict-Transport-Security = "max-age=31536000; includeSubDomains"

[[headers]]
  for = "/_next/static/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/api/*"
  [headers.values]
    Cache-Control = "no-store, max-age=0, must-revalidate"

# ─── Redirects ────────────────────────────────────────────────────────────────
[[redirects]]
  from = "/auth/login"
  to = "/login"
  status = 301

[[redirects]]
  from = "/auth/register"
  to = "/register"
  status = 301

[[redirects]]
  from = "/ai-consultants"
  to = "/ai-astrologers"
  status = 301

[[redirects]]
  from = "/quests"
  to = "/sparks"
  status = 302

[[redirects]]
  from = "/referral"
  to = "/sparks"
  status = 302

[[redirects]]
  from = "/bazaar"
  to = "/explore"
  status = 302
WEBTOML
ok "  Written (no base directive)"

# Verify no base remains
if grep -q '^  base = ' "apps/web/netlify.toml" 2>/dev/null; then
  fail "  base directive still present!"
  ERRORS=$((ERRORS+1))
else
  ok "  Verified: no base directive"
fi

# ─── Step 3: Fix apps/admin/netlify.toml ──────────────────────────────────────
header "STEP 3 — apps/admin/netlify.toml"
[[ -f "apps/admin/netlify.toml" ]] && cp "apps/admin/netlify.toml" "${ARCHIVE_DIR}/backup-apps_admin_netlify.toml"

cat > "apps/admin/netlify.toml" << 'ADMINTOML'
# ═══════════════════════════════════════════════════════════════════════════════
# ZEAL ADMIN — Netlify Configuration
# ─────────────────────────────────────────────────────────────────────────────
# ⚠️  CRITICAL: NO `base =` DIRECTIVE.
#
# In the Netlify UI, set:
#   Base directory    : (EMPTY — leave blank)
#   Package directory : apps/admin
#   Build command     : (leave blank)
#   Publish directory : (leave blank)
# ═══════════════════════════════════════════════════════════════════════════════

[build]
  command = "npm install --legacy-peer-deps && npm run build --workspace=admin"
  publish = "apps/admin/.next"

[[plugins]]
  package = "@netlify/plugin-nextjs"

[build.environment]
  NODE_VERSION = "20"
  NPM_FLAGS = "--legacy-peer-deps"
  NEXT_TELEMETRY_DISABLED = "1"

# ─── Security headers (stricter for admin) ────────────────────────────────────
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "no-referrer"
    Permissions-Policy = "camera=(), microphone=(), geolocation=()"
    Strict-Transport-Security = "max-age=31536000; includeSubDomains"

[[headers]]
  for = "/_next/static/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/api/*"
  [headers.values]
    Cache-Control = "no-store, max-age=0, must-revalidate"

# ─── API PROXY: forward /api/* to the web app ─────────────────────────────────
[[redirects]]
  from = "/api/*"
  to = "https://zeal-main-web.netlify.app/api/:splat"
  status = 200
  force = true
ADMINTOML
ok "  Written (no base, proxy → zeal-main-web)"

if grep -q '^  base = ' "apps/admin/netlify.toml" 2>/dev/null; then
  fail "  base directive still present!"
  ERRORS=$((ERRORS+1))
else
  ok "  Verified: no base directive"
fi

# ─── Step 4: Remove legacy vercel.json (conflicts on Netlify) ─────────────────
header "STEP 4 — Cleanup legacy configs"
for f in "apps/web/vercel.json" "apps/admin/vercel.json"; do
  if [[ -f "$f" ]]; then
    cp "$f" "${ARCHIVE_DIR}/backup-$(echo "$f" | sed 's|/|_|g')"
    rm -f "$f"
    ok "  Removed: $f (Vercel-only)"
  fi
done

# ─── Step 5: Verify @netlify/functions ────────────────────────────────────────
header "STEP 5 — @netlify/functions dependency"
if grep -q '"@netlify/functions"' "apps/web/package.json" 2>/dev/null; then
  ok "  Already present"
else
  warn "  Missing — installing..."
  npm install --workspace=web --legacy-peer-deps @netlify/functions 2>&1 | tail -3
  if grep -q '"@netlify/functions"' "apps/web/package.json" 2>/dev/null; then
    ok "  Installed"
  else
    fail "  Install failed — run manually: npm install --workspace=web --legacy-peer-deps @netlify/functions"
    ERRORS=$((ERRORS+1))
  fi
fi

# ─── Step 6: Purge build caches ───────────────────────────────────────────────
header "STEP 6 — Purge local build caches"
for d in "apps/web/.next" "apps/admin/.next" ".netlify" "node_modules/.cache"; do
  if [[ -d "$d" ]]; then
    rm -rf "$d"
    ok "  Purged: $d"
  fi
done

# ─── Step 7: Verify with type-check ───────────────────────────────────────────
header "STEP 7 — Type-check (sanity)"
TC_WEB=$(npm run type-check --workspace=web 2>&1 || true)
if echo "$TC_WEB" | grep -qE "error TS"; then
  fail "  Web type-check errors:"
  echo "$TC_WEB" | grep "error TS" | head -5
  ERRORS=$((ERRORS+1))
else
  ok "  Web type-check passed"
fi

TC_ADMIN=$(npm run type-check --workspace=admin 2>&1 || true)
if echo "$TC_ADMIN" | grep -qE "error TS"; then
  fail "  Admin type-check errors:"
  echo "$TC_ADMIN" | grep "error TS" | head -5
  ERRORS=$((ERRORS+1))
else
  ok "  Admin type-check passed"
fi

# ─── Step 8: Commit ───────────────────────────────────────────────────────────
header "STEP 8 — Commit"
git add apps/web/netlify.toml apps/admin/netlify.toml apps/web/package.json package-lock.json 2>/dev/null

# Handle deletions
git rm --cached apps/web/vercel.json apps/admin/vercel.json 2>/dev/null || true
for f in apps/web/package-lock.json apps/admin/package-lock.json; do
  [[ ! -f "$f" ]] && git rm --cached "$f" 2>/dev/null || true
done

git commit -m "Fix Netlify monorepo crash: base unset, package dir set, lockfiles cleaned

- Remove base= from both netlify.toml (Next.js Runtime v5 requires root install)
- Remove nested lockfiles (cause dep resolution conflicts)
- Remove vercel.json (Netlify-only deploy)
- Add NEXT_TELEMETRY_DISABLED + NPM_FLAGS build env
- Purge stale .next build caches" 2>&1 | tail -3

# ─── Summary ──────────────────────────────────────────────────────────────────
header "SUMMARY"
echo -e "  Errors: ${BOLD}${ERRORS}${NC}"
echo -e "  Backups: ${ARCHIVE_DIR}"
echo ""

if [[ $ERRORS -eq 0 ]]; then
  echo -e "${GREEN}${BOLD}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}${BOLD}║  ALL AUTOMATED FIXES APPLIED                                   ║${NC}"
  echo -e "${GREEN}${BOLD}╚════════════════════════════════════════════════════════════════╝${NC}"
else
  echo -e "${YELLOW}${BOLD}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${YELLOW}${BOLD}║  ${ERRORS} issue(s) require manual fix                               ║${NC}"
  echo -e "${YELLOW}${BOLD}╚════════════════════════════════════════════════════════════════╝${NC}"
fi

# ─── The critical UI steps ────────────────────────────────────────────────────
echo ""
echo -e "${RED}${BOLD}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}${BOLD}║  MANDATORY NETLIFY UI STEPS — CANNOT BE AUTOMATED              ║${NC}"
echo -e "${RED}${BOLD}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BOLD}For WEB site (zeal-main-web):${NC}"
echo "  Netlify → Site configuration → Build & deploy → Build settings → Edit"
echo ""
echo "    Base directory    :  (CLEAR IT — leave empty)"
echo "    Package directory :  apps/web"
echo "    Build command     :  (CLEAR IT)"
echo "    Publish directory :  (CLEAR IT)"
echo ""
echo -e "${BOLD}For ADMIN site:${NC}"
echo "  Same flow:"
echo ""
echo "    Base directory    :  (CLEAR IT)"
echo "    Package directory :  apps/admin"
echo "    Build command     :  (CLEAR IT)"
echo "    Publish directory :  (CLEAR IT)"
echo ""
echo -e "${BOLD}Both sites:${NC}"
echo "  Deploys → Trigger deploy → ${BOLD}Clear cache and deploy site${NC}"
echo ""

echo -e "${BOLD}Then:${NC}"
echo "  git push origin main"
echo ""
echo -e "${BOLD}Verify:${NC}"
echo "  curl -s https://zeal-main-web.netlify.app/api/health | jq"
echo ""

exit 0
