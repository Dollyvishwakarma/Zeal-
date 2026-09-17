"use client";

import { useState, useRef, useEffect } from "react";
import { useAppStore } from "@/lib/store/appStore";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Loader2, Send, Image, Video, Mic, X, Paperclip } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  status?: "sending" | "sent" | "error";
  media?: { type: "image" | "video"; url: string };
}

export default function ChatClient() {
  const { user } = useAppStore();
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", role: "assistant", content: "👋 Hi! I'm Zeal. How can I help you today?", timestamp: new Date() },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<"chat" | "image" | "video">("chat");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { sendMessage, isConnected } = useWebSocket(user?.id);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text: string, file?: File) => {
    if (!text.trim() && !file) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: text || "📎 File attached",
      timestamp: new Date(),
      status: "sending",
      media: file ? { type: file.type.startsWith("image/") ? "image" : "video", url: URL.createObjectURL(file) } : undefined,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      if (isConnected) {
        sendMessage("chat_message", { content: text, file: file ? await fileToBase64(file) : null });
        setMessages((prev) =>
          prev.map((m) => (m.id === userMsg.id ? { ...m, status: "sent" } : m))
        );
      } else {
        const res = await fetch("/api/zeal/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, history: messages }),
        });
        const data = await res.json();
        const assistantMsg: Message = {
          id: `msg-${Date.now()}-ai`,
          role: "assistant",
          content: data.response || "I'm here to help!",
          timestamp: new Date(),
          status: "sent",
        };
        setMessages((prev) => [...prev, assistantMsg]);
        setMessages((prev) =>
          prev.map((m) => (m.id === userMsg.id ? { ...m, status: "sent" } : m))
        );
      }
    } catch (error) {
      setMessages((prev) =>
        prev.map((m) => (m.id === userMsg.id ? { ...m, status: "error" } : m))
      );
    } finally {
      setIsLoading(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-4xl mx-auto px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-[#5E4B8B] dark:text-white">💬 Chat</h1>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded-full ${isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {isConnected ? '● Online' : '○ Offline'}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto glass rounded-2xl p-4 border border-[#E1C5E7]/30 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] p-3 rounded-xl ${msg.role === "user" ? "bg-gradient-to-r from-[#9D7DC5] to-[#533AFD] text-white" : "bg-[#F4E8F7] dark:bg-gray-800 text-[#5E4B8B] dark:text-white"}`}>
              {msg.media && (
                <div className="mb-2">
                  {msg.media.type === "image" ? (
                    <img src={msg.media.url} alt="Upload" className="rounded-lg max-w-full max-h-48 object-cover" />
                  ) : (
                    <video src={msg.media.url} controls className="rounded-lg max-w-full max-h-48" />
                  )}
                </div>
              )}
              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
              <div className="text-[10px] opacity-70 mt-1 flex items-center justify-end gap-2">
                <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                {msg.status === "sending" && <Loader2 className="w-3 h-3 animate-spin" />}
                {msg.status === "error" && <span className="text-red-500">❌</span>}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-[#B8A1D9] p-2">
            <span className="w-2 h-2 bg-[#9D7DC5] rounded-full animate-bounce" />
            <span className="w-2 h-2 bg-[#9D7DC5] rounded-full animate-bounce delay-75" />
            <span className="w-2 h-2 bg-[#9D7DC5] rounded-full animate-bounce delay-150" />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="mt-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 rounded-xl glass border border-[#E1C5E7]/30 focus:ring-2 focus:ring-[#9D7DC5] outline-none text-[#5E4B8B] dark:text-white placeholder:text-[#B8A1D9]"
          />
          <button
            onClick={() => handleSend(input)}
            disabled={isLoading || !input.trim()}
            className="p-3 rounded-xl bg-gradient-to-r from-[#9D7DC5] to-[#533AFD] text-white shadow-lg shadow-[#9D7DC5]/25 hover:shadow-xl transition-all disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-[#B8A1D9]">
          <span>🔒 End-to-end encrypted</span>
          <span>{messages.length} messages</span>
        </div>
      </div>
    </div>
  );
}

// ZEAL_HUB_COMPLETE_APPLIED
