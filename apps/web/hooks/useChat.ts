"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// ZEAL — useChat Hook
// ═══════════════════════════════════════════════════════════════════════════════
// Features:
//   • Initial history fetch
//   • Realtime broadcast subscription (dedupe by id + optimistic reconciliation)
//   • send()         — user-to-user message via /api/chat/[id]/messages
//   • sendToAI()     — streaming AI response via /api/chat/ai/[consultantId]
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from "react";
import { getBrowserClient } from "@zeal/database";

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string | null;
  content: string;
  type: string;
  createdAt: string;
  editedAt?: string | null;
  deletedAt?: string | null;
  metadata?: Record<string, unknown> | null;
  _optimistic?: boolean;
  _streaming?: boolean;
}

interface UseChatOptions {
  conversationId: string | null;
  currentUserId: string;
  pageSize?: number;
}

interface IncomingRecord {
  id?: string;
  conversationId?: string;
  senderId?: string | null;
  content?: string;
  type?: string;
  createdAt?: string;
}

interface UseChatResult {
  messages: ChatMessage[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  send: (content: string) => Promise<void>;
  sendToAI: (
    consultantId: string,
    content: string,
    onDelta: (accumulated: string) => void
  ) => Promise<void>;
  retry: () => void;
}

export function useChat({
  conversationId,
  currentUserId,
  pageSize = 50,
}: UseChatOptions): UseChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(!!conversationId);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const seenIds = useRef<Set<string>>(new Set());
  const supabaseRef = useRef<ReturnType<typeof getBrowserClient> | null>(null);

  if (!supabaseRef.current && typeof window !== "undefined") {
    try { supabaseRef.current = getBrowserClient(); } catch { /* noop */ }
  }

  // ─── Initial fetch ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);
    seenIds.current = new Set();

    fetch(`/api/chat/${conversationId}/messages?limit=${pageSize}`, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: { messages?: ChatMessage[] }) => {
        if (cancelled) return;
        const list = data.messages ?? [];
        list.forEach((m: ChatMessage) => seenIds.current.add(m.id));
        setMessages(list);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load messages");
        }
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
  }, [conversationId, pageSize, reloadKey]);

  // ─── Realtime broadcast ───────────────────────────────────────────────────
  useEffect(() => {
    if (!conversationId) return;
    const supabase = supabaseRef.current;
    if (!supabase) return;

    const channel = supabase
      .channel(`room:${conversationId}:messages`, {
        config: { private: false, broadcast: { self: false } },
      })
      .on("broadcast", { event: "*" }, (payload: unknown) => {
        const record = (payload as { payload?: { record?: IncomingRecord } })?.payload?.record;
        if (!record?.id || !record.content) return;
        if (seenIds.current.has(record.id)) return;
        seenIds.current.add(record.id);

        const incoming: ChatMessage = {
          id: record.id,
          conversationId: record.conversationId ?? conversationId,
          senderId: record.senderId ?? null,
          content: record.content,
          type: record.type ?? "text",
          createdAt: record.createdAt ?? new Date().toISOString(),
        };

        setMessages((prev) => {
          // Remove any optimistic message matching content + sender
          const cleaned = prev.filter(
            (m) =>
              !(
                m._optimistic &&
                m.content === incoming.content &&
                m.senderId === incoming.senderId
              )
          );
          return [...cleaned, incoming].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        });
      })
      .subscribe();

    return () => {
      try { supabase.removeChannel(channel); } catch { /* noop */ }
    };
  }, [conversationId]);

  // ─── send (user-to-user) ──────────────────────────────────────────────────
  const send = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || !conversationId) return;

      const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const optimistic: ChatMessage = {
        id: tempId,
        conversationId,
        senderId: currentUserId,
        content: trimmed,
        type: "text",
        createdAt: new Date().toISOString(),
        _optimistic: true,
      };

      setMessages((prev) => [...prev, optimistic]);
      setIsSending(true);
      setError(null);

      try {
        const res = await fetch(`/api/chat/${conversationId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: trimmed }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error((body as { error?: string })?.error || `HTTP ${res.status}`);
        }
        const { message } = (await res.json()) as { message: ChatMessage };
        if (message?.id) seenIds.current.add(message.id);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId ? { ...message, _optimistic: false } : m
          )
        );
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        const msg = err instanceof Error ? err.message : "Failed to send";
        setError(msg);
        throw err;
      } finally {
        setIsSending(false);
      }
    },
    [conversationId, currentUserId]
  );

  // ─── sendToAI (streaming) ─────────────────────────────────────────────────
  const sendToAI = useCallback(
    async (
      consultantId: string,
      content: string,
      onDelta: (accumulated: string) => void
    ) => {
      const trimmed = content.trim();
      if (!trimmed || !conversationId || !consultantId) return;

      const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const optimistic: ChatMessage = {
        id: tempId,
        conversationId,
        senderId: currentUserId,
        content: trimmed,
        type: "text",
        createdAt: new Date().toISOString(),
        _optimistic: true,
      };

      setMessages((prev) => [...prev, optimistic]);
      setIsSending(true);
      setError(null);

      try {
        const res = await fetch(`/api/chat/ai/${consultantId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId, content: trimmed }),
        });

        if (!res.ok || !res.body) {
          const body = await res.json().catch(() => ({}));
          throw new Error((body as { error?: string })?.error || `HTTP ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data) as {
                choices?: Array<{ delta?: { content?: string } }>;
              };
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                accumulated += delta;
                onDelta(accumulated);
              }
            } catch { /* skip malformed */ }
          }
        }

        // The server persists the AI message; the broadcast will arrive shortly.
        // We do not touch state here — the broadcast handler reconciles.
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        const msg = err instanceof Error ? err.message : "AI chat failed";
        setError(msg);
        throw err;
      } finally {
        setIsSending(false);
      }
    },
    [conversationId, currentUserId]
  );

  const retry = useCallback(() => setReloadKey((k) => k + 1), []);

  return { messages, isLoading, isSending, error, send, sendToAI, retry };
}