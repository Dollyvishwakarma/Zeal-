import { getAdminClient } from "../admin";
import { throwIfError } from "../helpers/errors";

const POST_SELECT = `
  id, content, mediaUrls, cheerCount, commentCount, shareCount, isPinned,
  isFlagged, createdAt, updatedAt,
  author:User!Post_authorId_fkey (id, username, name, avatar)
`;

export async function getFeed(opts: { cursor?: string; limit?: number } = {}) {
  const { cursor, limit = 10 } = opts;
  let q = getAdminClient()
    .from("Post").select(POST_SELECT)
    .eq("isFlagged", false)
    .order("createdAt", { ascending: false })
    .limit(limit + 1);
  if (cursor) q = q.lt("createdAt", cursor);
  const { data, error } = await q;
  if (error) throwIfError({ data: null, error });
  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore && items.length > 0
    ? (items[items.length - 1] as { createdAt: string }).createdAt
    : undefined;
  return { items, nextCursor };
}

export async function getPostById(id: string) {
  const { data, error } = await getAdminClient()
    .from("Post").select(POST_SELECT).eq("id", id).maybeSingle();
  if (error) throwIfError({ data, error });
  return data;
}

export async function createPost(payload: {
  content: string; mediaUrls?: string[]; authorId: string;
}) {
  const { data, error } = await getAdminClient()
    .from("Post").insert({
      content: payload.content,
      mediaUrls: payload.mediaUrls ?? [],
      authorId: payload.authorId,
    }).select(POST_SELECT).single();
  return throwIfError({ data, error });
}
