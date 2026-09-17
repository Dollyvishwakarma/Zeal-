import { NextResponse } from "next/server";
import { createAdminClient } from "@zeal/database/server";
import { NotificationService } from "@/lib/notifications/service";
import { withErrorHandler, AppError, ErrorCode } from "@/lib/errors";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: Request) => {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== "Bearer " + secret) {
    throw new AppError("Unauthorized", 401, ErrorCode.AUTH_UNAUTHORIZED);
  }

  const now = new Date();
  const in15Min = new Date(now.getTime() + 15 * 60 * 1000);

  const admin = createAdminClient();
  const { data: upcoming } = await admin
    .from("Booking")
    .select(`
      id, scheduledAt, userId,
      user:User!Booking_userId_fkey(id, name),
      consultant:Consultant!Booking_consultantId_fkey(
        id, userId,
        user:User!Consultant_userId_fkey(id, name)
      )
    `)
    .eq("status", "CONFIRMED")
    .gte("scheduledAt", now.toISOString())
    .lte("scheduledAt", in15Min.toISOString());

  let remindersSent = 0;
  for (const booking of upcoming ?? []) {
    const b = booking as any;
    const minutesUntil = Math.floor(
      (new Date(b.scheduledAt).getTime() - now.getTime()) / 60000,
    );
    const consultantUserId = b.consultant?.userId;
    const consultantName = b.consultant?.user?.name ?? "the consultant";

    if (minutesUntil <= 5 && minutesUntil > 0 && b.userId) {
      try {
        await NotificationService.createNotification({
          userId: b.userId,
          type: "reminder",
          message: `Your booking with ${consultantName} starts in 5 minutes!`,
          redirectUrl: `/booking/${b.id}`,
          actorId: consultantUserId ?? b.userId,
        });
        remindersSent++;
      } catch (err) {
        console.warn("[cron/reminders] 5min notify failed:", err);
      }
    } else if (minutesUntil <= 15 && minutesUntil > 5 && b.userId) {
      try {
        await NotificationService.createNotification({
          userId: b.userId,
          type: "reminder",
          message: `Reminder: Your booking with ${consultantName} starts in 15 minutes.`,
          redirectUrl: `/booking/${b.id}`,
          actorId: consultantUserId ?? b.userId,
        });
        remindersSent++;
      } catch (err) {
        console.warn("[cron/reminders] 15min notify failed:", err);
      }
    }
  }

  return NextResponse.json({ remindersSent });
});
