// apps/web/app/api/sparks/feed/route.ts
import { NextResponse } from "next/server";
import { createServerClientFromCookies } from "@zeal/database/server";

export const dynamic = "force-dynamic";

interface CheerRow {
  id: string;
  createdAt: string;
  user: { id: string; username: string; avatar: string | null } | null;
  post: { id: string; content: string } | null;
}

export async function GET(req: Request) {
  const supabase = await createServerClientFromCookies();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "40"), 100);

  const { data } = await supabase
    .from("Cheer")
    .select(`
      id, createdAt,
      user:User!Cheer_userId_fkey(id, username, avatar),
      post:Post!Cheer_postId_fkey(id, content)
    `)
    .eq("post.authorId", user.id)
    .order("createdAt", { ascending: false })
    .limit(limit);

  const activities = ((data ?? []) as CheerRow[]).map((c) => {
    const actor = Array.isArray(c.user) ? c.user[0] : c.user;
    const post = Array.isArray(c.post) ? c.post[0] : c.post;
    return {
      id: c.id,
      type: "cheer" as const,
      actor: actor
        ? { id: actor.id, username: actor.username, avatar: actor.avatar }
        : { id: "unknown", username: "user", avatar: null },
      target: post ? { id: post.id, content: post.content } : { id: "", content: "" },
      sparksEarned: 1,
      createdAt: c.createdAt,
    };
  });

  return NextResponse.json({ activities });
}