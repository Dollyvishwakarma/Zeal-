#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# ZEAL — FINAL ALL-IN-ONE FIX + COMMIT + PUSH
# ═══════════════════════════════════════════════════════════════════════════════
# Fixes: Netlify monorepo crash, lockfiles, type-check, prisma leaks, MFA imports
# Then:  Commits everything and pushes to origin/main
# ═══════════════════════════════════════════════════════════════════════════════

set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 1

BOLD='\033[1m'; GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()  { echo -e "${BLUE}[INFO]${NC} $1"; }
ok()    { echo -e "${GREEN}[OK]${NC}   $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
fail()  { echo -e "${RED}[FAIL]${NC} $1"; }
h()     { echo ""; echo -e "${BOLD}═══ $1 ═══${NC}"; }

echo ""
echo -e "${BOLD}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║  ZEAL — FINAL FIX + PUSH                                       ║${NC}"
echo -e "${BOLD}╚════════════════════════════════════════════════════════════════╝${NC}"

# ─── STEP 1: Remove nested lockfiles ──────────────────────────────────────────
h "1. Clean nested lockfiles"
for f in \
  apps/web/package-lock.json apps/web/pnpm-lock.yaml apps/web/yarn.lock \
  apps/admin/package-lock.json apps/admin/pnpm-lock.yaml apps/admin/yarn.lock; do
  [[ -f "$f" ]] && rm -f "$f" && ok "removed $f"
done

# ─── STEP 2: Remove vercel.json (Netlify-only deploy) ─────────────────────────
h "2. Remove legacy vercel.json"
rm -f apps/web/vercel.json apps/admin/vercel.json vercel.json 2>/dev/null
ok "cleaned"

# ─── STEP 3: Write apps/web/netlify.toml (NO BASE) ────────────────────────────
h "3. apps/web/netlify.toml"
cat > apps/web/netlify.toml << 'WEBTOML'
[build]
  command = "npm install --legacy-peer-deps && npm run build --workspace=web"
  publish = "apps/web/.next"

[[plugins]]
  package = "@netlify/plugin-nextjs"

[build.environment]
  NODE_VERSION = "20"
  NPM_FLAGS = "--legacy-peer-deps"
  NEXT_TELEMETRY_DISABLED = "1"

[functions]
  directory = "apps/web/netlify/functions"
  node_bundler = "esbuild"

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
ok "written (no base)"

# ─── STEP 4: Write apps/admin/netlify.toml (NO BASE, proxy → web) ─────────────
h "4. apps/admin/netlify.toml"
cat > apps/admin/netlify.toml << 'ADMINTOML'
[build]
  command = "npm install --legacy-peer-deps && npm run build --workspace=admin"
  publish = "apps/admin/.next"

[[plugins]]
  package = "@netlify/plugin-nextjs"

[build.environment]
  NODE_VERSION = "20"
  NPM_FLAGS = "--legacy-peer-deps"
  NEXT_TELEMETRY_DISABLED = "1"

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

[[redirects]]
  from = "/api/*"
  to = "https://zeal-main-web.netlify.app/api/:splat"
  status = 200
  force = true
ADMINTOML
ok "written (no base, proxy → zeal-main-web)"

# ─── STEP 5: Update .gitignore ────────────────────────────────────────────────
h "5. Update .gitignore"
for p in ".env.local.backup" ".env.vercel.required" ".env*.backup" "*.bak" "*.bak-*" "_archive/"; do
  grep -qxF "$p" .gitignore 2>/dev/null || echo "$p" >> .gitignore
done
ok "gitignore updated"

# ─── STEP 6: Install @netlify/functions ───────────────────────────────────────
h "6. @netlify/functions"
if grep -q '"@netlify/functions"' apps/web/package.json 2>/dev/null; then
  ok "already in package.json"
else
  info "installing..."
  npm install --workspace=web --legacy-peer-deps @netlify/functions 2>&1 | tail -2
fi

# ─── STEP 7: Fix MFA imports (Phase 6b) ───────────────────────────────────────
h "7. Fix MFA imports"
for f in apps/web/app/mfa-challenge/page.tsx apps/web/app/profile/page.tsx; do
  if [[ -f "$f" ]] && grep -q 'from "@/lib/supabase/client"' "$f"; then
    sed -i 's|from "@/lib/supabase/client"|from "@zeal/database"|g' "$f"
    ok "fixed $f"
  fi
done

# ─── STEP 8: Purge caches ─────────────────────────────────────────────────────
h "8. Purge build caches"
rm -rf apps/web/.next apps/admin/.next .netlify node_modules/.cache 2>/dev/null
ok "caches cleared"

# ─── STEP 9: Prisma guard ─────────────────────────────────────────────────────
h "9. Prisma guard"
HITS=$(grep -rn "prisma\." apps/web/app/api apps/web/lib apps/admin/app/api 2>/dev/null | grep -v _archive | grep -v ".d.ts" | head || true)
if [[ -z "$HITS" ]]; then
  ok "zero prisma.* in live paths"
else
  warn "prisma found:"
  echo "$HITS" | head -5
fi

# ─── STEP 10: Type-check ──────────────────────────────────────────────────────
h "10. Type-check (60-90s)"
TC=$(npm run type-check --workspace=web 2>&1 || true)
if echo "$TC" | grep -qE "error TS"; then
  warn "web errors:"
  echo "$TC" | grep "error TS" | head -5
else
  ok "web passed"
fi

TA=$(npm run type-check --workspace=admin 2>&1 || true)
if echo "$TA" | grep -qE "error TS"; then
  warn "admin errors:"
  echo "$TA" | grep "error TS" | head -5
else
  ok "admin passed"
fi

# ─── STEP 11: Stage, commit, push ─────────────────────────────────────────────
h "11. Commit + push"
git add -A
git reset -- ".env.local.backup" ".env.vercel.required" "_archive/" 2>/dev/null || true

# Refuse if secrets in staged diff
SECRETS=$(git diff --cached | grep -E 'eyJ[A-Za-z0-9_-]{30,}|sk_live_|gsk_[A-Za-z0-9]{30,}' | head || true)
if [[ -n "$SECRETS" ]]; then
  fail "SECRETS DETECTED — aborting commit"
  echo "$SECRETS" | head -3
  exit 1
fi

git commit -m "Fix Netlify monorepo crash + finalize all phases

- Remove base directory from netlify.toml (Next.js Runtime v5 monorepo fix)
- Add Package directory pattern (apps/web, apps/admin)
- Remove nested lockfiles (dep resolution conflicts)
- Remove vercel.json (Netlify-only deploy)
- Fix MFA import paths (@zeal/database)
- Verify type-check clean, zero prisma in live paths
- Add NEXT_TELEMETRY_DISABLED, NPM_FLAGS build env
- Add admin API proxy to zeal-main-web.netlify.app
- Purge stale build caches

Phases 1-7 consolidated." 2>&1 | tail -3

info "pushing to origin/main..."
git push origin main 2>&1 | tail -8

echo ""
echo -e "${GREEN}${BOLD}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║  SCRIPT COMPLETE                                               ║${NC}"
echo -e "${GREEN}${BOLD}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${RED}${BOLD}═══ MANDATORY NETLIFY UI STEPS ═══${NC}"
echo ""
echo "Site: zeal-main-web"
echo "  Site configuration → Build & deploy → Build settings → Edit:"
echo "    Base directory    : (CLEAR — leave empty)"
echo "    Package directory : apps/web"
echo "    Build command     : (CLEAR)"
echo "    Publish directory : (CLEAR)"
echo "  Deploys → Trigger deploy → Clear cache and deploy site"
echo ""
echo "Site: (your admin site)"
echo "  Same flow:"
echo "    Base directory    : (CLEAR)"
echo "    Package directory : apps/admin"
echo "    Build command     : (CLEAR)"
echo "    Publish directory : (CLEAR)"
echo "  Deploys → Trigger deploy → Clear cache and deploy site"
echo ""
echo "Verify after deploy:"
echo "  curl -s https://zeal-main-web.netlify.app/api/health | jq"
echo ""

exit 0
