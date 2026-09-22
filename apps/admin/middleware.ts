// apps/admin/middleware.ts
// ═══════════════════════════════════════════════════════════════════════════════
// ZEAL ADMIN — Simple Middleware (DB-based role check, no JWT)
// ═══════════════════════════════════════════════════════════════════════════════

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_ROUTES = ["/login", "/not-found"];
const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN", "SUPPORT", "VIEWER"];

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

  // ─── Public routes: allow ─────────────────────────────────────────────────
  if (PUBLIC_ROUTES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return response;
  }

  // ─── Not logged in → login ────────────────────────────────────────────────
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(url);
  }

  // ─── Role check from DB (no JWT) ──────────────────────────────────────────
  const { data: profile } = await supabase
    .from("User")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = (profile as { role?: string } | null)?.role || "USER";

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
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};