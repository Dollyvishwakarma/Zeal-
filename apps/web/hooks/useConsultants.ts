"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseRealtimeClient } from "@/lib/realtime/supabase-realtime";

export interface Consultant {
  id: string;
  userId: string;
  name: string;
  username: string;
  avatar: string;
  bio: string;
  category: string;
  isVerified: boolean;
  isOnline: boolean;
  perMinuteRate: number;
  rating: number;
  totalConsultations: number;
  languages: string[];
  specialties: string[];
  faith: string;
  subdomain: string | null;
  chatRate: number | null;
  audioRate: number | null;
  videoRate: number | null;
}

interface UseConsultantsResult {
  consultants: Consultant[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useConsultants(category?: string): UseConsultantsResult {
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    try {
      setError(null);
      const url = category
        ? `/api/explore/consultants?category=${encodeURIComponent(category)}`
        : "/api/explore/consultants";

      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const items: Consultant[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
        ? data.items
        : [];

      if (mountedRef.current) setConsultants(items);
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : "Failed to load consultants");
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

  // Realtime: refresh on any Consultant table change
  useEffect(() => {
    const sb = getSupabaseRealtimeClient();
    if (!sb) return;

    const channel = sb
      .channel(`consultants-live:${category || "all"}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "Consultant",
        },
        () => {
          // Simplest correct behavior: refetch the list on any change
          load();
        },
      )
      .subscribe();

    return () => {
      try { sb.removeChannel(channel); } catch { /* ignore */ }
    };
  }, [load, category]);

  return { consultants, isLoading, error, refresh: load };
}
