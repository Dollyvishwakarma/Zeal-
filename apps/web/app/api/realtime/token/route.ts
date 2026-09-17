import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { withErrorHandler, AppError, ErrorCode } from "@/lib/errors";
import crypto from "crypto";

export const POST = withErrorHandler(async () => {
  const userId = await getUserId();
  if (!userId) {
    throw new AppError("Unauthorized", 401, ErrorCode.AUTH_UNAUTHORIZED);
  }

  const secret = process.env.APINATOR_APP_SECRET;
  const appKey = process.env.NEXT_PUBLIC_APINATOR_APP_KEY;

  if (!secret || !appKey) {
    throw new AppError("Realtime not configured", 500, ErrorCode.CONFIG_ERROR);
  }

  const payload = {
    sub: userId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(payloadB64)
    .digest("base64url");

  const token = payloadB64 + "." + signature;

  return NextResponse.json({ token, appKey });
});

// BATCH1_APPLIED
