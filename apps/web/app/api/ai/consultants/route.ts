// apps/web/app/api/consultants/route.ts
// ═══════════════════════════════════════════════════════════════════════════════
// ZEAL — Unified Consultants API (Real + AI)
// ═══════════════════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { createAdminClient } from "@zeal/database/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const category = url.searchParams.get("category");
    const type = url.searchParams.get("type") || "all"; // all | human | ai
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "40"), 100);

    const admin = createAdminClient();
    const results: any[] = [];

    // ─── Fetch Real Consultants ─────────────────────────────────────────────
    if (type === "all" || type === "human") {
      let q = admin
        .from("Consultant")
        .select(`
          id,
          category,
          specialties,
          languages,
          bio,
          "perMinuteRate",
          "chatRate",
          "physicalRate",
          rating,
          "totalConsultations",
          "sparkScore",
          "isVerified",
          "isActive",
          status,
          user:User!Consultant_userId_fkey(id, name, username, avatar, is_online)
        `)
        .eq("status", "VERIFIED")
        .eq("isActive", true)
        .order("sparkScore", { ascending: false })
        .limit(limit);

      if (category) q = q.eq("category", category);

      const { data, error } = await q;
      if (error) console.warn("[consultants] human fetch error:", error.message);

      for (const c of data ?? []) {
        const u = (c as any).user;
        const user = Array.isArray(u) ? u[0] : u;
        if (!user) continue;

        results.push({
          id: c.id,
          type: "human",
          name: user.name || user.username || "Consultant",
          username: user.username,
          avatar: user.avatar,
          category: c.category,
          bio: c.bio,
          specialties: c.specialties ?? [],
          languages: c.languages ?? [],
          perMinuteRate: c.perMinuteRate ?? 50,
          chatRate: (c as any).chatRate ?? c.perMinuteRate ?? 50,
          physicalRate: (c as any).physicalRate ?? c.perMinuteRate ?? 100,
          rating: c.rating ?? 0,
          totalConsultations: c.totalConsultations ?? 0,
          sparkScore: (c as any).sparkScore ?? 0,
          isOnline: user.is_online ?? false,
          isVerified: c.isVerified ?? false,
        });
      }
    }

    // ─── Fetch AI Consultants ───────────────────────────────────────────────
    if (type === "all" || type === "ai") {
      let q = admin
        .from("AIConsultant")
        .select(`
          id, name, username, avatar, category, bio,
          specialties, languages, rating, "totalConsultations",
          sparks, "isPaid", "perMinuteRate", "isFeatured", model
        `)
        .eq("isActive", true)
        .order("isFeatured", { ascending: false })
        .order("rating", { ascending: false })
        .limit(limit);

      if (category) q = q.eq("category", category);

      const { data, error } = await q;
      if (error) console.warn("[consultants] ai fetch error:", error.message);

      for (const c of data ?? []) {
        results.push({
          id: c.id,
          type: "ai",
          name: c.name,
          username: c.username,
          avatar: c.avatar,
          category: c.category,
          bio: c.bio,
          specialties: c.specialties ?? [],
          languages: c.languages ?? [],
          perMinuteRate: c.perMinuteRate ?? 0,
          chatRate: c.perMinuteRate ?? 0,
          physicalRate: 0,
          rating: c.rating ?? 4.7,
          totalConsultations: c.totalConsultations ?? 0,
          sparkScore: c.sparks ?? 0,
          isOnline: true, // AI always online
          isVerified: true,
          isFeatured: c.isFeatured ?? false,
          model: c.model,
        });
      }
    }

    // ─── Sort: featured first, then by sparkScore ───────────────────────────
    results.sort((a, b) => {
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;
      return (b.sparkScore ?? 0) - (a.sparkScore ?? 0);
    });

    return NextResponse.json(
      { items: results, total: results.length, type },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    console.error("[consultants] fatal error:", error);
    return NextResponse.json(
      { items: [], total: 0, error: "Failed to fetch consultants" },
      { status: 500 }
    );
  }
}