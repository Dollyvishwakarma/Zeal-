// apps/web/app/api/users/me/profile/route.ts
// Returns the current user's profile + wallet (used by /wallet page)
import { NextResponse } from "next/server";
import { createServerClientFromCookies } from "@zeal/database/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createServerClientFromCookies();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [profileRes, walletRes] = await Promise.all([
    supabase
      .from("User")
      .select("id, email, username, name, avatar, role, sparks, is_online")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("Wallet")
      .select("id, balance, escrow, pendingIn, pendingOut, blocked")
      .eq("userId", user.id)
      .maybeSingle(),
  ]);

  return NextResponse.json({
    user: profileRes.data ?? { id: user.id, email: user.email },
    wallet: walletRes.data ?? { balance: 0 },
  });
}