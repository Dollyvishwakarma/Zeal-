"use client";

import {
  createClient,
  type RealtimeChannel,
  type SupabaseClient,
} from "@supabase/supabase-js";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ConnectionState =
  | "connecting"
  | "connected"
  | "disconnected"
  | "reconnecting";

export type RealtimeHandler<T = unknown> = (payload: T) => void;

interface ChannelEntry {
  channel: RealtimeChannel;
  listeners: Map<string, Set<RealtimeHandler>>;
  subscribePromise?: Promise<void>;
}

interface ConnectionMetrics {
  reconnects: number;
  lastConnectedAt: number | null;
  lastDisconnectedAt: number | null;
}

// ─── Module state ─────────────────────────────────────────────────────────────

let client: SupabaseClient | null = null;
const channels = new Map<string, ChannelEntry>();
const stateListeners = new Set<(s: ConnectionState) => void>();
let currentState: ConnectionState = "disconnected";
let reconnectAttempt = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

const metrics: ConnectionMetrics = {
  reconnects: 0,
  lastConnectedAt: null,
  lastDisconnectedAt: null,
};

const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_BACKOFF_MS = 500;
const MAX_BACKOFF_MS = 30_000;
const JITTER_FACTOR = 0.3;

// ─── State emitters ───────────────────────────────────────────────────────────

function setState(next: ConnectionState): void {
  if (next === currentState) return;
  currentState = next;
  if (next === "connected") metrics.lastConnectedAt = Date.now();
  if (next === "disconnected") metrics.lastDisconnectedAt = Date.now();
  for (const fn of stateListeners) {
    try { fn(next); } catch (e) { console.warn("[Realtime] state listener error", e); }
  }
}

export function onConnectionStateChange(
  fn: (s: ConnectionState) => void,
): () => void {
  stateListeners.add(fn);
  fn(currentState);
  return () => { stateListeners.delete(fn); };
}

export function getConnectionState(): ConnectionState {
  return currentState;
}

export function getConnectionMetrics(): Readonly<ConnectionMetrics> {
  return { ...metrics };
}

// ─── Client factory ───────────────────────────────────────────────────────────

export function getSupabaseRealtimeClient(): SupabaseClient | null {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.warn(
      "[Realtime] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY — realtime disabled",
    );
    return null;
  }

  client = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
    realtime: {
      params: { eventsPerSecond: 20 },
      timeout: 20_000,
    },
    global: {
      headers: { "x-application-name": "zeal-admin" },
    },
  });

  setState("connecting");

  return client;
}

// ─── Reconnect with exponential backoff + jitter ──────────────────────────────

function scheduleReconnect(): void {
  if (reconnectTimer) return;
  if (reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
    console.warn("[Realtime] Max reconnect attempts reached");
    setState("disconnected");
    return;
  }

  reconnectAttempt++;
  metrics.reconnects++;

  const base = Math.min(BASE_BACKOFF_MS * Math.pow(2, reconnectAttempt - 1), MAX_BACKOFF_MS);
  const jitter = base * JITTER_FACTOR * (Math.random() * 2 - 1);
  const delay = Math.max(100, Math.round(base + jitter));

  setState("reconnecting");

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (!client) return;
    // Supabase handles internal reconnection; re-subscribe all known channels.
    for (const entry of channels.values()) {
      try { entry.channel.subscribe(); } catch (e) { console.warn("[Realtime] resubscribe failed", e); }
    }
  }, delay);
}

// ─── Broadcast subscription (dedupe by channel + event) ───────────────────────

export function subscribeToChannel<T = unknown>(
  channelName: string,
  eventName: string,
  handler: RealtimeHandler<T>,
): () => void {
  const sb = getSupabaseRealtimeClient();
  if (!sb) return () => {};

  let entry = channels.get(channelName);
  if (!entry) {
    const channel = sb.channel(channelName, {
      config: {
        broadcast: { self: false, ack: false },
        presence: { key: "" },
      },
    });
    entry = { channel, listeners: new Map() };
    channels.set(channelName, entry);
  }

  // Ensure one .on per event — subsequent subscribers share it
  let set = entry.listeners.get(eventName);
  if (!set) {
    set = new Set<RealtimeHandler>();
    entry.listeners.set(eventName, set);

    entry.channel.on("broadcast", { event: eventName }, (payload) => {
      const handlers = entry!.listeners.get(eventName);
      if (!handlers || handlers.size === 0) return;
      for (const fn of handlers) {
        try { (fn as RealtimeHandler)(payload.payload); }
        catch (e) { console.error("[Realtime] handler error on " + channelName + ":" + eventName, e); }
      }
    });
  }
  set.add(handler as RealtimeHandler);

  // Subscribe channel once
  if (!entry.subscribePromise) {
    entry.subscribePromise = new Promise<void>((resolve) => {
      entry!.channel.subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          setState("connected");
          resolve();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn("[Realtime] channel " + channelName + " status: " + status);
          setState("reconnecting");
          scheduleReconnect();
        }
      });
    });
  }

  return () => {
    const e = channels.get(channelName);
    if (!e) return;
    const s = e.listeners.get(eventName);
    if (s) {
      s.delete(handler as RealtimeHandler);
      if (s.size === 0) e.listeners.delete(eventName);
    }
    // Fully unsubscribe when no listeners remain
    if (e.listeners.size === 0) {
      try { e.channel.unsubscribe(); } catch { /* ignore */ }
      channels.delete(channelName);
    }
  };
}

// ─── Postgres changes subscription (RLS-aware) ────────────────────────────────

export function subscribeToPostgresChanges<T = unknown>(
  table: string,
  filter: string,
  handler: RealtimeHandler<T>,
): () => void {
  const sb = getSupabaseRealtimeClient();
  if (!sb) return () => {};

  const channelName = "pg:" + table + ":" + filter;
  const channel = sb
    .channel(channelName)
    .on(
      "postgres_changes" as never,
      { event: "*", schema: "public", table, filter },
      (payload: unknown) => {
        try { handler(payload as T); }
        catch (e) { console.error("[Realtime] pg handler error", e); }
      },
    )
    .subscribe();

  return () => {
    try { channel.unsubscribe(); } catch { /* ignore */ }
  };
}

// ─── Presence ─────────────────────────────────────────────────────────────────

export function subscribeToPresence<T = unknown>(
  channelName: string,
  key: string,
  handler: (state: T) => void,
): () => void {
  const sb = getSupabaseRealtimeClient();
  if (!sb) return () => {};

  const channel = sb.channel(channelName, {
    config: { presence: { key } },
  });

  channel.on("presence", { event: "sync" }, () => {
    try { handler(channel.presenceState() as T); }
    catch (e) { console.error("[Realtime] presence handler error", e); }
  });

  channel.subscribe(async (status: string) => {
    if (status === "SUBSCRIBED") {
      try { await channel.track({ online_at: new Date().toISOString() }); }
      catch (e) { console.warn("[Realtime] presence track failed", e); }
    }
  });

  return () => {
    try { channel.unsubscribe(); } catch { /* ignore */ }
  };
}

// ─── Client-side publish ──────────────────────────────────────────────────────

export async function publishToChannel(
  channelName: string,
  eventName: string,
  data: unknown,
): Promise<boolean> {
  const sb = getSupabaseRealtimeClient();
  if (!sb) return false;

  const channel = sb.channel(channelName);
  await channel.subscribe();
  try {
    const res = await channel.send({ type: "broadcast", event: eventName, payload: data });
    return res === "ok";
  } catch (e) {
    console.warn("[Realtime] publish failed", e);
    return false;
  } finally {
    try { await sb.removeChannel(channel); } catch { /* ignore */ }
  }
}

// ─── Teardown ─────────────────────────────────────────────────────────────────

export function disconnectAllChannels(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  for (const [name, entry] of channels.entries()) {
    try { entry.channel.unsubscribe(); }
    catch (e) { console.warn("[Realtime] unsub " + name + " failed", e); }
  }
  channels.clear();
  setState("disconnected");
}
