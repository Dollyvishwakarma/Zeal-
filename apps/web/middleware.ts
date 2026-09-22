// apps/web/middleware.ts
// ═══════════════════════════════════════════════════════════════════════════════
// ZEAL WEB — Simple Middleware (DB-based role check, no JWT)
// ═══════════════════════════════════════════════════════════════════════════════

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_ROUTES = [
  "/",
  "/explore",
  "/services",
  "/ai-astrologers",
  "/consultant",
  "/login",
  "/register",
  "/auth/callback",
  "/payment",
];

const USER_ONLY = [
  "/chat",
  "/wallet",
  "/bookings",
  "/booking",
  "/profile",
  "/notifications",
  "/sparks",
  "/create",
];

const CONSULTANT_ONLY = [
  "/consultant/dashboard",
  "/consultant/bookings",
  "/consultant/clients",
  "/consultant/earnings",
  "/consultant/availability",
  "/consultant/settings",
  "/consultant/onboarding",
];

const ADMIN_ONLY = ["/admin"];

const isPublic = (p: string) =>
  p === "/" || PUBLIC_ROUTES.some((r) => p === r || p.startsWith(r + "/"));

const matches = (p: string, prefixes: string[]) =>
  prefixes.some((r) => p === r || p.startsWith(r + "/"));

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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

  // ─── Public routes: always allow ──────────────────────────────────────────
  if (isPublic(pathname)) return response;

  // ─── Not logged in: redirect to login ─────────────────────────────────────
  const needsAuth =
    matches(pathname, USER_ONLY) ||
    matches(pathname, CONSULTANT_ONLY) ||
    matches(pathname, ADMIN_ONLY);

  if (!user && needsAuth) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(url);
  }

  // ─── Role-based checks (DB query, no JWT parsing) ─────────────────────────
  if (user) {
    const { data: profile } = await supabase
      .from("User")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const role = (profile as { role?: string } | null)?.role || "USER";

    const isAdmin = ["SUPER_ADMIN", "ADMIN"].includes(role);
    const isConsultant = ["CLIENT_ADMIN", "SUPPORT"].includes(role);

    // Admin routes: only admins
    if (matches(pathname, ADMIN_ONLY) && !isAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = "/explore";
      return NextResponse.redirect(url);
    }

    // Consultant routes: consultants + admins
    if (matches(pathname, CONSULTANT_ONLY) && !isConsultant && !isAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = "/explore";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};