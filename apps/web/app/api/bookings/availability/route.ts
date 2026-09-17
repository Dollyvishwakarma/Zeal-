import { NextResponse } from "next/server";
import { createServerClientFromCookies } from "@zeal/database/server";
import { withErrorHandler, AppError, ErrorCode } from "@/lib/errors";
import { generateSlots } from "@/lib/scheduling";
import { z } from "zod";

export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  consultantId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  durationMinutes: z.coerce.number().int().min(5).max(240).default(30),
});

interface BookingRow {
  scheduledAt: string;
  durationMinutes: number;
}

export const GET = withErrorHandler(async (req: Request) => {
  const url = new URL(req.url);
  const params = QuerySchema.parse({
    consultantId: url.searchParams.get("consultantId"),
    date: url.searchParams.get("date"),
    durationMinutes: url.searchParams.get("durationMinutes") || "30",
  });

  const supabase = await createServerClientFromCookies();

  const { data: consultant } = await supabase
    .from("Consultant")
    .select("availability, bufferMinutes, isActive")
    .eq("id", params.consultantId)
    .maybeSingle();

  if (!consultant || !consultant.isActive) {
    throw new AppError("Consultant not available", 404, ErrorCode.NOT_FOUND);
  }

  const targetDate = new Date(params.date + "T00:00:00");
  const dayEnd = new Date(targetDate);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const { data: raw } = await supabase
    .from("Booking")
    .select("scheduledAt, durationMinutes")
    .eq("consultantId", params.consultantId)
    .in("status", ["PENDING", "CONFIRMED", "IN_PROGRESS"])
    .gte("scheduledAt", targetDate.toISOString())
    .lt("scheduledAt", dayEnd.toISOString());

  const rows = (raw ?? []) as BookingRow[];
  const existingBookings = rows.map((b) => ({
    scheduledAt: new Date(b.scheduledAt),
    durationMinutes: b.durationMinutes,
  }));

  const result = generateSlots({
    availability: consultant.availability,
    date: targetDate,
    durationMinutes: params.durationMinutes,
    bufferMinutes: consultant.bufferMinutes ?? 10,
    existingBookings,
  });

  return NextResponse.json({
    date: params.date,
    slots: result.slots.map((s) => ({
      start: s.start.toISOString(),
      end: s.end.toISOString(),
      available: s.available,
    })),
    hasAvailability: result.hasAvailability,
  });
});
