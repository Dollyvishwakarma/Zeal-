// apps/web/app/chat/layout.tsx
// ═══════════════════════════════════════════════════════════════════════════════
// Chat layout — server component
// Fetches conversations via typed helper; hands off to ChatShell
// ═══════════════════════════════════════════════════════════════════════════════

import { redirect } from "next/navigation";
import { createServerClientFromCookies } from "@zeal/database/server";
import { ChatShell } from "./ChatShell";
import { fetchUserConversations } from "@/lib/chat/fetch-conversations";

export const dynamic = "force-dynamic";

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerClientFromCookies();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectedFrom=/chat");

  const conversations = await fetchUserConversations(user.id);

  return (
    <ChatShell
      currentUserId={user.id}
      initialConversations={conversations}
    >
      {children}
    </ChatShell>
  );
}