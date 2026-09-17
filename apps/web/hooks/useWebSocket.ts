"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// useWebSocket — Legacy compat wrapper
// ─────────────────────────────────────────────────────────────────────────────
// Superseded by `useChat` (Supabase Realtime Broadcast).
// Kept so legacy `/app/(app)/chat/ChatClient.tsx` compiles during migration.
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback } from "react";

export function useWebSocket(_userId?: string) {
  const sendMessage = useCallback((_event: string, _data: unknown) => {
    // No-op — chat is handled by /api/chat/[id]/messages + useChat hook
  }, []);

  return {
    sendMessage,
    isConnected: false,
    reconnect: () => {},
    disconnect: () => {},
  };
}