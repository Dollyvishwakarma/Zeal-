import { getAdminClient } from "../admin";
import { throwIfError } from "../helpers/errors";

export async function listConversations(userId: string) {
  const { data, error } = await getAdminClient()
    .from("Conversation").select("*")
    .or(`userAId.eq.${userId},userBId.eq.${userId}`)
    .order("lastMessageAt", { ascending: false })
    .limit(100);
  if (error) throwIfError({ data: null, error });
  return data ?? [];
}

export async function getOrCreateConversation(userAId: string, userBId: string) {
  const sb = getAdminClient();
  const [a, b] = userAId < userBId ? [userAId, userBId] : [userBId, userAId];
  const existing = await sb.from("Conversation").select("*")
    .eq("userAId", a).eq("userBId", b).maybeSingle();
  if (existing.data) return existing.data;
  const { data, error } = await sb.from("Conversation")
    .insert({ userAId: a, userBId: b }).select("*").single();
  return throwIfError({ data, error });
}

export async function listMessages(conversationId: string, limit = 500) {
  const { data, error } = await getAdminClient()
    .from("ChatMessage").select("*")
    .eq("conversationId", conversationId)
    .order("createdAt", { ascending: true })
    .limit(limit);
  if (error) throwIfError({ data: null, error });
  return data ?? [];
}

export async function sendMessage(params: {
  conversationId: string; senderId: string; content: string;
}) {
  const sb = getAdminClient();
  const { data, error } = await sb.from("ChatMessage").insert({
    conversationId: params.conversationId,
    senderId: params.senderId,
    content: params.content,
  }).select("*").single();
  const msg = throwIfError({ data, error });

  await sb.from("Conversation").update({
    lastMessageAt: new Date().toISOString(),
    lastMessageText: params.content,
  }).eq("id", params.conversationId);

  return msg;
}
