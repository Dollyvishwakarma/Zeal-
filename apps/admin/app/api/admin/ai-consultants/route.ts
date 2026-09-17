import { NextResponse } from "next/server";
import { createAdminClient } from "@zeal/database/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("AIConsultant")
      .select("*")
      .order("isFeatured", { ascending: false })
      .order("rating", { ascending: false })
      .order("name", { ascending: true });

    if (error) throw new Error(error.message);

    return NextResponse.json(
      { items: data ?? [], total: (data ?? []).length },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("[Admin AI Consultants]", error);
    return NextResponse.json({ items: [], total: 0 }, { status: 500 });
  }
}
