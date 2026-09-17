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
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch { /* RSC — safe */ }
        },
      },
    }
  );
}

const CATEGORY_MAP: Record<string, string> = {
  "Vedic Astrology": "ASTROLOGER",
  "Tarot Reading": "TAROT",
  "Numerology": "NUMEROLOGIST",
  "Vastu Shastra": "VASTU",
};

export async function checkApplicationStatus() {
  try {
    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { status: null };
    const { data } = await supabase
      .from("Consultant").select("status").eq("userId", user.id).maybeSingle();
    return { status: data?.status?.toLowerCase() ?? null };
  } catch {
    return { status: null };
  }
}

export async function submitConsultantApplication(formData: FormData) {
  try {
    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized session." };

    const expertise = (formData.get("expertise") as string) || "Vedic Astrology";
    const bio = ((formData.get("bio") as string) || "").trim();

    if (bio.length < 20) {
      return { success: false, error: "Bio must be at least 20 characters." };
    }

    const category = CATEGORY_MAP[expertise] ?? "ASTROLOGER";

    const { error } = await supabase
      .from("Consultant")
      .upsert(
        {
          userId: user.id,
          category,
          specialties: [expertise],
          languages: ["English"],
          bio,
          perMinuteRate: 50,
          availability: {},
          status: "PENDING",
          bufferMinutes: 10,
        },
        { onConflict: "userId" }
      );

    if (error) {
      console.error("[consultant/submit] upsert failed:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error("[consultant/submit] unexpected:", err);
    return { success: false, error: err.message || "Internal error." };
  }
}
