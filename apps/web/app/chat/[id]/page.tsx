// apps/web/app/chat/[id]/page.tsx
import { createServerClientFromCookies } from "@zeal/database/server";
import { redirect, notFound } from "next/navigation";
import { ChatInterface } from "@/components/session/ChatInterface";

export const dynamic = "force-dynamic";

interface PartnerRow {
  userId: string;
}

interface UserRow {
  name: string | null;
  username: string;
  avatar: string | null;
  role: string;
}

export default async function ChatRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: conversationId } = await params;
  const supabase = await createServerClientFromCookies();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirectedFrom=/chat/${conversationId}`);

  // Verify participation
  const { data: participant } = await supabase
    .from("ConversationParticipant")
    .select("userId")
    .eq("conversationId", conversationId)
    .eq("userId", user.id)
    .maybeSingle();

  if (!participant) notFound();

  // Find the partner participant
  const { data: partnerRaw } = await supabase
    .from("ConversationParticipant")
    .select("userId")
    .eq("conversationId", conversationId)
    .neq("userId", user.id)
    .limit(1);

  const partnerArr = (partnerRaw ?? []) as PartnerRow[];
  const partnerId = partnerArr[0]?.userId ?? "";

  let partnerName = "Chat";
  let partnerAvatar: string | null = null;
  let isAI = false;

  if (partnerId) {
    const { data: partnerUserRaw } = await supabase
      .from("User")
      .select("name, username, avatar, role")
      .eq("id", partnerId)
      .maybeSingle();

    const partnerUser = partnerUserRaw as UserRow | null;

    if (partnerUser) {
      partnerName = partnerUser.name || partnerUser.username || "Chat";
      partnerAvatar = partnerUser.avatar ?? null;
      isAI = partnerUser.role === "AI";
    }
  }

  return (
    <ChatInterface
      conversationId={conversationId}
      currentUserId={user.id}
      partnerId={partnerId}
      partnerName={partnerName}
      partnerAvatar={partnerAvatar}
      isAI={isAI}
    />
  );
}