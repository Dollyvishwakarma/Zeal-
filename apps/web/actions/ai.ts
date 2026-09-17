"use server";

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

// Initialize the Admin Client using the Service Role Key
const getAdminSupabase = () => {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY in environment variables.");
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
};

export async function spawnAIPersonaAction(formData: FormData) {
  try {
    // 1. Authenticate the Administrator
    const cookieStore = await cookies();
    const userClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
    );

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return { success: false, error: "Unauthorized request." };

    const { data: adminProfile } = await userClient.from("profiles").select("role").eq("id", user.id).single();
    if (!["admin", "superadmin", "super_admin"].includes(adminProfile?.role || "")) {
      return { success: false, error: "Insufficient privileges to spawn AI." };
    }

    // 2. Extract AI Data
    const name = formData.get("name") as string;
    const expertise = formData.get("expertise") as string;
    const avatarUrl = formData.get("avatarUrl") as string;
    const systemPrompt = formData.get("systemPrompt") as string;
    
    // Generate a unique internal email and secure random password for the bot
    const botEmail = `ai_persona_${Date.now()}@system.zeal.local`;
    const botPassword = Array(32).fill("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&*").map(x => x[Math.floor(Math.random() * x.length)]).join('');

    const adminClient = getAdminSupabase();

    // 3. Create the User via Admin Auth API (Bypasses email verification)
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: botEmail,
      password: botPassword,
      email_confirm: true,
      user_metadata: { is_ai: true }
    });

    if (createError) throw createError;

    // 4. Wait for the database trigger to create the profile, then update it
    // Adding a slight delay ensures the PostgreSQL trigger finishes its work
    await new Promise(resolve => setTimeout(resolve, 1000));

    const { error: profileError } = await adminClient
      .from("profiles")
      .update({
        full_name: name,
        role: "consultant",
        is_ai: true,
        avatar_url: avatarUrl || null,
        system_prompt: systemPrompt,
        onboarding_completed: true,
        is_online: true // AI is always online
      })
      .eq("id", newUser.user.id);

    if (profileError) throw profileError;

    // 5. Inject a welcome post into their Instagram-style grid
    await adminClient.from("consultant_posts").insert({
      consultant_id: newUser.user.id,
      content: `Greetings seekers. I am ${name}, a manifestation of digital wisdom focusing on ${expertise}. My mind is online and I am ready to guide you.`
    });

    revalidatePath("/admin/dashboard");
    revalidatePath("/explore");
    return { success: true, aiId: newUser.user.id };

  } catch (err: any) {
    console.error("[AI_SPAWN_ERROR]:", err.message);
    return { success: false, error: err.message || "Failed to deploy AI Persona." };
  }
}
