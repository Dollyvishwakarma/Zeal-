"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// Admin Query Provider
// Wraps @tanstack/react-query with sensible defaults for the admin dashboard:
//   • 30s stale time
//   • Single retry
//   • Refetch on reconnect
// ═══════════════════════════════════════════════════════════════════════════════

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
          },
          mutations: {
            retry: 0,
          },
        },
      })
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}