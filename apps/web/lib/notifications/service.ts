// Notification service — Supabase-native, realtime-published
import { createAdminClient } from "@zeal/database/server";
import { sendEmail } from "@/lib/emails";
import { emailTemplates } from "@/lib/emails/templates";
import { serverPublish } from "@/lib/realtime/server";

export type NotificationType =
  | "booking" | "call" | "chat" | "system" | "referral"
  | "quest" | "payment" | "verification" | "new_post" | "reminder";

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  message: string;
  redirectUrl?: string;
  actorId: string;
  metadata?: Record<string, unknown>;
  sendEmail?: boolean;
  emailTemplate?: keyof typeof emailTemplates;
  emailContext?: Record<string, unknown>;
}

export class NotificationService {
  static async createNotification(params: CreateNotificationParams) {
    const admin = createAdminClient();
    const { data: notif, error } = await admin
      .from("Notification")
      .insert({
        userId: params.userId,
        type: params.type,
        message: params.message,
        redirectUrl: params.redirectUrl ?? null,
        actorId: params.actorId,
        read: false,
      })
      .select("*")
      .single();

    if (error || !notif) throw new Error(error?.message || "Notification insert failed");

    try {
      await serverPublish(`user:${params.userId}`, "notification", {
        id: notif.id,
        type: notif.type,
        message: notif.message,
        redirectUrl: notif.redirectUrl,
        createdAt: notif.createdAt,
      });
    } catch (err) {
      console.warn("[Notifications] Realtime publish failed:", err);
    }

    if (params.sendEmail && params.emailTemplate) {
      try {
        const { data: user } = await admin
          .from("User").select("email").eq("id", params.userId).maybeSingle();
        const userRow = user as { email?: string } | null;
        if (userRow?.email) {
          const tplFn = emailTemplates[params.emailTemplate] as
            | ((...args: unknown[]) => { subject: string; html: string })
            | undefined;
          if (typeof tplFn === "function") {
            const tpl = tplFn(...Object.values(params.emailContext ?? {}));
            await sendEmail({ to: userRow.email, subject: tpl.subject, html: tpl.html });
          }
        }
      } catch (err) {
        console.warn("[Notifications] Email send failed:", err);
      }
    }

    return notif;
  }

  static async markAsRead(notificationId: string, userId: string) {
    const admin = createAdminClient();
    await admin.from("Notification")
      .update({ read: true })
      .eq("id", notificationId)
      .eq("userId", userId);
  }

  static async markAllAsRead(userId: string) {
    const admin = createAdminClient();
    await admin.from("Notification")
      .update({ read: true })
      .eq("userId", userId)
      .eq("read", false);
  }

  static async broadcast(params: {
    message: string;
    type?: NotificationType;
    actorId: string;
    targetUserIds?: string[];
    segment?: "all" | "consultants" | "users";
  }): Promise<{ sent: number }> {
    const admin = createAdminClient();
    let userIds: string[] = params.targetUserIds ?? [];

    if (userIds.length === 0 && params.segment) {
      if (params.segment === "all") {
        const { data } = await admin.from("User").select("id").limit(5000);
        userIds = ((data ?? []) as Array<{ id: string }>).map((u) => u.id);
      } else if (params.segment === "consultants") {
        const { data } = await admin
          .from("Consultant")
          .select("userId")
          .eq("status", "VERIFIED")
          .limit(5000);
        userIds = ((data ?? []) as Array<{ userId: string }>).map((c) => c.userId);
      } else {
        const { data } = await admin
          .from("User")
          .select("id")
          .eq("role", "USER")
          .limit(5000);
        userIds = ((data ?? []) as Array<{ id: string }>).map((u) => u.id);
      }
    }

    let sent = 0;
    for (const userId of userIds) {
      try {
        await this.createNotification({
          userId,
          type: params.type ?? "system",
          message: params.message,
          actorId: params.actorId,
        });
        sent++;
      } catch (err) {
        console.warn("[Notifications] Broadcast failed for", userId, err);
      }
    }
    return { sent };
  }
}
