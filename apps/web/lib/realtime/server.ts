import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let serverClient: SupabaseClient | null = null;

function getServerClient(): SupabaseClient | null {
  if (serverClient) return serverClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[RealtimeServer] SUPABASE_SERVICE_ROLE_KEY missing — server publishes will be skipped",
      );
    }
    return null;
  }

  serverClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { params: { eventsPerSecond: 50 } },
    global: { headers: { "x-application-name": "zeal-api" } },
  });

  return serverClient;
}

export interface ServerPublishOptions {
  retries?: number;
  retryDelayMs?: number;
}

/**
 * Publish a broadcast event from the server.
 * Retries on failure with a linear backoff.
 * Returns true on success, false if realtime is unavailable.
 */
export async function serverPublish(
  channelName: string,
  eventName: string,
  data: unknown,
  options?: ServerPublishOptions,
): Promise<boolean> {
  const sb = getServerClient();
  if (!sb) return false;

  const retries = options?.retries ?? 2;
  const baseDelay = options?.retryDelayMs ?? 200;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const ch = sb.channel(channelName);
      await ch.subscribe();
      try {
        const res = await ch.send({
          type: "broadcast",
          event: eventName,
          payload: data,
        });
        if (res === "ok") return true;
      } finally {
        try { await sb.removeChannel(ch); } catch { /* ignore */ }
      }
    } catch (err) {
      console.warn(
        "[RealtimeServer] publish attempt " + (attempt + 1) + "/" + (retries + 1) + " failed:",
        err,
      );
    }
    if (attempt < retries) {
      await new Promise((r) => setTimeout(r, baseDelay * (attempt + 1)));
    }
  }

  return false;
}
