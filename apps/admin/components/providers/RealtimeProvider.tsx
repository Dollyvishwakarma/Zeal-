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
import {
  useAdminStore,
  type NotificationType,
  type IncomingAlertType,
  type IncomingAlertData,
} from "@/lib/store/adminStore";
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
  data?: Record<string, unknown>;
}

interface IncomingAlertPayload {
  id?: string;
  type?: IncomingAlertType;
  message?: string;
  data?: IncomingAlertData;
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const profile = useAdminStore((s) => s.profile);
  const addNotification = useAdminStore((s) => s.addNotification);
  const showIncomingAlert = useAdminStore((s) => s.showIncomingAlert);
  const setSocketConnected = useAdminStore((s) => s.setSocketConnected);

  const [connectionState, setConnectionState] = useState<ConnectionState>(
    () => getConnectionState(),
  );
  const seenIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const unsub = onConnectionStateChange(setConnectionState);
    return unsub;
  }, []);

  useEffect(() => {
    setSocketConnected(connectionState === "connected");
  }, [connectionState, setSocketConnected]);

  useEffect(() => {
    if (!profile?.id) return;
    const channel = "user:" + profile.id;

    const unsubNotifications = subscribeToChannel<IncomingNotificationPayload>(
      channel,
      "notification",
      (payload) => {
        if (!payload?.message) return;
        const id = payload.id || ("notif-" + Date.now());
        if (seenIdsRef.current.has(id)) return;
        seenIdsRef.current.add(id);
        if (seenIdsRef.current.size > MAX_SEEN_IDS) {
          const arr = Array.from(seenIdsRef.current);
          seenIdsRef.current = new Set(arr.slice(-TRIM_SEEN_IDS_TO));
        }
        addNotification({
          id,
          type: (payload.type as NotificationType) || "system",
          message: payload.message,
          redirectUrl: payload.redirectUrl ?? null,
          read: false,
          actorId: payload.actorId || "system",
          actorName: payload.actorName ?? null,
          actorAvatar: payload.actorAvatar ?? null,
          data: payload.data,
        });
      },
    );

    const unsubAlerts = subscribeToChannel<IncomingAlertPayload>(
      channel,
      "incoming_alert",
      (payload) => {
        if (!payload?.type || !payload.message) return;
        showIncomingAlert({
          id: payload.id || ("alert-" + Date.now()),
          type: payload.type,
          message: payload.message,
          data: payload.data,
          read: false,
        });
      },
    );

    return () => {
      unsubNotifications();
      unsubAlerts();
    };
  }, [profile?.id, addNotification, showIncomingAlert]);

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
