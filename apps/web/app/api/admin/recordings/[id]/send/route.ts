import { NextResponse } from "next/server";
import { createAdminClient } from "@zeal/database/server";
import { withErrorHandler, AppError, ErrorCode } from "@/lib/errors";
import { requireRole } from "@/lib/auth/rbac";
import { sendEmail } from "@/lib/emails";
import { audit, requestMeta } from "@/lib/audit";

export const dynamic = "force-dynamic";

export const POST = withErrorHandler(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const actor = await requireRole("SUPPORT");
    const { id } = await params;
    const admin = createAdminClient();

    const { data: session } = await admin
      .from("CallSession")
      .select(`
        id, recordingUrl,
        booking:Booking!CallSession_bookingId_fkey(
          userId,
          user:User!Booking_userId_fkey(email),
          consultant:Consultant!Booking_consultantId_fkey(
            userId,
            user:User!Consultant_userId_fkey(email)
          )
        )
      `)
      .eq("id", id)
      .maybeSingle();

    if (!session) throw new AppError("Session not found", 404, ErrorCode.SESSION_NOT_FOUND);
    if (!session.recordingUrl) throw new AppError("No recording available", 400, ErrorCode.VALIDATION_INPUT);

    const booking = (session as any).booking;
    const recipients = [
      booking?.user?.email,
      booking?.consultant?.user?.email,
    ].filter((e): e is string => typeof e === "string" && e.length > 0);

    let sent = 0;
    for (const to of recipients) {
      try {
        await sendEmail({
          to,
          subject: "Your Zeal session recording",
          html: `<p>Your session recording is available:</p><p><a href="${session.recordingUrl}">${session.recordingUrl}</a></p>`,
        });
        sent++;
      } catch (err) {
        console.warn("[Recordings] Email to " + to + " failed:", err);
      }
    }

    const meta = requestMeta(req);
    await audit({
      userId: actor.userId,
      email: actor.email,
      action: "recording.send",
      targetType: "recording",
      targetId: id,
      metadata: { sent, recipients },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return NextResponse.json({ success: true, sent });
  },
);
