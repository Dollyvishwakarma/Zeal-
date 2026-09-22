"use server";

// ═══════════════════════════════════════════════════════════════════════════════
// ZEAL — Simple Auth Actions (no JWT complexity)
// ═══════════════════════════════════════════════════════════════════════════════

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { syncAuthUser } from "@/lib/auth/server";

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

// ─── LOGIN ──────────────────────────────────────────────────────────────────
export async function loginAction(formData: FormData): Promise<{
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
      return { success: false, error: "Invalid email or password." };
    }

    // Sync user record + wallet
    const sync = await syncAuthUser();
    if (!sync.ok) {
      return { success: false, error: sync.error || "Session sync failed." };
    }

    return { success: true, destination: sync.redirectTo };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Login failed.",
    };
  }
}

// ─── REGISTER ───────────────────────────────────────────────────────────────
export async function registerAction(formData: FormData): Promise<{
  success: boolean;
  destination?: string;
  error?: string;
}> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;
  const fullName = (formData.get("fullName") as string)?.trim();
  const accountType =
    (formData.get("accountType") as string) || "user";

  if (!email || !password || !fullName) {
    return { success: false, error: "All fields are required." };
  }

  if (password.length < 8) {
    return {
      success: false,
      error: "Password must be at least 8 characters.",
    };
  }

  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });

    if (error || !data.user) {
      return {
        success: false,
        error: error?.message || "Registration failed.",
      };
    }

    // Sync user + wallet
    const sync = await syncAuthUser();

    // Route consultants to /apply, users to explore
    const destination =
      accountType === "consultant" ? "/apply" : sync.redirectTo;

    return { success: true, destination };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Registration failed.",
    };
  }
}

// ─── SIGN OUT ──────────────44
// ─────────────────────────────────────────────────
export async function signOutAction() {
  const supabase = await getSupabase();
  await supabase.auth.signOut();
  redirect("/login");
}