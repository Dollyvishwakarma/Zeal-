import { NextResponse } from "next/server";
import { createServerClientFromCookies } from "@zeal/database/server";
import { getUserId } from "@/lib/auth";
import { withErrorHandler, AppError, ErrorCode } from "@/lib/errors";

export const dynamic = "force-dynamic";

export const POST = withErrorHandler(
  async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const me = await getUserId();
    if (!me) throw new AppError("Unauthorized", 401, ErrorCode.AUTH_UNAUTHORIZED);
    const { id: targetId } = await params;
    if (targetId === me) throw new AppError("Cannot block yourself", 400, ErrorCode.VALIDATION_INPUT);

    const supabase = await createServerClientFromCookies();

    const { data: existing } = await supabase
      .from("UserActivity")
      .select("id")
      .eq("userId", me)
      .eq("consultantId", targetId)
      .eq("type", "block")
      .maybeSingle();

    if (!existing) {
      await supabase.from("UserActivity").insert({
        userId: me, consultantId: targetId, type: "block",
      });
    }

    return NextResponse.json({ blocked: true });
  },
);

export const DELETE = withErrorHandler(
  async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const me = await getUserId();
    if (!me) throw new AppError("Unauthorized", 401, ErrorCode.AUTH_UNAUTHORIZED);
    const { id: targetId } = await params;

    const supabase = await createServerClientFromCookies();
    await supabase.from("UserActivity")
      .delete()
      .eq("userId", me)
      .eq("consultantId", targetId)
      .eq("type", "block");

    return NextResponse.json({ blocked: false });
  },
);
