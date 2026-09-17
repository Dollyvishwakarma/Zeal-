// apps/web/app/session/[id]/page.tsx
// ═══════════════════════════════════════════════════════════════════════════════
// Legacy route — redirects to /chat/[id] (unified chat)
// ═══════════════════════════════════════════════════════════════════════════════

import { redirect } from "next/navigation";

export default async function SessionRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/chat/${id}`);
}