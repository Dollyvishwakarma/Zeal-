import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { createServerClientFromCookies } from "@zeal/database/server";
import { withErrorHandler, AppError, ErrorCode } from "@/lib/errors";
import { z } from "zod";

export const dynamic = "force-dynamic";

const TimeBlockSchema = z.object({
  start: z.string().regex(/^\d{2}:\d{2}$/),
  end: z.string().regex(/^\d{2}:\d{2}$/),
});

const AvailabilitySchema = z.object({
  availability: z.record(z.string(), z.array(TimeBlockSchema)),
  bufferMinutes: z.number().int().min(0).max(120).optional(),
});

export const GET = withErrorHandler(async () => {
  const userId = await getUserId();
  if (!userId) throw new AppError("Unauthorized", 401, ErrorCode.AUTH_UNAUTHORIZED);

  const supabase = await createServerClientFromCookies();
  const { data: consultant } = await supabase
    .from("Consultant")
    .select("availability, bufferMinutes")
    .eq("userId", userId)
    .maybeSingle();

  if (!consultant) throw new AppError("Not a consultant", 403, ErrorCode.AUTH_FORBIDDEN);

  return NextResponse.json({
    availability: consultant.availability ?? {},
    bufferMinutes: consultant.bufferMinutes ?? 10,
  });
});

export const PUT = withErrorHandler(async (req: Request) => {
  const userId = await getUserId();
  if (!userId) throw new AppError("Unauthorized", 401, ErrorCode.AUTH_UNAUTHORIZED);

  const body = await req.json();
  const data = AvailabilitySchema.parse(body);

  const supabase = await createServerClientFromCookies();
  const { data: consultant } = await supabase
    .from("Consultant").select("id").eq("userId", userId).maybeSingle();
  if (!consultant) throw new AppError("Not a consultant", 403, ErrorCode.AUTH_FORBIDDEN);

  const patch: Record<string, unknown> = { availability: data.availability };
  if (data.bufferMinutes !== undefined) patch.bufferMinutes = data.bufferMinutes;

  const { data: updated, error } = await supabase
    .from("Consultant")
    .update(patch)
    .eq("id", consultant.id)
    .select("availability, bufferMinutes")
    .single();

  if (error) throw new AppError(error.message, 500, ErrorCode.INTERNAL_SERVER);
  return NextResponse.json(updated);
});
