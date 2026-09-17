// Scheduling engine types
export interface TimeBlock {
  start: string; // "HH:MM" 24-hour
  end: string;   // "HH:MM" 24-hour
}

export type WeeklyAvailability = Record<string, TimeBlock[]>;
// Keys are "0"-"6" (Sunday=0) or "monday"..."sunday"

export interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
}

export interface SlotGenerationParams {
  availability: WeeklyAvailability | unknown;
  date: Date;
  durationMinutes: number;
  bufferMinutes: number;
  existingBookings: Array<{ scheduledAt: Date; durationMinutes: number }>;
}

export interface SlotGenerationResult {
  slots: TimeSlot[];
  hasAvailability: boolean;
}

// BATCH2_APPLIED
