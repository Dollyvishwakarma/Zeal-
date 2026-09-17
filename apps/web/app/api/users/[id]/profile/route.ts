import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { createServerClientFromCookies } from "@zeal/database/server";
import { withErrorHandler, AppError, ErrorCode } from "@/lib/errors";
import { getStorageAdapter } from "@/lib/storage";
import { z } from "zod";

export const dynamic = "force-dynamic";

const UpdateProfileSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  bio: z.string().max(500).optional(),
  avatar: z.string().url().optional(),
  username: z.string().min(3).max(30).regex(/^[a-z0-9_]+$/).optional(),
});

export const GET = withErrorHandler(
  async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id: targetId } = await params;
    const viewerId = await getUserId();

    const supabase = await createServerClientFromCookies();
    const { data: user } = await supabase
      .from("User")
      .select(`
        id, username, name, avatar, sparks, isVerified, role,
        consultant:Consultant!Consultant_userId_fkey(
          id, category, specialties, languages, bio, perMinuteRate,
          rating, totalConsultations, isActive, isVerified, subdomain
        )
      `)
      .eq("id", targetId)
      .maybeSingle();

    if (!user) throw new AppError("User not found", 404, ErrorCode.NOT_FOUND);

    if (viewerId === targetId) {
      const { data: wallet } = await supabase
        .from("Wallet").select("*").eq("userId", targetId).maybeSingle();
      return NextResponse.json({ user: { ...user, wallet } });
    }

    return NextResponse.json({ user });
  },
);

export const PUT = withErrorHandler(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id: targetId } = await params;
    const viewerId = await getUserId();
    if (!viewerId) throw new AppError("Unauthorized", 401, ErrorCode.AUTH_UNAUTHORIZED);
    if (viewerId !== targetId) throw new AppError("Forbidden", 403, ErrorCode.AUTH_FORBIDDEN);

    const body = await req.json();
    const data = UpdateProfileSchema.parse(body);

    const supabase = await createServerClientFromCookies();

    if (data.username) {
      const { data: existing } = await supabase
        .from("User").select("id").eq("username", data.username).maybeSingle();
      if (existing && existing.id !== targetId) {
        throw new AppError("Username already taken", 409, ErrorCode.BOOKING_CONFLICT);
      }
    }

    const { data: user, error } = await supabase
      .from("User")
      .update({ name: data.name, avatar: data.avatar, username: data.username })
      .eq("id", targetId)
      .select("*")
      .single();

    if (error) throw new AppError(error.message, 500, ErrorCode.INTERNAL_SERVER);
    return NextResponse.json({ user });
  },
);

export const POST = withErrorHandler(
  async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id: targetId } = await params;
    const viewerId = await getUserId();
    if (!viewerId) throw new AppError("Unauthorized", 401, ErrorCode.AUTH_UNAUTHORIZED);
    if (viewerId !== targetId) throw new AppError("Forbidden", 403, ErrorCode.AUTH_FORBIDDEN);

    const adapter = getStorageAdapter();
    if (!adapter) throw new AppError("Storage not configured", 503, ErrorCode.CONFIG_ERROR);

    const formData = await req.formData();
    const file = formData.get("avatar");
    if (!file || !(file instanceof Blob)) {
      throw new AppError("No avatar provided", 400, ErrorCode.VALIDATION_INPUT);
    }
    if (file.size > 2 * 1024 * 1024) {
      throw new AppError("Avatar must be under 2 MB", 413, ErrorCode.VALIDATION_INPUT);
    }
    if (!file.type.startsWith("image/")) {
      throw new AppError("Avatar must be an image", 400, ErrorCode.VALIDATION_INPUT);
    }

    const ab = await file.arrayBuffer();
    const body = new Uint8Array(ab);
    const ext = (file.type.split("/")[1] || "jpg").replace(/[^a-z0-9]/g, "");
    const key = `avatars/${targetId}/${Date.now()}.${ext}`;

    const result = await adapter.upload({ key, body, contentType: file.type });

    const supabase = await createServerClientFromCookies();
    await supabase.from("User").update({ avatar: result.url }).eq("id", targetId);

    return NextResponse.json({ url: result.url });
  },
);
