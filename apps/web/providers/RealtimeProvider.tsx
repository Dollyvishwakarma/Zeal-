"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@zeal/database";
import { RealtimeChannel } from "@supabase/supabase-js";
import { toast } from "sonner";

type ConnectionState = "CONNECTING" | "SUBSCRIBED" | "DISCONNECTED" | "ERROR";

interface RealtimeContextType {
  status: ConnectionState;
  subscribeToTable: (
    table: string, 
    filter: string, 
    callback: (payload: any) => void
  ) => RealtimeChannel | null;
}

const RealtimeContext = createContext<RealtimeContextType>({
  status: "DISCONNECTED",
  subscribeToTable: () => null,
});

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<ConnectionState>("CONNECTING");
  const supabase = createClient();

  useEffect(() => {
    // Ping Supabase to ensure connection health
    const healthCheck = supabase.channel('system-health')
      .on('system', { event: '*' }, () => setStatus("SUBSCRIBED"))
      .subscribe((evt: string) => {
        if (evt === 'SUBSCRIBED') setStatus("SUBSCRIBED");
        if (evt === 'CHANNEL_ERROR') setStatus("ERROR");
        if (evt === 'CLOSED') setStatus("DISCONNECTED");
      });

    return () => {
      supabase.removeChannel(healthCheck);
    };
  }, [supabase]);

  // Unified multiplexing function
  const subscribeToTable = (table: string, filter: string, callback: (payload: any) => void) => {
    if (status === "ERROR") {
      toast.error("Real-time connection lost. Reconnecting...");
    }

    const channel = supabase
      .channel(`public:${table}:${filter}`)
      .on("postgres_changes", { event: "*", schema: "public", table, filter }, callback)
      .subscribe((evt: string) => {
        if (evt === 'CHANNEL_ERROR') {
          console.error(`Failed to subscribe to ${table}`);
        }
      });

    return channel;
  };

  return (
    <RealtimeContext.Provider value={{ status, subscribeToTable }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export const useZealRealtime = () => useContext(RealtimeContext);
