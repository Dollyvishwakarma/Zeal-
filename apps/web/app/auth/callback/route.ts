import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { syncAuthUser } from "@/lib/auth/server";

export async function GET(request: Request) {
  const { searchParams, origin: requestOrigin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/explore";
  const intent = searchParams.get("intent") ?? "user";

  const origin = process.env.NEXT_PUBLIC_SITE_URL
    ? process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")
    : requestOrigin;

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=MissingCode`);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch { /* RSC — safe */ }
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=OAuthFailed`);
  }

  const sync = await syncAuthUser();

  if (intent === "consultant" && sync.role === "USER") {
    return NextResponse.redirect(`${origin}/apply`);
  }
  if (
    sync.role === "SUPER_ADMIN" || sync.role === "ADMIN" ||
    sync.role === "SUPPORT" || sync.role === "VIEWER"
  ) {
    return NextResponse.redirect(`${origin}/admin`);
  }
  if (sync.role === "CLIENT_ADMIN") {
    return NextResponse.redirect(`${origin}/consultant/dashboard`);
  }

  const safeNext =
    next !== "/" && next !== "/login" && next !== "/auth/login" ? next : "/explore";
  return NextResponse.redirect(`${origin}${safeNext}`);
}
