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
