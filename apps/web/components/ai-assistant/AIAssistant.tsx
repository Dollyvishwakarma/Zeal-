"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Sparkles, Zap, Loader2 } from "lucide-react";
import { Button, Input, Badge } from "@zeal/ui";

interface AIAssistantProps {
  astrologerId: string;
  onReplySuggestion: (suggestion: string) => void;
  onAutoReply: (message: string) => void;
}

export function AIAssistant({ astrologerId, onReplySuggestion, onAutoReply }: AIAssistantProps) {
  const [query, setQuery] = React.useState("");
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [isEnabled, setIsEnabled] = React.useState(true);

  const generateSuggestions = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      // In production: call /api/ai/assist with Zhipu/Agnes
      const res = await fetch("/api/ai/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, astrologerId }),
      });
      const data = await res.json();
      setSuggestions(data.suggestions || [
        "Thank you for your question. Let me analyze your birth chart.",
        "That's an interesting concern. Here's what I see in your chart.",
        "Based on your planetary positions, I would suggest...",
      ]);
    } catch {
      // Fallback suggestions
      setSuggestions([
        "Let me look into that for you.",
        "I'll check your chart and get back to you.",
        "That's a great question. Let me think about it.",
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    onReplySuggestion(suggestion);
    setQuery("");
    setSuggestions([]);
  };

  const handleAutoReplyToggle = () => {
    setIsEnabled(!isEnabled);
    if (!isEnabled) {
      // Auto-reply mode on: AI will reply to user messages automatically
      onAutoReply("AI assistant is now active. I'll help you with your responses.");
    }
  };

  return (
    <div className="bg-[#F4E8F7] dark:bg-gray-800 rounded-xl border border-[#E1C5E7] dark:border-gray-700 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#9D7DC5]" />
          <span className="font-semibold text-[#5E4B8B] dark:text-white">AI Assistant</span>
          <Badge variant={isEnabled ? "success" : "secondary"} className="text-xs">
            {isEnabled ? "Active" : "Paused"}
          </Badge>
        </div>
        <Button variant="secondary" size="sm" onClick={handleAutoReplyToggle}>
          {isEnabled ? "Pause" : "Resume"}
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Input
          placeholder="Ask for response suggestions..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1"
        />
        <Button variant="primary" size="sm" onClick={generateSuggestions} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
        </Button>
      </div>

      {suggestions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-1"
        >
          <p className="text-xs text-[#B8A1D9] dark:text-gray-400">Suggested replies:</p>
          {suggestions.map((suggestion, idx) => (
            <button
              key={idx}
              onClick={() => handleSuggestionClick(suggestion)}
              className="block w-full text-left p-2 rounded-lg hover:bg-[#E1C5E7] dark:hover:bg-gray-700 transition-colors text-sm text-[#5E4B8B] dark:text-white"
            >
              {suggestion}
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
}
