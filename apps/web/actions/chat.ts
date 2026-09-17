"use server";

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

async function getUserSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
  );
}

const getAdminSupabase = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function sendMessageAction(sessionId: string, content: string) {
  const supabase = await getUserSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const { error } = await supabase
    .from("session_messages")
    .insert({ session_id: sessionId, sender_id: user.id, content });

  if (error) return { success: false, error: error.message };

  // Only trigger AI Inference if it's a standard text message (not WebRTC signaling)
  if (!content.startsWith("[WEBRTC_")) {
    const { data: session } = await supabase
      .from("session_requests")
      .select("consultant_id, profiles!session_requests_consultant_id_fkey(is_ai, system_prompt)")
      .eq("id", sessionId)
      .single();

    // TS FIX: Supabase joins return arrays. We securely extract the first item or use the object.
    const profileData = Array.isArray(session?.profiles) ? session.profiles[0] : session?.profiles;

    if (profileData?.is_ai) {
      triggerAIInference(sessionId, session!.consultant_id, content, profileData.system_prompt || "");
    }
  }

  return { success: true };
}

async function triggerAIInference(sessionId: string, aiId: string, userMessage: string, prompt: string) {
  try {
    const adminSupabase = getAdminSupabase();
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1500));

    let aiResponse = "I am sensing a strong energy shift. Tell me more about what you are feeling.";
    if (prompt?.toLowerCase().includes("vedic")) {
      aiResponse = "The planetary alignments indicate a period of transition. How can I guide you further?";
    } else if (prompt?.toLowerCase().includes("tarot")) {
      aiResponse = "I have pulled the High Priestess. Trust your intuition right now. What feels blocked?";
    }

    await adminSupabase.from("session_messages").insert({
      session_id: sessionId,
      sender_id: aiId,
      content: aiResponse
    });
  } catch (error) {
    console.error("AI Inference Failed:", error);
  }
}
