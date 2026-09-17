"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

async function getConsultantSupabase() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "consultant" && !["admin", "superadmin", "super_admin"].includes(profile?.role || "")) {
    throw new Error("Privilege Escalation Blocked");
  }

  return { supabase, user };
}

export async function toggleOnlineStatus(currentStatus: boolean) {
  try {
    const { supabase, user } = await getConsultantSupabase();

    const { error } = await supabase
      .from("profiles")
      .update({ is_online: !currentStatus })
      .eq("id", user.id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/consultant/dashboard");
    revalidatePath("/explore"); // Updates the public directory
    return { success: true, is_online: !currentStatus };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
