"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {}
        },
      },
    }
  );
}

export async function getExploreFeed() {
  const supabase = await getSupabase();
  
  // Fetch approved consultants
  const { data: consultants, error: consultantError } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, cover_url, role, is_online")
    .eq("role", "consultant");

  // Fetch consultant discovery posts
  const { data: posts, error: postError } = await supabase
    .from("consultant_posts")
    .select("id, content, image_url, created_at, consultant_id, profiles(full_name, avatar_url)")
    .order("created_at", { ascending: false })
    .limit(20);

  return {
    consultants: consultants || [],
    posts: posts || [],
    error: consultantError?.message || postError?.message || null
  };
}

export async function getConsultantDetails(consultantId: string) {
  const supabase = await getSupabase();
  
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", consultantId)
    .single();

  const { data: posts } = await supabase
    .from("consultant_posts")
    .select("*")
    .eq("consultant_id", consultantId)
    .order("created_at", { ascending: false });

  return {
    profile: profile || null,
    posts: posts || [],
    error: error?.message || null
  };
}

export async function requestConsultationSession(consultantId: string) {
  try {
    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Authentication required to request a session." };

    if (user.id === consultantId) {
      return { success: false, error: "You cannot request a session with yourself." };
    }

    const { data, error } = await supabase
      .from("session_requests")
      .insert({
        seeker_id: user.id,
        consultant_id: consultantId,
        status: "ringing"
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, sessionId: data.id };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to initiate session." };
  }
}
