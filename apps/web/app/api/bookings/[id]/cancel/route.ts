import { NextResponse } from "next/server";
import { createServerClientFromCookies, getUserId } from "@zeal/database/server";
import { withErrorHandler, AppError, ErrorCode } from "@/lib/errors";

export const dynamic = "force-dynamic";

export const POST = withErrorHandler(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const userId = await getUserId();
  if (!userId) throw new AppError("Unauthorized", 401, ErrorCode.AUTH_UNAUTHORIZED);
  const { id } = await params;

  const supabase = await createServerClientFromCookies();
  const { data, error } = await supabase.rpc("cancel_booking", { p_booking_id: id, p_actor_id: userId });
  if (error) throw new AppError(error.message, 500, ErrorCode.INTERNAL_SERVER);
  return NextResponse.json(data);
});
