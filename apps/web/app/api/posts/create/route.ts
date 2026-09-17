import { NextResponse } from "next/server";
import { createServerClientFromCookies, getUserId } from "@zeal/database/server";
import { withErrorHandler, AppError, ErrorCode } from "@/lib/errors";

export const dynamic = "force-dynamic";

export const POST = withErrorHandler(async (req: Request) => {
  const userId = await getUserId();
  if (!userId) throw new AppError("Unauthorized", 401, ErrorCode.AUTH_UNAUTHORIZED);

  const supabase = await createServerClientFromCookies();
  const formData = await req.formData();
  const content = (formData.get("content") as string) || "";

  if (!content) throw new AppError("Content required", 400, ErrorCode.VALIDATION_INPUT);

  const { data, error } = await supabase
    .from("Post")
    .insert({ content, mediaUrls: [], authorId: userId })
    .select()
    .single();

  if (error) throw new AppError(error.message, 500, ErrorCode.INTERNAL_SERVER);
  return NextResponse.json({ post: data });
});
