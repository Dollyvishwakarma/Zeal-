"use client";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, X, Minimize2, Maximize2 } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  category?: string;
}

const QUICK_PROMPTS = [
  { label: "🔮 Relationship advice", value: "I need relationship advice" },
  { label: "💼 Career guidance", value: "Help me with my career" },
  { label: "🧠 Feeling anxious", value: "I feel anxious and need support" },
  { label: "🌟 Daily horoscope", value: "What's my horoscope today?" },
];

export function ZealChat() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "👋 Hi, I'm Zeal! Tell me what you're looking for, and I'll guide you to the right service." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = { role: "user" as const, content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/zeal/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, history: messages }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response, category: data.category },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "I'm here to help. Please try again or select a quick prompt below." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt);
    setTimeout(() => handleSend(), 100);
  };

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-24 right-4 z-50 p-4 rounded-full bg-gradient-to-r from-[#9D7DC5] to-[#533AFD] text-white shadow-2xl shadow-[#9D7DC5]/30 hover:scale-105 transition-all"
      >
        <Bot className="w-6 h-6" />
      </button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card-3d p-4 space-y-3 relative"
      style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(20px)" }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-full bg-gradient-to-r from-[#9D7DC5] to-[#533AFD]">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-[#5E4B8B] dark:text-white">Zeal AI</span>
          <span className="text-xs text-green-500 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            Online
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setIsExpanded(!isExpanded)} className="p-1 rounded hover:bg-white/20 transition-colors">
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button onClick={() => setIsMinimized(true)} className="p-1 rounded hover:bg-white/20 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className={`${isExpanded ? "h-64" : "h-40"} overflow-y-auto space-y-2 text-sm transition-all duration-300`}>
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`p-2.5 rounded-xl max-w-[85%] ${
              msg.role === "user"
                ? "bg-gradient-to-r from-[#9D7DC5] to-[#533AFD] text-white ml-auto"
                : "bg-[#F4E8F7] dark:bg-gray-800 text-[#5E4B8B] dark:text-white"
            }`}
          >
            {msg.content}
            {msg.category && <div className="mt-1 text-xs opacity-70">💡 Suggested: {msg.category}</div>}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-[#B8A1D9] p-2">
            <span className="w-1.5 h-1.5 bg-[#9D7DC5] rounded-full animate-bounce" />
            <span className="w-1.5 h-1.5 bg-[#9D7DC5] rounded-full animate-bounce delay-75" />
            <span className="w-1.5 h-1.5 bg-[#9D7DC5] rounded-full animate-bounce delay-150" />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {!isExpanded && (
        <div className="flex flex-wrap gap-2">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt.value}
              onClick={() => handleQuickPrompt(prompt.value)}
              className="text-xs px-3 py-1.5 rounded-full glass border border-[#E1C5E7]/30 hover:bg-white/10 transition-colors whitespace-nowrap"
            >
              {prompt.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask Zeal anything..."
          className="flex-1 px-4 py-2.5 rounded-xl glass border border-[#E1C5E7]/30 focus:ring-2 focus:ring-[#9D7DC5] outline-none text-[#5E4B8B] dark:text-white placeholder:text-[#B8A1D9]"
        />
        <button
          onClick={handleSend}
          disabled={loading}
          className="p-2.5 rounded-xl bg-gradient-to-r from-[#9D7DC5] to-[#533AFD] text-white shadow-lg shadow-[#9D7DC5]/25 hover:shadow-xl transition-all disabled:opacity-50"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );
}

// ZEAL_HUB_COMPLETE_APPLIED
