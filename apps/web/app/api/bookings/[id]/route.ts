import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { createServerClientFromCookies } from "@zeal/database/server";
import { withErrorHandler, AppError, ErrorCode } from "@/lib/errors";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(
  async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const userId = await getUserId();
    if (!userId) throw new AppError("Unauthorized", 401, ErrorCode.AUTH_UNAUTHORIZED);
    const { id } = await params;

    const supabase = await createServerClientFromCookies();

    // Consultant profile (if user is a consultant)
    const { data: consultant } = await supabase
      .from("Consultant").select("id").eq("userId", userId).maybeSingle();

    // Fetch booking with joined user + consultant + consultant's user
    const { data: booking } = await supabase
      .from("Booking")
      .select(`
        *,
        user:User!Booking_userId_fkey(id, name, username, avatar, email),
        consultant:Consultant!Booking_consultantId_fkey(
          id, category, perMinuteRate,
          user:User!Consultant_userId_fkey(id, name, username, avatar)
        )
      `)
      .eq("id", id)
      .maybeSingle();

    if (!booking) throw new AppError("Booking not found", 404, ErrorCode.BOOKING_NOT_FOUND);

    // Authorization check
    const isOwner = booking.userId === userId;
    const isConsultant = consultant?.id && booking.consultantId === consultant.id;
    if (!isOwner && !isConsultant) {
      throw new AppError("Booking not found", 404, ErrorCode.BOOKING_NOT_FOUND);
    }

    // Fetch call session if present
    const { data: callSession } = await supabase
      .from("CallSession").select("*").eq("bookingId", id).maybeSingle();

    return NextResponse.json({ booking: { ...booking, callSession } });
  },
);

export const DELETE = withErrorHandler(
  async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const userId = await getUserId();
    if (!userId) throw new AppError("Unauthorized", 401, ErrorCode.AUTH_UNAUTHORIZED);
    const { id } = await params;

    const supabase = await createServerClientFromCookies();

    const { data: consultant } = await supabase
      .from("Consultant").select("id").eq("userId", userId).maybeSingle();

    const { data: booking } = await supabase
      .from("Booking").select("id, userId, consultantId")
      .eq("id", id).maybeSingle();

    if (!booking) throw new AppError("Booking not found", 404, ErrorCode.BOOKING_NOT_FOUND);

    const isOwner = booking.userId === userId;
    const isConsultant = consultant?.id && booking.consultantId === consultant.id;
    if (!isOwner && !isConsultant) {
      throw new AppError("Booking not found", 404, ErrorCode.BOOKING_NOT_FOUND);
    }

    const { data: updated } = await supabase
      .from("Booking").update({ status: "CANCELLED" })
      .eq("id", id).select("*").single();

    return NextResponse.json({ booking: updated });
  },
);
