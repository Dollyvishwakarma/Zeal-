import { NextResponse } from "next/server";
import { createServerClientFromCookies } from "@zeal/database/server";
import { withErrorHandler } from "@/lib/errors";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async () => {
  const supabase = await createServerClientFromCookies();
  const { data: consultants } = await supabase
    .from("Consultant")
    .select("category")
    .eq("status", "VERIFIED")
    .eq("isActive", true);

  // Group in JS — Supabase has no groupBy
  const counts = new Map<string, number>();
  for (const c of consultants ?? []) {
    const cat = (c as { category: string }).category;
    counts.set(cat, (counts.get(cat) ?? 0) + 1);
  }

  const items = Array.from(counts.entries())
    .map(([category, count]) => ({
      id: category.toLowerCase(),
      label: category.replace(/_/g, " ").toLowerCase(),
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return NextResponse.json(items);
});
