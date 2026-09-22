"use server";

// ═══════════════════════════════════════════════════════════════════════════════
// ZEAL ADMIN — Simple Auth Actions (no JWT, no audit complexity)
// ═══════════════════════════════════════════════════════════════════════════════

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN", "SUPPORT", "VIEWER"];

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            /* RSC safe */
          }
        },
      },
    }
  );
}

// ─── ADMIN LOGIN ────────────────────────────────────────────────────────────
export async function adminLoginAction(formData: FormData): Promise<{
  success: boolean;
  destination?: string;
  error?: string;
}> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { success: false, error: "Email and password required." };
  }

  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      return { success: false, error: "Invalid credentials." };
    }

    // Check role from DB (no JWT parsing)
    const { data: profile } = await supabase
      .from("User")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle();

    const role = (profile as { role?: string } | null)?.role || "USER";

    if (!ADMIN_ROLES.includes(role)) {
      await supabase.auth.signOut();
      return { success: false, error: "Unauthorized. Admin access only." };
    }

    return { success: true, destination: "/" };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Login failed.",
    };
  }
}

// ─── ADMIN SIGN OUT ─────────────────────────────────────────────────────────
export async function adminSignOutAction() {
  const supabase = await getSupabase();
  await supabase.auth.signOut();
  redirect("/login");
}