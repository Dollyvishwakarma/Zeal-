import { NextResponse } from "next/server";
import { createServerClientFromCookies } from "@zeal/database/server";
import { withErrorHandler, AppError, ErrorCode } from "@/lib/errors";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const supabase = await createServerClientFromCookies();

  const { data: post } = await supabase
    .from("Post")
    .select(`
      id, content, mediaUrls, cheerCount, commentCount, shareCount, createdAt,
      author:User!Post_authorId_fkey(id, username, name, avatar)
    `)
    .eq("id", id)
    .maybeSingle();

  if (!post) throw new AppError("Post not found", 404, ErrorCode.NOT_FOUND);

  const p = post as any;
  return NextResponse.json({
    post: {
      id: p.id,
      content: p.content,
      imageUrl: Array.isArray(p.mediaUrls) && p.mediaUrls.length ? p.mediaUrls[0] : null,
      author: p.author,
      cheerCount: p.cheerCount,
      commentCount: p.commentCount,
      shareCount: p.shareCount,
      createdAt: p.createdAt,
    },
  });
});
