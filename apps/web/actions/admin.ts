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

export async function getAdminMetrics() {
  try {
    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { userCount: 0, pendingAppsCount: 0, applications: [], auditLogs: [], error: "Unauthorized" };

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (!profile || !['admin', 'superadmin', 'super_admin'].includes(profile.role)) {
      return { userCount: 0, pendingAppsCount: 0, applications: [], auditLogs: [], error: "Forbidden access" };
    }

    const { count: userCount } = await supabase.from("profiles").select("*", { count: "exact", head: true });
    const { count: pendingAppsCount } = await supabase.from("consultant_applications").select("*", { count: "exact", head: true }).eq("status", "pending");
    const { data: applications } = await supabase.from("consultant_applications").select("*").order("created_at", { ascending: false });
    const { data: auditLogs } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(20);

    return {
      userCount: userCount || 0,
      pendingAppsCount: pendingAppsCount || 0,
      applications: applications || [],
      auditLogs: auditLogs || [],
      error: null
    };
  } catch (err: any) {
    return { userCount: 0, pendingAppsCount: 0, applications: [], auditLogs: [], error: err.message || "Failed to load metrics." };
  }
}

// Alias export for ApplicationReviewBoard compatibility
export async function processApplicationAction(applicationId: string, userId: string, approve: boolean) {
  return reviewConsultantApplication(applicationId, userId, approve);
}

export async function reviewConsultantApplication(applicationId: string, userId: string, approve: boolean) {
  try {
    const supabase = await getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const newStatus = approve ? "approved" : "rejected";

    const { error: appError } = await supabase
      .from("consultant_applications")
      .update({ status: newStatus })
      .eq("id", applicationId);

    if (appError) return { success: false, error: appError.message };

    if (approve) {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ role: "consultant" })
        .eq("id", userId);

      if (profileError) return { success: false, error: profileError.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Review action failed." };
  }
}
