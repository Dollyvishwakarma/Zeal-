import { NextResponse } from "next/server";
import { createServerClientFromCookies } from "@zeal/database/server";
import { getUserId } from "@/lib/auth";
import { withErrorHandler, AppError, ErrorCode } from "@/lib/errors";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(
  async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const userId = await getUserId();
    if (!userId) throw new AppError("Unauthorized", 401, ErrorCode.AUTH_UNAUTHORIZED);
    const { id } = await params;

    const supabase = await createServerClientFromCookies();

    // New unified chat: participants-based
    const { data: participant } = await supabase
      .from("ConversationParticipant")
      .select("conversationId, userId")
      .eq("conversationId", id)
      .eq("userId", userId)
      .maybeSingle();

    if (!participant) throw new AppError("Conversation not found", 404, ErrorCode.NOT_FOUND);

    const { data: partners } = await supabase
      .from("ConversationParticipant")
      .select("userId")
      .eq("conversationId", id)
      .neq("userId", userId)
      .limit(1);

    const partnerId = partners?.[0]?.userId ?? null;
    let otherUser = null;
    if (partnerId) {
      const { data: u } = await supabase
        .from("User")
        .select("id, name, username, avatar, role")
        .eq("id", partnerId)
        .maybeSingle();
      otherUser = u;
    }

    const { data: conversation } = await supabase
      .from("Conversation")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    return NextResponse.json({ conversation, otherUser });
  },
);
