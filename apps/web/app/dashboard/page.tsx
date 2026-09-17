import { createClient } from "@zeal/database/server";
import { redirect } from "next/navigation";

export default async function AuthSortingHat() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  // Fetch complete profile record
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, onboarding_completed")
    .eq("id", user.id)
    .single();

  const role = profile?.role || user.user_metadata?.role || "user";
  const isOnboarded = profile?.onboarding_completed || false;

  // 1. Strict Admin Routing
  if (role === "admin" || role === "super_admin") {
    redirect("/admin/dashboard");
  }

  // 2. Strict Consultant Routing & Onboarding Trap
  if (role === "consultant") {
    if (!isOnboarded) {
      redirect("/onboarding/partner");
    } else {
      redirect("/consultant/dashboard");
    }
  }

  // 3. Strict User Routing (To Website Root / Profile)
  redirect("/");
}
