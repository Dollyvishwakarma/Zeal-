"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAppStore, type Notification } from "@/lib/store/appStore";
import {
  subscribeToChannel,
  disconnectAllChannels,
  onConnectionStateChange,
  getConnectionState,
  type ConnectionState,
} from "@/lib/realtime/supabase-realtime";

interface RealtimeContextValue {
  subscribe: <T = unknown>(
    channel: string,
    event: string,
    handler: (data: T) => void,
  ) => () => void;
  connectionState: ConnectionState;
  isConnected: boolean;
}

const RealtimeContext = createContext<RealtimeContextValue>({
  subscribe: () => () => {},
  connectionState: "disconnected",
  isConnected: false,
});

export const useRealtimeContext = (): RealtimeContextValue =>
  useContext(RealtimeContext);

const MAX_SEEN_IDS = 500;
const TRIM_SEEN_IDS_TO = 250;

interface IncomingNotificationPayload {
  id?: string;
  type?: string;
  message?: string;
  redirectUrl?: string | null;
  actorId?: string;
  actorName?: string | null;
  actorAvatar?: string | null;
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const user = useAppStore((s) => s.user);
  const setWallet = useAppStore((s) => s.setWallet);
  const addNotification = useAppStore((s) => s.addNotification);

  const [connectionState, setConnectionState] = useState<ConnectionState>(
    () => getConnectionState(),
  );
  const seenIdsRef = useRef<Set<string>>(new Set());

  // Track connection lifecycle
  useEffect(() => {
    const unsub = onConnectionStateChange(setConnectionState);
    return unsub;
  }, []);

  // User-scoped subscriptions (one per channel)
  useEffect(() => {
    if (!user?.id) return;
    const channel = `user:${user.id}`;

    const unsubNotifications = subscribeToChannel<IncomingNotificationPayload>(
      channel,
      "notification",
      (payload) => {
        if (!payload?.message) return;
        const id = payload.id || `notif-${Date.now()}`;
        if (seenIdsRef.current.has(id)) return;
        seenIdsRef.current.add(id);
        if (seenIdsRef.current.size > MAX_SEEN_IDS) {
          const arr = Array.from(seenIdsRef.current);
          seenIdsRef.current = new Set(arr.slice(-TRIM_SEEN_IDS_TO));
        }
        addNotification({
          id,
          type: (payload.type as Notification["type"]) || "system",
          message: payload.message,
          redirectUrl: payload.redirectUrl ?? null,
          read: false,
          actorId: payload.actorId || "system",
          actorName: payload.actorName ?? undefined,
          actorAvatar: payload.actorAvatar ?? undefined,
        });
      },
    );

    const unsubWallet = subscribeToChannel<{ balance?: number }>(
      channel,
      "wallet:updated",
      (payload) => {
        if (typeof payload?.balance === "number") {
          setWallet({ balance: payload.balance } as never);
        }
      },
    );

    return () => {
      unsubNotifications();
      unsubWallet();
    };
  }, [user?.id, setWallet, addNotification]);

  // Full teardown on unmount
  useEffect(() => {
    return () => { disconnectAllChannels(); };
  }, []);

  const subscribe = useCallback(
    <T,>(channel: string, event: string, handler: (data: T) => void) =>
      subscribeToChannel<T>(channel, event, handler),
    [],
  );

  return (
    <RealtimeContext.Provider
      value={{
        subscribe,
        connectionState,
        isConnected: connectionState === "connected",
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
}
