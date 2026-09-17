"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Standard UUID validation regex to prevent database crashes
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getPublicSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {}, // Read-only client
      },
    }
  );
}

export async function getConsultantPublicProfile(id: string) {
  try {
    if (!UUID_REGEX.test(id)) {
      return { success: false, error: "Invalid profile identifier." };
    }

    const supabase = await getPublicSupabase();

    // Fetch the profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, cover_url, is_ai, is_online, role")
      .eq("id", id)
      .single();

    if (profileError || !profile || profile.role !== "consultant") {
      return { success: false, error: "Consultant not found or inactive." };
    }

    // Fetch their public grid posts
    const { data: posts, error: postsError } = await supabase
      .from("consultant_posts")
      .select("id, image_url, content, created_at")
      .eq("consultant_id", id)
      .order("created_at", { ascending: false });

    if (postsError) throw postsError;

    return { 
      success: true, 
      profile, 
      posts: posts || [] 
    };
  } catch (err: any) {
    console.error("[PUBLIC_API_ERROR]:", err.message);
    return { success: false, error: "An unexpected error occurred while fetching the profile." };
  }
}
