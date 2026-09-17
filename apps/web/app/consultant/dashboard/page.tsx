// apps/web/app/consultant/dashboard/page.tsx
import { createServerClientFromCookies } from "@zeal/database/server";
import { redirect } from "next/navigation";
import { StudioClient } from "@/components/consultant/StudioClient";

export const dynamic = "force-dynamic";

export default async function ConsultantDashboardPage() {
  const supabase = await createServerClientFromCookies();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("User")
    .select("id, name, is_online")
    .eq("id", user.id)
    .maybeSingle();

  const { data: wallet } = await supabase
    .from("Wallet")
    .select("balance")
    .eq("userId", user.id)
    .maybeSingle();

  const userData = profile as { id: string; name: string | null; is_online: boolean } | null;
  const walletData = wallet as { balance: number } | null;

  return (
    <StudioClient
      initialProfile={{
        id: user.id,
        full_name: userData?.name ?? "Consultant",
        wallet_balance: walletData?.balance ?? 0,
        is_online: userData?.is_online ?? false,
      }}
    />
  );
}