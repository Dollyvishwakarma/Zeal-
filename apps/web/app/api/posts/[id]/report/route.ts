import { NextResponse } from "next/server";
import { createServerClientFromCookies } from "@zeal/database/server";
import { getUserId } from "@/lib/auth";
import { withErrorHandler, AppError, ErrorCode } from "@/lib/errors";
import { z } from "zod";

export const dynamic = "force-dynamic";

const ReportSchema = z.object({
  reason: z.enum(["spam", "harassment", "misinformation", "inappropriate", "other"]),
  note: z.string().max(500).optional(),
});

export const POST = withErrorHandler(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const userId = await getUserId();
    if (!userId) throw new AppError("Unauthorized", 401, ErrorCode.AUTH_UNAUTHORIZED);
    const { id: postId } = await params;

    const body = await req.json();
    const { reason, note } = ReportSchema.parse(body);

    const supabase = await createServerClientFromCookies();

    const { data: post } = await supabase
      .from("Post").select("id").eq("id", postId).maybeSingle();
    if (!post) throw new AppError("Post not found", 404, ErrorCode.NOT_FOUND);

    await supabase.from("Post").update({ isFlagged: true }).eq("id", postId);

    // Best-effort audit entry
    try {
      await supabase.from("Notification").insert({
        userId,
        type: "system",
        message: `[REPORT] Post ${postId}: ${reason}${note ? " — " + note : ""}`,
        actorId: userId,
        read: true,
      });
    } catch { /* ignore */ }

    return NextResponse.json({ success: true });
  },
);
