"use client";

import { useEffect, useState } from "react";
import { createClient } from "@zeal/database";

/**
 * Enterprise Hook: Subscribes directly to the PostgreSQL logical replication stream.
 * Automatically animates the Sparks score in the UI without API polling.
 */
export function useRealtimeSparks(userId: string, initialSparks: number) {
  const [sparks, setSparks] = useState(initialSparks);
  const supabase = createClient();

  useEffect(() => {
    if (!userId) return;

    setSparks(initialSparks);

    const channel = supabase
      .channel(`sparks-sync-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "User",
          filter: `id=eq.${userId}`,
        },
        (payload: any) => {
          const newSparks = (payload.new as any).sparks;
          if (typeof newSparks === "number" && newSparks !== sparks) {
            setSparks(newSparks);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, initialSparks, supabase]);

  return sparks;
}
