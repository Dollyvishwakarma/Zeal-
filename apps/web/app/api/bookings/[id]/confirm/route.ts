import { NextResponse } from "next/server";
import { serverPublish } from "@/lib/realtime/server";
import { getUserId } from "@/lib/auth";
import { createServerClientFromCookies } from "@zeal/database/server";
import { withErrorHandler, AppError, ErrorCode } from "@/lib/errors";
import { generateMeetingLink } from "@/lib/livekit/room";
import { NotificationService } from "@/lib/notifications/service";

export const dynamic = "force-dynamic";

export const POST = withErrorHandler(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const userId = await getUserId();
  if (!userId) throw new AppError("Unauthorized", 401, ErrorCode.AUTH_UNAUTHORIZED);
  const { id } = await params;

  const supabase = await createServerClientFromCookies();

  const { data: booking } = await supabase
    .from("Booking")
    .select(`
      id, status, userId, consultantId, amount,
      consultant:Consultant!Booking_consultantId_fkey(
        id, userId,
        user:User!Consultant_userId_fkey(id, name)
      ),
      user:User!Booking_userId_fkey(id, name)
    `)
    .eq("id", id)
    .maybeSingle();

  if (!booking) throw new AppError("Booking not found", 404, ErrorCode.BOOKING_NOT_FOUND);

  const consultantUserId = (booking.consultant as any)?.userId;
  const isParticipant = booking.userId === userId || consultantUserId === userId;
  if (!isParticipant) throw new AppError("Not authorized", 403, ErrorCode.AUTH_FORBIDDEN);

  if (booking.status === "CONFIRMED") {
    await serverPublish("booking:" + id, "booking:updated", { bookingId: id, status: "CONFIRMED" });
    return NextResponse.json({ booking });
  }
  if (booking.status !== "PENDING") {
    throw new AppError("Cannot confirm booking in current status", 400, ErrorCode.BOOKING_CONFLICT);
  }

  const meetingLink = await generateMeetingLink(id);

  const { data: updated, error } = await supabase
    .from("Booking")
    .update({ status: "CONFIRMED", meetingLink })
    .eq("id", id)
    .select(`
      *,
      consultant:Consultant!Booking_consultantId_fkey(
        *, user:User!Consultant_userId_fkey(*)
      ),
      user:User!Booking_userId_fkey(*)
    `)
    .single();

  if (error || !updated) throw new AppError(error?.message || "Update failed", 500, ErrorCode.INTERNAL_SERVER);

  // Notify seeker
  if (booking.userId) {
    try {
      await NotificationService.createNotification({
        userId: booking.userId,
        type: "booking",
        message: `Your booking with ${(booking.consultant as any)?.user?.name ?? "the consultant"} is confirmed!`,
        redirectUrl: `/booking/${booking.id}`,
        actorId: userId,
      });
    } catch (err) {
      console.warn("[confirm] notify failed:", err);
    }
  }

  return NextResponse.json({ booking: updated });
});
