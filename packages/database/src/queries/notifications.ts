import { getAdminClient } from "../admin";
import { throwIfError } from "../helpers/errors";

export async function createNotification(payload: {
  userId: string; type: string; message: string;
  redirectUrl?: string | null; actorId: string;
}) {
  const { data, error } = await getAdminClient()
    .from("Notification").insert({
      userId: payload.userId, type: payload.type, message: payload.message,
      redirectUrl: payload.redirectUrl ?? null, actorId: payload.actorId,
    }).select("*").single();
  return throwIfError({ data, error });
}

export async function markNotificationRead(id: string, userId: string) {
  const { error } = await getAdminClient()
    .from("Notification").update({ read: true }).eq("id", id).eq("userId", userId);
  if (error) throwIfError({ data: null, error });
}

export async function markAllNotificationsRead(userId: string) {
  const { error } = await getAdminClient()
    .from("Notification").update({ read: true }).eq("userId", userId).eq("read", false);
  if (error) throwIfError({ data: null, error });
}

export async function listNotifications(userId: string, opts: { limit?: number; offset?: number } = {}) {
  const { limit = 50, offset = 0 } = opts;
  const { data, error, count } = await getAdminClient()
    .from("Notification").select("*", { count: "exact" })
    .eq("userId", userId).order("createdAt", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throwIfError({ data: null, error });
  return { items: data ?? [], total: count ?? 0 };
}

export async function unreadCount(userId: string): Promise<number> {
  const { count, error } = await getAdminClient()
    .from("Notification").select("*", { count: "exact", head: true })
    .eq("userId", userId).eq("read", false);
  if (error) throwIfError({ data: null, error });
  return count ?? 0;
}
