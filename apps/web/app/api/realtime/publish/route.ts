import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { withErrorHandler, AppError, ErrorCode } from "@/lib/errors";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const PublishSchema = z.object({
  channel: z.string().min(1).max(200),
  event: z.string().min(1).max(100),
  data: z.unknown(),
});

export const POST = withErrorHandler(async (req: Request) => {
  const userId = await getUserId();
  if (!userId) {
    throw new AppError("Unauthorized", 401, ErrorCode.AUTH_UNAUTHORIZED);
  }

  const body = await req.json();
  const { channel, event, data } = PublishSchema.parse(body);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new AppError("Supabase not configured", 500, ErrorCode.CONFIG_ERROR);
  }

  // Server-side Supabase client with service role for broadcasting
  const sb = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const ch = sb.channel(channel);
  await ch.subscribe();

  await ch.send({
    type: "broadcast",
    event,
    payload: data,
  });

  await sb.removeChannel(ch);

  return NextResponse.json({ success: true });
});

// VERCEL_SETUP_APPLIED
