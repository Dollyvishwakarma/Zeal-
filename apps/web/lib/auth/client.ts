// apps/web/lib/auth/client.ts
// ═══════════════════════════════════════════════════════════════════════════════
// Server-side session helpers
// ═══════════════════════════════════════════════════════════════════════════════

import { createServerClientFromCookies } from "@zeal/database/server";

export async function getClientSession(): Promise<{
  user: any | null;
  session: any | null;
}> {
  const supabase = await createServerClientFromCookies();
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error("Error getting session:", error);
    return { user: null, session: null };
  }
  return { user: data.session?.user ?? null, session: data.session ?? null };
}

export async function signOutClient(): Promise<void> {
  const supabase = await createServerClientFromCookies();
  await supabase.auth.signOut();
}
