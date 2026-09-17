import { getUserId } from "@/lib/auth";
import { NextResponse } from "next/server";
import { withErrorHandler, AppError, HTTP_STATUS } from "@/lib/errors";
import { NotificationService } from "@/lib/notifications/service";

export const POST = withErrorHandler(async (
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const userId = await getUserId();
  if (!userId) throw new AppError("Unauthorized", HTTP_STATUS.UNAUTHORIZED);
  const { id } = await params;

  await NotificationService.markAsRead(id, userId);
  return NextResponse.json({ success: true });
});
