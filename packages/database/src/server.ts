// packages/database/src/server.ts
// ═══════════════════════════════════════════════════════════════════════════════
// ZEAL — Server-only database exports
// ═══════════════════════════════════════════════════════════════════════════════
// Import path: '@zeal/database/server'
// This file uses "server-only" to guarantee it never lands in a client bundle.
// ═══════════════════════════════════════════════════════════════════════════════

import "server-only";
import { cookies } from "next/headers";
import { createServerClient as createSSRServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@zeal/types";

// Re-export client-safe helpers so server code has a single import path
export {
  createAnonClient,
  getBrowserClient,
  prisma,
  withTransaction,
} from "./client";
export * from "@zeal/types";

// ─── Admin (service role) ────────────────────────────────────────────────────
export function createAdminClient(): any {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "build-dummy-service-key";
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const getAdminClient = (): any => createAdminClient();

// ─── Server Client from Cookies ──────────────────────────────────────────────
export const createServerClientFromCookies = async (): Promise<any> => {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "build-dummy-key";

  return createSSRServerClient<Database>(url, key, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch { /* RSC context — safe to ignore */ }
      },
    },
  });
};

// ─── createClient (async on the server) ──────────────────────────────────────
export const createClient = async (): Promise<any> => {
  return createServerClientFromCookies();
};

// ─── Auth helpers ────────────────────────────────────────────────────────────
export const getUserId = async (): Promise<string | null> => {
  try {
    const supabase = await createServerClientFromCookies();
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch { return null; }
};

export const getActorRole = async (): Promise<string | null> => {
  try {
    const supabase = await createServerClientFromCookies();
    const { data: { user } } = await supabase.auth.getUser();
    return (user?.app_metadata?.role as string) ?? null;
  } catch { return null; }
};