import { NextResponse } from "next/server";
import { createAdminClient } from "@zeal/database/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");

  try {
    const admin = createAdminClient();
    let query = admin
      .from("AIConsultant")
      .select("*")
      .eq("isActive", true)
      .order("isFeatured", { ascending: false })
      .order("rating", { ascending: false })
      .order("name", { ascending: true });

    if (category) query = query.eq("category", category);

    const { data, error } = await query;

    if (error) {
      console.error("[AI Consultants API] Supabase error:", error);
      return NextResponse.json([], {
        headers: { "Cache-Control": "no-store, max-age=0" },
      });
    }

    return NextResponse.json(data ?? [], {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (err) {
    console.error("[AI Consultants API] failed:", err);
    return NextResponse.json([], {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  }
}
