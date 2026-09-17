// apps/web/app/api/auth/sync-user/route.ts
// Sync Supabase auth user → User table + Wallet
// Delegates to syncAuthUser() — single source of truth.

import { NextResponse } from "next/server";
import { syncAuthUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const result = await syncAuthUser();
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Sync failed" }, { status: 401 });
  }
  return NextResponse.json({
    success: true,
    role: result.role,
    isNew: result.isNew,
    redirectTo: result.redirectTo,
  });
}
