import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { createServerClientFromCookies } from "@zeal/database/server";
import { withErrorHandler, AppError, ErrorCode } from "@/lib/errors";
import { NotificationService } from "@/lib/notifications/service";
import { serverPublish } from "@/lib/realtime/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const RateSchema = z.object({
  rating: z.number().int().min(1).max(5),
  review: z.string().max(500).optional(),
});

export const POST = withErrorHandler(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const userId = await getUserId();
    if (!userId) throw new AppError("Unauthorized", 401, ErrorCode.AUTH_UNAUTHORIZED);
    const { id } = await params;

    const body = await req.json();
    const { rating, review } = RateSchema.parse(body);

    const supabase = await createServerClientFromCookies();

    const { data: booking } = await supabase
      .from("Booking")
      .select(`
        id, status, userId, consultantId,
        consultant:Consultant!Booking_consultantId_fkey(
          id, userId, user:User!Consultant_userId_fkey(id, name)
        )
      `)
      .eq("id", id)
      .maybeSingle();

    if (!booking) throw new AppError("Booking not found", 404, ErrorCode.BOOKING_NOT_FOUND);
    if (booking.userId !== userId) throw new AppError("Forbidden", 403, ErrorCode.AUTH_FORBIDDEN);
    if (booking.status !== "COMPLETED") {
      throw new AppError("Can only rate completed bookings", 400, ErrorCode.BOOKING_CONFLICT);
    }

    await supabase
      .from("Booking")
      .update({ rating, review: review || null })
      .eq("id", id);

    // Recompute consultant average — no aggregate in Supabase, do in JS
    const { data: rated } = await supabase
      .from("Booking")
      .select("rating")
      .eq("consultantId", booking.consultantId)
      .not("rating", "is", null);

    const rows = (rated ?? []) as Array<{ rating: number | null }>;
    const avg = rows.length
      ? rows.reduce((s, r) => s + (r.rating ?? 0), 0) / rows.length
      : 0;

    await supabase
      .from("Consultant")
      .update({ rating: avg })
      .eq("id", booking.consultantId);

    // Notify consultant
    const consultantUserId = (booking.consultant as any)?.userId;
    if (consultantUserId) {
      try {
        await NotificationService.createNotification({
          userId: consultantUserId,
          type: "system",
          message: `You received a ${rating}-star rating`,
          redirectUrl: "/consultant/dashboard",
          actorId: userId,
        });
      } catch (err) {
        console.warn("[rate] notify failed:", err);
      }
    }

    await serverPublish(
      "consultant:" + booking.consultantId,
      "rating:updated",
      { consultantId: booking.consultantId, rating: avg },
    );

    return NextResponse.json({ success: true, rating });
  },
);
