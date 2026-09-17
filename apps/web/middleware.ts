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
