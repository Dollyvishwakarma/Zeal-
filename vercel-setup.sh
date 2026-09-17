#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# ZEAL — VERCEL DEPLOYMENT SETUP
# ═══════════════════════════════════════════════════════════════════════════════
# Targets:
#   Web   : https://zeal-web-red.vercel.app    →  apps/web
#   Admin : https://zeal-admin-rose.vercel.app →  apps/admin
#
# Changes:
#   1. Cleanup Netlify + vercel.json files
#   2. apps/admin/next.config.js    — proxy /api/* → web
#   3. apps/admin/middleware.ts     — NEW: attach Authorization Bearer
#   4. apps/web/lib/auth/api-guard.ts — accept Bearer OR cookie
#   5. apps/web/middleware.ts       — short-circuit for Bearer-authed APIs
#   6. Commit
# ═══════════════════════════════════════════════════════════════════════════════

set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 1

BOLD='\033[1m'; GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()  { echo -e "${BLUE}[INFO]${NC} $1"; }
ok()    { echo -e "${GREEN}[OK]${NC}   $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
fail()  { echo -e "${RED}[FAIL]${NC} $1"; }
h()     { echo ""; echo -e "${BOLD}═══ $1 ═══${NC}"; }

TS="$(date +%Y%m%d-%H%M%S)"
ARCHIVE="_archive/vercel-setup-${TS}"
mkdir -p "$ARCHIVE"
ERRORS=0

echo ""
echo -e "${BOLD}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║  ZEAL — VERCEL DEPLOYMENT SETUP                                ║${NC}"
echo -e "${BOLD}║  Web: zeal-web-red   Admin: zeal-admin-rose                    ║${NC}"
echo -e "${BOLD}╚════════════════════════════════════════════════════════════════╝${NC}"

# ─── 1. Cleanup Netlify + vercel.json ─────────────────────────────────────────
h "1/6 — Cleanup legacy configs"
for f in \
  apps/web/netlify.toml apps/admin/netlify.toml \
  apps/web/vercel.json apps/admin/vercel.json vercel.json; do
  if [[ -f "$f" ]]; then
    cp "$f" "${ARCHIVE}/backup-$(echo "$f" | sed 's|/|_|g')"
    rm -f "$f"
    ok "removed: $f"
  fi
done
for d in apps/web/netlify apps/admin/netlify; do
  [[ -d "$d" ]] && rm -rf "$d" && ok "removed dir: $d"
done

# ─── 2. apps/admin/next.config.js ─────────────────────────────────────────────
h "2/6 — apps/admin/next.config.js"
if [[ -f apps/admin/next.config.js ]]; then
  cp apps/admin/next.config.js "${ARCHIVE}/backup-apps_admin_next.config.js"
fi
cat > apps/admin/next.config.js << 'ADMIN_NEXT'
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@zeal/ui", "@zeal/types", "@zeal/database", "@zeal/utils"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "ui-avatars.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
  turbopack: { root: __dirname },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "https://zeal-web-red.vercel.app/api/:path*",
      },
    ];
  },
};

module.exports = nextConfig;
ADMIN_NEXT
ok "written"

# ─── 3. apps/admin/middleware.ts (NEW) ────────────────────────────────────────
h "3/6 — apps/admin/middleware.ts"
if [[ -f apps/admin/middleware.ts ]]; then
  cp apps/admin/middleware.ts "${ARCHIVE}/backup-apps_admin_middleware.ts"
fi
cat > apps/admin/middleware.ts << 'ADMIN_MW'
// apps/admin/middleware.ts
// ═══════════════════════════════════════════════════════════════════════════════
// ZEAL ADMIN — Middleware
//   • Refreshes admin Supabase session
//   • Injects Authorization: Bearer <token> on /api/* requests before proxy
//   • Route guard for the admin portal (admin roles only)
// ═══════════════════════════════════════════════════════════════════════════════

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_ROUTES = ["/login", "/auth/callback", "/not-found"];
const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN", "SUPPORT", "VIEWER"];

function isPublic(pathname: string): boolean {
  return PUBLIC_ROUTES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const { pathname } = request.nextUrl;

  // ─── API proxy: attach admin's access token ────────────────────────────
  if (pathname.startsWith("/api/")) {
    if (session?.access_token) {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("Authorization", `Bearer ${session.access_token}`);
      requestHeaders.set("X-Admin-Proxy", "1");

      const apiResponse = NextResponse.next({
        request: { headers: requestHeaders },
      });

      response.cookies.getAll().forEach((c) => apiResponse.cookies.set(c));
      return apiResponse;
    }
    return response;
  }

  // ─── Page routes ───────────────────────────────────────────────────────
  if (isPublic(pathname)) return response;

  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(url);
  }

  const role = (session.user.app_metadata?.role as string | undefined) ?? "USER";
  if (!ADMIN_ROLES.includes(role)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", "unauthorized");
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
ADMIN_MW
ok "written"

# ─── 4. apps/web/lib/auth/api-guard.ts ────────────────────────────────────────
h "4/6 — apps/web/lib/auth/api-guard.ts"
if [[ -f apps/web/lib/auth/api-guard.ts ]]; then
  cp apps/web/lib/auth/api-guard.ts "${ARCHIVE}/backup-apps_web_lib_auth_api-guard.ts"
fi
cat > apps/web/lib/auth/api-guard.ts << 'API_GUARD'
// apps/web/lib/auth/api-guard.ts
// ═══════════════════════════════════════════════════════════════════════════════
// ZEAL — API Auth Guard
// Accepts auth from EITHER:
//   1. Bearer token (admin proxy)  → admin app sends this
//   2. Supabase session cookie     → direct client calls
// ═══════════════════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createServerClientFromCookies, createAdminClient } from "@zeal/database/server";

export type Role = "USER" | "CLIENT_ADMIN" | "SUPPORT" | "ADMIN" | "SUPER_ADMIN" | "VIEWER";

const ROLE_LEVEL: Record<string, number> = {
  VIEWER: 10,
  USER: 20,
  CLIENT_ADMIN: 40,
  SUPPORT: 50,
  ADMIN: 80,
  SUPER_ADMIN: 100,
};

export interface GuardSuccess {
  ok: true;
  userId: string;
  email: string | null;
  role: string;
  admin: ReturnType<typeof createAdminClient>;
}
export interface GuardFailure {
  ok: false;
  response: NextResponse;
}
export type GuardResult = GuardSuccess | GuardFailure;

// ─── Bearer token verification ────────────────────────────────────────────────
async function verifyAccessToken(
  token: string
): Promise<{ userId: string; email: string | null; role: string } | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data?.user) return null;

    const user = data.user;
    let role = (user.app_metadata?.role as string) ?? "";

    // Token may be stale (role changed after issuance) — DB fallback
    if (!role) {
      const { data: profile } = await admin
        .from("User")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      role = (profile?.role as string) || "USER";
    }

    return { userId: user.id, email: user.email ?? null, role };
  } catch {
    return null;
  }
}

// ─── Reads Authorization header safely ────────────────────────────────────────
async function getAuthHeader(): Promise<string | null> {
  try {
    const h = await headers();
    return h.get("authorization");
  } catch {
    return null;
  }
}

// ─── Core guard ───────────────────────────────────────────────────────────────
export async function requireAdminAPI(minRole: Role = "ADMIN"): Promise<GuardResult> {
  try {
    let userId: string | null = null;
    let email: string | null = null;
    let role = "USER";

    // ─── Path A: Bearer token (admin proxy) ────────────────────────────────
    const authHeader = await getAuthHeader();
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7).trim();
      const verified = await verifyAccessToken(token);
      if (verified) {
        userId = verified.userId;
        email = verified.email;
        role = verified.role;
      }
    }

    // ─── Path B: Cookie session (direct client) ────────────────────────────
    if (!userId) {
      const supabase = await createServerClientFromCookies();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (!error && user) {
        userId = user.id;
        email = user.email ?? null;
        role = (user.app_metadata?.role as string) ?? "USER";

        if (!user.app_metadata?.role) {
          const { data: profile } = await supabase
            .from("User")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();
          role = (profile?.role as string) || "USER";
        }
      }
    }

    if (!userId) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Unauthorized", code: "AUTH_UNAUTHORIZED" },
          { status: 401 }
        ),
      };
    }

    const userLevel = ROLE_LEVEL[role] ?? 0;
    const requiredLevel = ROLE_LEVEL[minRole] ?? 100;

    if (userLevel < requiredLevel) {
      return {
        ok: false,
        response: NextResponse.json(
          {
            error: `Forbidden — requires ${minRole}`,
            code: "AUTH_FORBIDDEN",
            yourRole: role,
          },
          { status: 403 }
        ),
      };
    }

    return { ok: true, userId, email, role, admin: createAdminClient() };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Auth check failed";
    return {
      ok: false,
      response: NextResponse.json(
        { error: message, code: "AUTH_ERROR" },
        { status: 500 }
      ),
    };
  }
}

export async function requireUserAPI(): Promise<GuardResult> {
  return requireAdminAPI("USER");
}

export async function requireSuperAdminAPI(): Promise<GuardResult> {
  return requireAdminAPI("SUPER_ADMIN");
}

export async function logAdminAction(
  admin: ReturnType<typeof createAdminClient>,
  params: {
    adminId: string;
    action: string;
    targetType: string;
    targetId?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  try {
    await admin.from("AdminAuditLog").insert({
      userId: params.adminId,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId ?? null,
      metadata: (params.metadata ?? {}) as never,
      success: true,
    });
  } catch (err) {
    console.warn("[Audit] Failed to log admin action:", err);
  }
}
API_GUARD
ok "written"

# ─── 5. apps/web/middleware.ts — short-circuit Bearer-authed API calls ────────
h "5/6 — apps/web/middleware.ts"
if [[ -f apps/web/middleware.ts ]]; then
  cp apps/web/middleware.ts "${ARCHIVE}/backup-apps_web_middleware.ts"
fi
cat > apps/web/middleware.ts << 'WEB_MW'
// apps/web/middleware.ts
// ═══════════════════════════════════════════════════════════════════════════════
// ZEAL WEB — Middleware
//   • Refreshes Supabase session cookie
//   • Bearer-authed /api/* requests skip middleware (handled by api-guard)
//   • Route guards for consultant + admin prefixes
// ═══════════════════════════════════════════════════════════════════════════════

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_ROUTES = [
  "/", "/explore", "/services", "/ai-astrologers", "/consultant", "/white-label",
  "/zeal", "/login", "/register", "/auth/callback", "/auth/verify-invite",
  "/payment/success", "/payment/failure", "/not-found",
];
const AUTH_REQUIRED_PREFIXES = [
  "/chat", "/wallet", "/bookings", "/booking", "/profile",
  "/notifications", "/sparks", "/create", "/post", "/debug", "/session",
];
const CONSULTANT_REQUIRED_PREFIXES = [
  "/consultant/dashboard", "/consultant/bookings", "/consultant/clients",
  "/consultant/earnings", "/consultant/availability", "/consultant/settings",
  "/consultant/onboarding", "/consultant/pending",
];
const ADMIN_REQUIRED_PREFIXES = ["/admin"];

const isPublic = (p: string) =>
  p === "/" || PUBLIC_ROUTES.some((r) => p === r || p.startsWith(r + "/"));
const requiresAuth = (p: string) =>
  AUTH_REQUIRED_PREFIXES.some((r) => p === r || p.startsWith(r + "/"));
const requiresConsultant = (p: string) =>
  CONSULTANT_REQUIRED_PREFIXES.some((r) => p === r || p.startsWith(r + "/"));
const requiresAdmin = (p: string) =>
  ADMIN_REQUIRED_PREFIXES.some((r) => p === r || p.startsWith(r + "/"));

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ─── Bearer-authed API requests bypass middleware ─────────────────────
  // These come from the admin app proxy. The api-guard verifies the token.
  if (
    pathname.startsWith("/api/") &&
    request.headers.get("authorization")?.startsWith("Bearer ")
  ) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isPublic(pathname)) return response;

  if (requiresAuth(pathname) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(url);
  }

  if (user) {
    const rawRole = (user.app_metadata?.role as string | undefined) ?? "USER";
    const role = rawRole.length > 0 ? rawRole : "USER";

    if (requiresConsultant(pathname)) {
      const ok =
        role === "CLIENT_ADMIN" || role === "ADMIN" || role === "SUPER_ADMIN";
      if (!ok) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }
    }

    if (requiresAdmin(pathname)) {
      const ok =
        role === "ADMIN" || role === "SUPER_ADMIN" ||
        role === "SUPPORT" || role === "VIEWER";
      if (!ok) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
WEB_MW
ok "written"

# ─── 6. Type-check + Commit ───────────────────────────────────────────────────
h "6/6 — Verify + Commit"

info "Type-check web..."
TC_WEB=$(npm run type-check --workspace=web 2>&1 || true)
if echo "$TC_WEB" | grep -qE "error TS"; then
  warn "Web errors:"
  echo "$TC_WEB" | grep "error TS" | head -5
  ERRORS=$((ERRORS+1))
else
  ok "web passed"
fi

info "Type-check admin..."
TC_ADMIN=$(npm run type-check --workspace=admin 2>&1 || true)
if echo "$TC_ADMIN" | grep -qE "error TS"; then
  warn "Admin errors:"
  echo "$TC_ADMIN" | grep "error TS" | head -5
  ERRORS=$((ERRORS+1))
else
  ok "admin passed"
fi

# Prisma guard
HITS=$(grep -rn "prisma\." apps/web/app/api apps/web/lib apps/admin/app/api 2>/dev/null | grep -v _archive | grep -v ".d.ts" | head || true)
if [[ -z "$HITS" ]]; then
  ok "zero prisma.* in live paths"
else
  warn "prisma found: $HITS"
fi

info "Staging..."
git add -A
git reset -- "_archive/" 2>/dev/null || true

info "Committing..."
git commit -m "Vercel setup: split-domain web + admin with API proxy

- Cleanup: removed Netlify configs, vercel.json, scheduled functions
- apps/admin/next.config.js: rewrite /api/* → zeal-web-red.vercel.app
- apps/admin/middleware.ts: attach Authorization Bearer before proxy
- apps/web/lib/auth/api-guard.ts: accept Bearer OR cookie session
- apps/web/middleware.ts: short-circuit Bearer-authed API calls

Targets:
  Web:   zeal-web-red.vercel.app
  Admin: zeal-admin-rose.vercel.app" 2>&1 | tail -3

info "Pushing to origin/main..."
git push origin main 2>&1 | tail -8

# ─── Summary ──────────────────────────────────────────────────────────────────
echo ""
if [[ $ERRORS -eq 0 ]]; then
  echo -e "${GREEN}${BOLD}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}${BOLD}║  VERCEL SETUP COMPLETE — ALL CHECKS PASSED                     ║${NC}"
  echo -e "${GREEN}${BOLD}╚════════════════════════════════════════════════════════════════╝${NC}"
else
  echo -e "${YELLOW}${BOLD}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${YELLOW}${BOLD}║  DONE — ${ERRORS} check(s) need attention                            ║${NC}"
  echo -e "${YELLOW}${BOLD}╚════════════════════════════════════════════════════════════════╝${NC}"
fi

echo ""
echo -e "${RED}${BOLD}═══ VERCEL DASHBOARD STEPS ═══${NC}"
echo ""
echo -e "${BOLD}Project 1: zeal-web-red${NC}"
echo "  Root Directory      : apps/web"
echo "  Framework Preset    : Next.js (auto-detected)"
echo "  Build Command       : (leave default)"
echo "  Install Command     : (leave default)"
echo "  Node version        : 20.x"
echo ""
echo "  Env vars to add:"
echo "    NEXT_PUBLIC_SUPABASE_URL"
echo "    NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "    SUPABASE_SERVICE_ROLE_KEY"
echo "    NEXT_PUBLIC_APP_URL             = https://zeal-web-red.vercel.app"
echo "    NEXT_PUBLIC_SITE_URL            = https://zeal-web-red.vercel.app"
echo "    NEXT_PUBLIC_ADMIN_URL           = https://zeal-admin-rose.vercel.app"
echo "    NEXT_PUBLIC_REALTIME_ENABLED    = true"
echo "    GROQ_API_KEY"
echo "    UPSTASH_REDIS_REST_URL"
echo "    UPSTASH_REDIS_REST_TOKEN"
echo "    INSTAMOJO_API_KEY"
echo "    INSTAMOJO_AUTH_TOKEN"
echo "    INSTAMOJO_SALT"
echo "    RESEND_API_KEY"
echo "    CRON_SECRET"
echo ""
echo -e "${BOLD}Project 2: zeal-admin-rose${NC}"
echo "  Root Directory      : apps/admin"
echo "  Framework Preset    : Next.js"
echo "  Node version        : 20.x"
echo ""
echo "  Env vars to add:"
echo "    NEXT_PUBLIC_SUPABASE_URL        (same as web)"
echo "    NEXT_PUBLIC_SUPABASE_ANON_KEY   (same as web)"
echo "    SUPABASE_SERVICE_ROLE_KEY       (same as web)"
echo "    NEXT_PUBLIC_ADMIN_URL           = https://zeal-admin-rose.vercel.app"
echo "    NEXT_PUBLIC_APP_URL             = https://zeal-web-red.vercel.app"
echo "    NEXT_PUBLIC_SITE_URL            = https://zeal-web-red.vercel.app"
echo ""
echo -e "${BOLD}Supabase Dashboard (required for MFA):${NC}"
echo "  Authentication → Auth Hooks → Custom Access Token → public.custom_access_token_hook"
echo "  Authentication → Providers → MFA → TOTP ON"
echo ""
echo -e "${BOLD}Verify after deploy:${NC}"
echo "  curl -s https://zeal-web-red.vercel.app/api/health | jq"
echo "  curl -s https://zeal-admin-rose.vercel.app/api/health | jq"
echo ""
echo -e "${BOLD}Backups:${NC} ${ARCHIVE}"
echo ""

exit 0
