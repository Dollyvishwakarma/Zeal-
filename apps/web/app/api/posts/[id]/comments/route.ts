import { NextResponse } from "next/server";
import { createServerClientFromCookies } from "@zeal/database/server";
import { getUserId } from "@/lib/auth";
import { withErrorHandler, AppError, ErrorCode } from "@/lib/errors";
import { z } from "zod";

export const dynamic = "force-dynamic";

const CommentSchema = z.object({
  content: z.string().min(1).max(1000),
  parentId: z.string().optional(),
});

export const GET = withErrorHandler(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id: postId } = await params;
  const supabase = await createServerClientFromCookies();

  const { data: comments } = await supabase
    .from("Comment")
    .select(`
      id, content, parentId, createdAt,
      author:User!Comment_authorId_fkey(id, username, name, avatar)
    `)
    .eq("postId", postId)
    .order("createdAt", { ascending: false })
    .limit(200);

  return NextResponse.json({ comments: comments ?? [] });
});

export const POST = withErrorHandler(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const userId = await getUserId();
  if (!userId) throw new AppError("Unauthorized", 401, ErrorCode.AUTH_UNAUTHORIZED);
  const { id: postId } = await params;

  const body = await req.json();
  const { content, parentId } = CommentSchema.parse(body);

  const supabase = await createServerClientFromCookies();

  const { data: post } = await supabase
    .from("Post").select("id").eq("id", postId).maybeSingle();
  if (!post) throw new AppError("Post not found", 404, ErrorCode.NOT_FOUND);

  const { data: comment, error } = await supabase
    .from("Comment")
    .insert({ content, postId, authorId: userId, parentId: parentId || null })
    .select(`
      id, content, parentId, createdAt,
      author:User!Comment_authorId_fkey(id, username, name, avatar)
    `)
    .single();

  if (error) throw new AppError(error.message, 500, ErrorCode.INTERNAL_SERVER);

  // Increment comment count
  const { data: current } = await supabase
    .from("Post").select("commentCount").eq("id", postId).maybeSingle();
  const next = (current?.commentCount ?? 0) + 1;
  await supabase.from("Post").update({ commentCount: next }).eq("id", postId);

  return NextResponse.json({ comment });
});
