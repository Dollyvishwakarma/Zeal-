"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// useSparks — Real-time spark counter (aggregate social proof)
// Sparks = cheers + comments + follows on your content
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from "react";
import { getBrowserClient } from "@zeal/database";

export function useSparks(userId: string | null, initialSparks = 0) {
  const [sparks, setSparks] = useState(initialSparks);
  const [lastDelta, setLastDelta] = useState<number | null>(null);
  const supabaseRef = useRef<ReturnType<typeof getBrowserClient> | null>(null);
  const deltaTimerRef = useRef<number | null>(null);

  if (!supabaseRef.current && typeof window !== "undefined") {
    try { supabaseRef.current = getBrowserClient(); } catch { /* ignore */ }
  }

  useEffect(() => {
    if (!userId) return;
    setSparks(initialSparks);

    const supabase = supabaseRef.current;
    if (!supabase) return;

    const channel = supabase
      .channel(`consultant:${userId}:sparks`)
      .on("broadcast", { event: "*" }, (payload: any) => {
        const data = payload.payload as {
          sparks?: number;
          sparkScore?: number;
          delta?: number;
          record?: { sparks?: number; sparkScore?: number };
        };
        const next = data?.sparks ?? data?.sparkScore
          ?? data?.record?.sparks ?? data?.record?.sparkScore;
        if (typeof next === "number") {
          setSparks((prev) => {
            const delta = next - prev;
            if (delta !== 0) {
              setLastDelta(delta);
              if (deltaTimerRef.current) window.clearTimeout(deltaTimerRef.current);
              deltaTimerRef.current = window.setTimeout(() => setLastDelta(null), 4000);
            }
            return next;
          });
        }
      })
      .subscribe();

    return () => {
      if (deltaTimerRef.current) window.clearTimeout(deltaTimerRef.current);
      try { supabase.removeChannel(channel); } catch { /* ignore */ }
    };
  }, [userId, initialSparks]);

  return { sparks, lastDelta, setSparks };
}