import { getAdminClient } from "../admin";
import { throwIfError } from "../helpers/errors";

export interface TimeBlock { start: string; end: string; }
const DAY_KEYS = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];

function parseTimeToDate(time: string, baseDate: Date): Date | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!m) return null;
  const h = parseInt(m[1]!, 10);
  const mm = parseInt(m[2]!, 10);
  if (isNaN(h) || isNaN(mm) || h > 23 || mm > 59) return null;
  const d = new Date(baseDate);
  d.setHours(h, mm, 0, 0);
  return d;
}

function getBlocksForDate(avail: unknown, date: Date): TimeBlock[] {
  if (!avail || typeof avail !== "object") return [];
  const a = avail as Record<string, unknown>;
  const dayName = DAY_KEYS[date.getDay()];
  if (!dayName) return [];
  const candidates = [a[String(date.getDay())], a[dayName], a[dayName.toUpperCase()]];
  for (const c of candidates) {
    if (Array.isArray(c)) {
      return c.filter((b): b is TimeBlock =>
        typeof b === "object" && b !== null &&
        typeof (b as TimeBlock).start === "string" &&
        typeof (b as TimeBlock).end === "string");
    }
  }
  return [];
}

export async function generateSlots(params: {
  consultantId: string; date: Date; durationMinutes: number;
}) {
  const sb = getAdminClient();
  const { data: consultant, error: cErr } = await sb
    .from("Consultant").select("availability, bufferMinutes, isActive")
    .eq("id", params.consultantId).maybeSingle();
  if (cErr) throwIfError({ data: null, error: cErr });
  if (!consultant || !consultant.isActive) return { slots: [], hasAvailability: false };

  const dayStart = new Date(params.date); dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);

  const { data: existing, error: bErr } = await sb
    .from("Booking").select("scheduledAt, durationMinutes")
    .eq("consultantId", params.consultantId)
    .in("status", ["PENDING", "CONFIRMED", "IN_PROGRESS"])
    .gte("scheduledAt", dayStart.toISOString())
    .lt("scheduledAt", dayEnd.toISOString());
  if (bErr) throwIfError({ data: null, error: bErr });

  const blocks = getBlocksForDate(consultant.availability, params.date);
  if (blocks.length === 0) return { slots: [], hasAvailability: false };

  const now = new Date();
  const bufferMinutes = consultant.bufferMinutes ?? 10;
  const slots: Array<{ start: Date; end: Date; available: boolean }> = [];

  for (const block of blocks) {
    const bStart = parseTimeToDate(block.start, params.date);
    const bEnd = parseTimeToDate(block.end, params.date);
    if (!bStart || !bEnd || bEnd <= bStart) continue;
    let cursor = new Date(bStart);
    while (cursor.getTime() + params.durationMinutes * 60_000 <= bEnd.getTime()) {
      const slotEnd = new Date(cursor.getTime() + params.durationMinutes * 60_000);
      const isPast = cursor.getTime() < now.getTime() + 5 * 60_000;
      const isBooked = (existing ?? []).some((b) => {
        const bs = new Date(b.scheduledAt).getTime();
        const be = bs + b.durationMinutes * 60_000;
        return cursor.getTime() < be && slotEnd.getTime() > bs;
      });
      slots.push({ start: new Date(cursor), end: slotEnd, available: !isPast && !isBooked });
      cursor = new Date(slotEnd.getTime() + bufferMinutes * 60_000);
    }
  }
  return { slots, hasAvailability: slots.some((s) => s.available) };
}
