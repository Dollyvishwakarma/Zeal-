"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
  );
}

export async function initiateSessionAction(consultantId: string) {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const { data: consultant } = await supabase
    .from("profiles")
    .select("is_ai, is_online")
    .eq("id", consultantId)
    .single();

  if (!consultant?.is_online) {
    return { success: false, error: "Consultant is currently offline." };
  }

  const initialStatus = consultant.is_ai ? "active" : "ringing";

  const { data: session, error } = await supabase
    .from("session_requests")
    .insert({
      seeker_id: user.id,
      consultant_id: consultantId,
      status: initialStatus
    })
    .select("id, status")
    .single();

  if (error || !session) return { success: false, error: "Failed to signal consultant." };

  return { success: true, sessionId: session.id, status: session.status };
}

export async function respondToSessionAction(sessionId: string, status: 'active' | 'declined') {
  const supabase = await getSupabase();
  const { error } = await supabase
    .from("session_requests")
    .update({ status })
    .eq("id", sessionId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
