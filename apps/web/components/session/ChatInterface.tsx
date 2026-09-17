"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// ZEAL — Chat Interface
// ═══════════════════════════════════════════════════════════════════════════════
// Handles both human↔human and human↔AI conversations.
//   • Human partner: send via /api/chat/[id]/messages
//   • AI partner:    sendToAI (streams tokens) via /api/chat/ai/[consultantId]
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { useChat, type ChatMessage } from "@/hooks/useChat";
import { useTyping } from "@/hooks/useTyping";
import { cn } from "@zeal/ui";

interface ChatInterfaceProps {
  conversationId: string;
  currentUserId: string;
  partnerId: string;
  partnerName: string;
  partnerAvatar?: string | null;
  isAI?: boolean;
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function ChatInterface({
  conversationId,
  currentUserId,
  partnerId,
  partnerName,
  partnerAvatar,
  isAI = false,
}: ChatInterfaceProps) {
  const router = useRouter();
  const { messages, isLoading, isSending, send, sendToAI } = useChat({
    conversationId,
    currentUserId,
  });
  const { typingUsers, setTyping } = useTyping(conversationId, currentUserId);

  const [input, setInput] = useState("");
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, streamingText, typingUsers.size]);

  useEffect(() => {
    void fetch(`/api/chat/${conversationId}/read`, { method: "POST" }).catch(() => {});
  }, [conversationId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isSending) return;
    setInput("");
    setTyping(false);

    try {
      if (isAI) {
        setStreamingText("");
        await sendToAI(partnerId, text, (acc) => setStreamingText(acc));
        setStreamingText(null);
      } else {
        await send(text);
      }
    } catch {
      setInput(text);
      setStreamingText(null);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (!isAI) setTyping(e.target.value.length > 0);
  };

  const showTyping = !isAI && typingUsers.size > 0;
  const showStreaming = isAI && streamingText !== null;

  return (
    <div className="flex flex-col h-full bg-slate-950 relative">
      {/* Header */}
      <div className="flex-none h-16 bg-slate-900/80 backdrop-blur-2xl border-b border-white/10 px-3 md:px-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <button
            onClick={() => router.push("/chat")}
            className="md:hidden p-2 -ml-1 rounded-lg hover:bg-white/5 active:scale-95"
            aria-label="Back to inbox"
          >
            <ArrowLeft size={18} className="text-white" />
          </button>
          <div className="relative w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-black text-white overflow-hidden shrink-0">
            {partnerAvatar ? (
              <img src={partnerAvatar} alt={partnerName} className="w-full h-full object-cover" />
            ) : (
              partnerName.charAt(0).toUpperCase()
            )}
            {isAI && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gradient-to-r from-[#9D7DC5] to-[#533AFD] text-[8px] flex items-center justify-center">
                AI
              </span>
            )}
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-white text-sm flex items-center gap-2 truncate">
              {partnerName}
              {isAI && <Sparkles size={13} className="text-[#9D7DC5] shrink-0" />}
            </h2>
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold">
              {showTyping ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#9D7DC5] animate-pulse" />
                  typing...
                </>
              ) : (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {isAI ? "AI · 24/7" : "Secure Session"}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 md:px-4 py-4 space-y-4 custom-scrollbar">
        <div className="text-center pb-6 border-b border-white/5">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#9D7DC5]/10 border border-[#9D7DC5]/20 text-[#9D7DC5] text-xs font-bold rounded-full mb-2">
            <ShieldCheck size={14} /> Encrypted Session
          </div>
          <p className="text-slate-500 text-[11px]">
            {isAI ? "AI consultant ready." : "Your session has begun."}
          </p>
        </div>

        {isLoading && messages.length === 0 ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-[#9D7DC5]" />
          </div>
        ) : (
          messages.map((msg: ChatMessage) => {
            const isMe = msg.senderId === currentUserId;
            return (
              <div key={msg.id} className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                <div
                  className={cn(
                    "max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-lg break-words",
                    isMe
                      ? "bg-gradient-to-br from-[#9D7DC5] to-[#533AFD] text-white rounded-br-sm"
                      : "bg-slate-800 text-slate-200 border border-white/5 rounded-bl-sm",
                    msg._optimistic && "opacity-70"
                  )}
                >
                  {msg.content}
                </div>
                <span className="text-[10px] text-slate-600 mt-1 px-1 font-medium">
                  {formatTime(msg.createdAt)}
                </span>
              </div>
            );
          })
        )}

        {showStreaming && (
          <div className="flex flex-col items-start">
            <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-bl-sm bg-slate-800 text-slate-200 border border-white/5 text-sm leading-relaxed">
              {streamingText}
              <span className="inline-block w-1.5 h-4 ml-1 bg-[#9D7DC5] animate-pulse align-middle" />
            </div>
          </div>
        )}

        {showTyping && (
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/60 border border-white/5 rounded-2xl w-max">
            <div className="w-1.5 h-1.5 bg-[#9D7DC5] rounded-full animate-bounce" />
            <div className="w-1.5 h-1.5 bg-[#9D7DC5] rounded-full animate-bounce [animation-delay:150ms]" />
            <div className="w-1.5 h-1.5 bg-[#9D7DC5] rounded-full animate-bounce [animation-delay:300ms]" />
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        className="flex-none p-3 md:p-4 bg-slate-950/90 backdrop-blur-3xl border-t border-white/10"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
      >
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex items-center gap-2 md:gap-3">
          <input
            type="text"
            value={input}
            onChange={handleChange}
            onBlur={() => !isAI && setTyping(false)}
            placeholder={isAI ? `Message ${partnerName}...` : "Type your message..."}
            maxLength={4000}
            className="flex-1 bg-slate-900 border border-white/10 rounded-full px-5 py-3.5 text-sm focus:outline-none focus:border-[#9D7DC5] text-slate-200 shadow-inner placeholder:text-slate-500"
          />
          <button
            type="submit"
            disabled={!input.trim() || isSending || showStreaming}
            aria-label="Send"
            className={cn(
              "w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all shrink-0",
              input.trim() && !isSending && !showStreaming
                ? "bg-gradient-to-br from-[#9D7DC5] to-[#533AFD] text-white shadow-[0_0_15px_rgba(157,125,197,0.3)] active:scale-95"
                : "bg-slate-800 text-slate-500 cursor-not-allowed"
            )}
          >
            {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="ml-0.5" />}
          </button>
        </form>
      </div>
    </div>
  );
}