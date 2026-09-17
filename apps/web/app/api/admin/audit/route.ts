import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { withErrorHandler, AppError, ErrorCode } from "@/lib/errors";
import { requireRole } from "@/lib/auth/rbac";

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new AppError("Supabase not configured", 500, ErrorCode.CONFIG_ERROR);
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const GET = withErrorHandler(async (req: Request) => {
  await requireRole("SUPER_ADMIN");

  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "100"), 500);

  const sb = getAdmin();
  let q = sb.from("AdminAuditLog").select("*").order("createdAt", { ascending: false }).limit(limit);
  if (action) q = q.eq("action", action);

  const { data, error } = await q;
  if (error) throw new AppError(error.message, 500, ErrorCode.INTERNAL_SERVER);
  return NextResponse.json({ items: data ?? [] });
});

