"use client";

import { useEffect, useRef } from "react";
import {
  useRealtimeContext,
} from "@/components/providers/RealtimeProvider";
import type { ConnectionState } from "@/lib/realtime/supabase-realtime";

/**
 * Subscribe to a realtime channel event.
 * Handler is stored in a ref so changing it does not re-subscribe.
 */
export function useRealtime<T = unknown>(
  channel: string | null,
  event: string,
  handler: (data: T) => void,
): void {
  const { subscribe } = useRealtimeContext();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!channel) return;
    const unsub = subscribe<T>(channel, event, (data) => handlerRef.current(data));
    return unsub;
  }, [channel, event, subscribe]);
}

export interface RealtimeConnectionInfo {
  isConnected: boolean;
  connectionState: ConnectionState;
}

export function useRealtimeConnection(): RealtimeConnectionInfo {
  const { isConnected, connectionState } = useRealtimeContext();
  return { isConnected, connectionState };
}
