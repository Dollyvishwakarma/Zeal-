import { NextResponse } from "next/server";
import { createServerClientFromCookies } from "@zeal/database/server";
import { withErrorHandler } from "@/lib/errors";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: Request) => {
  const supabase = await createServerClientFromCookies();
  const url = new URL(req.url);
  const cursor = url.searchParams.get("cursor");
  const limit = parseInt(url.searchParams.get("limit") || "10");

  let q = supabase
    .from("Post")
    .select(`
      id, content, mediaUrls, cheerCount, commentCount, shareCount, createdAt,
      author:User!Post_authorId_fkey (id, username, name, avatar)
    `)
    .eq("isFlagged", false)
    .order("createdAt", { ascending: false })
    .limit(limit + 1);

  if (cursor) q = q.lt("createdAt", cursor);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let nextCursor: string | undefined;
  if (data && data.length > limit) {
    const last = data.pop();
    nextCursor = (last as any)?.createdAt;
  }

  const posts = (data || []).map((p: Record<string, unknown>) => ({
    id: p.id,
    content: p.content,
    imageUrl: Array.isArray(p.mediaUrls) && p.mediaUrls.length ? p.mediaUrls[0] : null,
    author: p.author,
    cheerCount: p.cheerCount,
    commentCount: p.commentCount,
    shareCount: p.shareCount,
    createdAt: p.createdAt,
  }));

  return NextResponse.json({ posts, nextCursor });
});
