"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseRealtimeClient } from "@/lib/realtime/supabase-realtime";

export interface AiConsultant {
  id: string;
  name: string;
  username: string;
  avatar: string;
  category: string;
  isPaid: boolean;
  perMinuteRate: number;
  rating: number;
  totalConsultations: number;
  bio: string;
  specialties: string[];
  languages: string[];
  isActive: boolean;
  isFeatured: boolean;
  persona: string | null;
  gender: string | null;
  experience: number;
  sparks: number;
  model: string;
  voiceStyle: string | null;
}

export interface UseAiConsultantsResult {
  consultants: AiConsultant[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  isRealtime: boolean;
}

export function useAiConsultants(category?: string): UseAiConsultantsResult {
  const [consultants, setConsultants] = useState<AiConsultant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRealtime, setIsRealtime] = useState(false);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    try {
      setError(null);
      const url = category
        ? `/api/ai/consultants?category=${encodeURIComponent(category)}`
        : "/api/ai/consultants";
      const res = await fetch(url, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const items: AiConsultant[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
        ? data.items
        : [];
      if (mountedRef.current) setConsultants(items);
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : "Failed to load AI consultants");
      }
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [category]);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  useEffect(() => {
    const sb = getSupabaseRealtimeClient();
    if (!sb) return;

    setIsRealtime(true);
    const channelName = category
      ? `ai-consultants-live:${category}`
      : "ai-consultants-live";

    const channel = sb
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "AIConsultant" },
        (payload) => {
          const { eventType, new: newRow, old: oldRow } = payload;
          if (!mountedRef.current) return;

          if (eventType === "INSERT") {
            const inserted = newRow as AiConsultant;
            if (inserted.isActive) {
              setConsultants((prev) => {
                if (prev.some((c) => c.id === inserted.id)) return prev;
                return [inserted, ...prev];
              });
            }
          } else if (eventType === "UPDATE") {
            const updated = newRow as AiConsultant;
            setConsultants((prev) => {
              const exists = prev.some((c) => c.id === updated.id);
              if (updated.isActive && !exists) return [updated, ...prev];
              if (!updated.isActive && exists)
                return prev.filter((c) => c.id !== updated.id);
              return prev.map((c) => (c.id === updated.id ? updated : c));
            });
          } else if (eventType === "DELETE") {
            const deleted = oldRow as { id: string };
            setConsultants((prev) => prev.filter((c) => c.id !== deleted.id));
          }
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.debug(`[useAiConsultants] Subscribed to ${channelName}`);
        } else if (status === "CHANNEL_ERROR") {
          setIsRealtime(false);
        }
      });

    return () => {
      try { sb.removeChannel(channel); } catch { /* ignore */ }
    };
  }, [category]);

  return { consultants, isLoading, error, refresh: load, isRealtime };
}
