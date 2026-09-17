import { NextResponse } from "next/server";
import { createClient } from "@zeal/database/server";

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const limit = parseInt(searchParams.get("limit") || "20");

    let query = supabase
      .from("Consultant")
      .select(`
        id, category, specialties, languages, bio, perMinuteRate, rating, totalConsultations,
        user:User!userId(name, avatar, username)
      `)
      .eq("status", "VERIFIED")
      .eq("isActive", true)
      .order("rating", { ascending: false })
      .limit(limit);

    if (category) {
      query = query.eq("category", category);
    }

    const { data: consultants, error } = await query;

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, consultants });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
