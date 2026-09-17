import { NextResponse } from "next/server";
import { createAdminClient } from "@zeal/database/server";
import { withErrorHandler } from "@/lib/errors";
import { requireRole } from "@/lib/auth/rbac";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const GET = withErrorHandler(async () => {
  await requireRole("SUPPORT");
  const admin = createAdminClient();

  const { data: items, error } = await admin
    .from("AIConsultant")
    .select("*")
    .order("isFeatured", { ascending: false })
    .order("rating", { ascending: false })
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);

  return NextResponse.json({
    items: items ?? [],
    total: (items ?? []).length,
  }, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
});
