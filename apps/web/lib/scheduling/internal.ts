// Internal slot generator – no external dependency
import type {
  TimeBlock,
  WeeklyAvailability,
  TimeSlot,
  SlotGenerationParams,
  SlotGenerationResult,
} from "./types";

const DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

// ─── Parse "HH:MM" onto a base date ──────────────────────────────────────────
function parseTimeToDate(time: string, baseDate: Date): Date | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;
  const hStr = match[1];
  const mStr = match[2];
  if (!hStr || !mStr) return null;
  const hours = parseInt(hStr, 10);
  const minutes = parseInt(mStr, 10);
  if (isNaN(hours) || isNaN(minutes) || hours > 23 || minutes > 59) return null;
  const d = new Date(baseDate);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

// ─── Extract time blocks for a given date ────────────────────────────────────
function getBlocksForDate(
  availability: WeeklyAvailability | unknown,
  date: Date,
): TimeBlock[] {
  if (!availability || typeof availability !== "object") return [];
  const avail = availability as Record<string, unknown>;

  const dayIndex = date.getDay();
  const dayName = DAY_KEYS[dayIndex];
  if (!dayName) return [];

  const candidates = [
    avail[String(dayIndex)],
    avail[dayName],
    avail[dayName.toUpperCase()],
    avail[dayName.charAt(0).toUpperCase() + dayName.slice(1)],
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter(
        (b): b is TimeBlock =>
          typeof b === "object" &&
          b !== null &&
          typeof (b as TimeBlock).start === "string" &&
          typeof (b as TimeBlock).end === "string",
      );
    }
  }
  return [];
}

// ─── Generate available slots ────────────────────────────────────────────────
export function generateSlots(params: SlotGenerationParams): SlotGenerationResult {
  const { availability, date, durationMinutes, bufferMinutes, existingBookings } = params;

  const blocks = getBlocksForDate(availability, date);
  if (blocks.length === 0) {
    return { slots: [], hasAvailability: false };
  }

  const now = new Date();
  const slots: TimeSlot[] = [];

  for (const block of blocks) {
    const blockStart = parseTimeToDate(block.start, date);
    const blockEnd = parseTimeToDate(block.end, date);
    if (!blockStart || !blockEnd || blockEnd <= blockStart) continue;

    let cursor = new Date(blockStart);
    while (cursor.getTime() + durationMinutes * 60_000 <= blockEnd.getTime()) {
      const slotEnd = new Date(cursor.getTime() + durationMinutes * 60_000);

      // Skip slots in the past (with 5-minute lead time)
      const isPast = cursor.getTime() < now.getTime() + 5 * 60_000;

      // Check overlap with existing bookings
      const isBooked = existingBookings.some((b) => {
        const bStart = b.scheduledAt.getTime();
        const bEnd = bStart + b.durationMinutes * 60_000;
        return cursor.getTime() < bEnd && slotEnd.getTime() > bStart;
      });

      slots.push({
        start: new Date(cursor),
        end: slotEnd,
        available: !isPast && !isBooked,
      });

      cursor = new Date(slotEnd.getTime() + bufferMinutes * 60_000);
    }
  }

  return { slots, hasAvailability: slots.some((s) => s.available) };
}

// BATCH2_APPLIED
