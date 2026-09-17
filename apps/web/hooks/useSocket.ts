"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// useSocket — Legacy compat wrapper
// ─────────────────────────────────────────────────────────────────────────────
// The original codebase imported a socket.io-like hook. We now use Supabase
// Realtime. This shim maps `.on()` / `.off()` to no-ops so legacy code compiles
// while the migration to `useRealtime` proceeds.
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useRef } from "react";

type Handler = (data: unknown) => void;

interface SocketLike {
  on: (event: string, handler: Handler) => void;
  off: (event: string, handler: Handler) => void;
  emit: (event: string, data: unknown) => void;
}

export function useSocket(): SocketLike | null {
  const listeners = useRef<Map<string, Set<Handler>>>(new Map());

  useEffect(() => {
    // No-op — realtime is handled by Supabase Realtime subscriptions
    return () => {
      listeners.current.clear();
    };
  }, []);

  return {
    on: (event, handler) => {
      const set = listeners.current.get(event) ?? new Set();
      set.add(handler);
      listeners.current.set(event, set);
    },
    off: (event, handler) => {
      listeners.current.get(event)?.delete(handler);
    },
    emit: () => { /* no-op */ },
  };
}