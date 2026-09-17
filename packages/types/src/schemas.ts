import { z } from 'zod';

export const TopupSchema = z.object({
  amount: z.number().min(1).max(100000),
});

export const CreateBookingSchema = z.object({
  consultantId: z.string().cuid(),
  scheduledAt: z.string().datetime(),
  durationMinutes: z.number().int().min(5).max(120),
  externalEmail: z.string().email().optional(),
});

export const PlatformFeeSchema = z.object({
  feePercent: z.number().min(0).max(50),
});

export type TopupType = z.infer<typeof TopupSchema>;
export type CreateBookingType = z.infer<typeof CreateBookingSchema>;
export type PlatformFeeType = z.infer<typeof PlatformFeeSchema>;
