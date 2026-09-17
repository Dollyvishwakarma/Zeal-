// apps/web/app/api/auth/signout/route.ts
// Signs the current user out and clears session cookies
import { NextResponse } from "next/server";
import { createServerClientFromCookies } from "@zeal/database/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await createServerClientFromCookies();
  await supabase.auth.signOut();
  return NextResponse.json({ success: true });
}