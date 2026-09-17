export {
  subscribeToChannel,
  publishToChannel,
  subscribeToPostgresChanges,
  subscribeToPresence,
  disconnectAllChannels,
  getSupabaseRealtimeClient,
  onConnectionStateChange,
  getConnectionState,
  getConnectionMetrics,
} from "./supabase-realtime";

export type { RealtimeHandler, ConnectionState } from "./supabase-realtime";

export { serverPublish } from "./server";

export interface RealtimeAdapter {
  publish(channel: string, event: string, data: unknown): Promise<void>;
}

export function getRealtimeAdapter(): RealtimeAdapter {
  return {
    async publish(channel: string, event: string, data: unknown): Promise<void> {
      if (typeof window === "undefined") {
        const { serverPublish } = await import("./server");
        await serverPublish(channel, event, data);
        return;
      }
      const { publishToChannel } = await import("./supabase-realtime");
      await publishToChannel(channel, event, data);
    },
  };
}
