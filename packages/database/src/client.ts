// packages/database/src/client.ts
// ═══════════════════════════════════════════════════════════════════════════════
// ZEAL — Client-safe database exports
// ═══════════════════════════════════════════════════════════════════════════════
// ⚠️  DO NOT import "next/headers" or any server-only module here.
//
// SSR SAFETY (per Supabase PR #20):
//   createBrowserClient works without window — it returns empty cookies for
//   non-auth namespaces. This allows Next.js prerender (e.g. /_not-found) to
//   safely instantiate the client during build. Auth calls during prerender
//   will fail at runtime, not at module load.
// ═══════════════════════════════════════════════════════════════════════════════

import { createBrowserClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@zeal/types";

export * from "@zeal/types";

// ─── Anon (public reads, browser-safe, works on server too) ──────────────────
export function createAnonClient(): any {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "build-dummy-key";
  return createSupabaseClient(url, key);
}

// ─── Browser Client (SSR-aware, session persisted) ───────────────────────────
let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function getBrowserClient(): any {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Graceful fallback when env vars are absent (build-time, CI, etc.)
  if (!url || !key) {
    if (typeof window === "undefined") {
      // Server-side prerender without env — return a stub client.
      // Avoids crashing the build while keeping all methods defined.
      return createSupabaseClient(
        "http://127.0.0.1:54321",
        "build-dummy-key"
      );
    }
    throw new Error(
      "[@zeal/database] Missing NEXT_PUBLIC_SUPABASE_URL / ANON_KEY"
    );
  }

  // createBrowserClient safely handles `window === undefined` (per supabase/ssr#20)
  browserClient = createBrowserClient<Database>(url, key);
  return browserClient;
}

// ─── createClient (universal — works during SSR/prerender too) ───────────────
// The client is created lazily. During SSR/prerender, cookies are empty and
// the client's non-auth namespaces remain functional.
//
// For server-side code that needs auth + service role, import from
// '@zeal/database/server' instead.
export function createClient(): any {
  return getBrowserClient();
}

// ─── Legacy Prisma shim (safe, no server imports) ────────────────────────────
export const prisma = new Proxy({}, {
  get: () => new Proxy({}, { get: () => () => Promise.resolve(null) }),
}) as any;

export const withTransaction = async <T>(cb: (tx: any) => Promise<T>): Promise<T> => cb(prisma);