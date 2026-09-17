import { getAdminClient } from "../admin";
import { throwIfError } from "../helpers/errors";

export interface CreateNotificationParams {
  userId: string; type: string; message: string;
  redirectUrl?: string | null; actorId: string;
}

export const NotificationService = {
  async create(params: CreateNotificationParams) {
    const { data, error } = await getAdminClient()
      .from("Notification").insert({
        userId: params.userId, type: params.type, message: params.message,
        redirectUrl: params.redirectUrl ?? null, actorId: params.actorId,
      }).select("*").single();
    return throwIfError({ data, error });
  },

  async markRead(id: string, userId: string) {
    const { error } = await getAdminClient()
      .from("Notification").update({ read: true }).eq("id", id).eq("userId", userId);
    if (error) throwIfError({ data: null, error });
  },

  async markAllRead(userId: string) {
    const { error } = await getAdminClient()
      .from("Notification").update({ read: true }).eq("userId", userId).eq("read", false);
    if (error) throwIfError({ data: null, error });
  },

  async list(userId: string, opts: { limit?: number; offset?: number } = {}) {
    const { limit = 50, offset = 0 } = opts;
    const sb = getAdminClient();
    const [itemsRes, unreadRes] = await Promise.all([
      sb.from("Notification").select("*", { count: "exact" })
        .eq("userId", userId).order("createdAt", { ascending: false })
        .range(offset, offset + limit - 1),
      sb.from("Notification").select("*", { count: "exact", head: true })
        .eq("userId", userId).eq("read", false),
    ]);
    if (itemsRes.error) throwIfError({ data: null, error: itemsRes.error });
    if (unreadRes.error) throwIfError({ data: null, error: unreadRes.error });
    return {
      items: itemsRes.data ?? [], total: itemsRes.count ?? 0,
      unreadCount: unreadRes.count ?? 0,
    };
  },

  async broadcast(params: {
    message: string; type?: string; actorId: string;
    segment?: "all" | "consultants" | "users";
    targetUserIds?: string[];
  }): Promise<{ sent: number }> {
    const sb = getAdminClient();
    let userIds = params.targetUserIds ?? [];
    if (userIds.length === 0 && params.segment) {
      if (params.segment === "all") {
        const { data } = await sb.from("User").select("id").limit(5000);
        userIds = (data ?? []).map((u) => u.id);
      } else if (params.segment === "consultants") {
        const { data } = await sb.from("Consultant").select("userId")
          .eq("status", "VERIFIED").limit(5000);
        userIds = (data ?? []).map((c) => c.userId);
      } else {
        const { data } = await sb.from("User").select("id")
          .eq("role", "USER").limit(5000);
        userIds = (data ?? []).map((u) => u.id);
      }
    }
    let sent = 0;
    for (const userId of userIds) {
      try {
        await this.create({
          userId, type: params.type ?? "system",
          message: params.message, actorId: params.actorId,
        });
        sent++;
      } catch (err) {
        console.warn("[Notifications] Broadcast failed for", userId, err);
      }
    }
    return { sent };
  },
};
