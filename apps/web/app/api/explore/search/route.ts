import { NextResponse } from "next/server";
import { createServerClientFromCookies } from "@zeal/database/server";
import { withErrorHandler } from "@/lib/errors";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (req: Request) => {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") || "";
  const type = url.searchParams.get("type") || "all";

  if (!q || q.length < 2) return NextResponse.json({ results: [] });

  const supabase = await createServerClientFromCookies();
  const results: unknown[] = [];

  if (type === "all" || type === "consultant") {
    const { data: consultants } = await supabase
      .from("Consultant")
      .select(`
        id, specialties, isActive,
        user:User!Consultant_userId_fkey(id, name, username, avatar)
      `)
      .eq("isActive", true)
      .or(`specialties.cs.{${q}}`)
      .limit(10);

    // Filter by name/username in JS since PostgREST or() can't span joined tables easily
    const filtered = (consultants ?? []).filter((c: any) => {
      const u = c.user;
      if (!u) return false;
      const name = (u.name || "").toLowerCase();
      const uname = (u.username || "").toLowerCase();
      const ql = q.toLowerCase();
      return name.includes(ql) || uname.includes(ql);
    });

    for (const c of (filtered.length ? filtered : consultants ?? [])) {
      const u = (c as any).user;
      if (!u) continue;
      results.push({
        id: c.id,
        type: "consultant",
        label: u.name || u.username,
        description: ((c as any).specialties ?? []).join(", "),
        avatar: u.avatar,
      });
    }
  }

  if (type === "all" || type === "post") {
    const { data: posts } = await supabase
      .from("Post")
      .select(`
        id, content,
        author:User!Post_authorId_fkey(id, username, name, avatar)
      `)
      .ilike("content", `%${q}%`)
      .limit(5);

    for (const p of posts ?? []) {
      const a = (p as any).author;
      if (!a) continue;
      results.push({
        id: p.id,
        type: "post",
        label: ((p as any).content ?? "").substring(0, 50),
        description: a.username,
        avatar: a.avatar,
      });
    }
  }

  if (type === "all" || type === "hashtag") {
    const hashtags = ["spiritual", "wellness", "meditation", "yoga", "astrology"];
    const filtered = hashtags.filter((h) => h.includes(q.toLowerCase()));
    for (const h of filtered) {
      results.push({
        id: h, type: "hashtag", label: `#${h}`,
        description: `Posts tagged with ${h}`, avatar: null,
      });
    }
  }

  return NextResponse.json({ results });
});
