"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Megaphone, Loader2, Check } from "lucide-react";

const SEGMENTS = [
  { value: "all", label: "Everyone" },
  { value: "users", label: "Users only" },
  { value: "consultants", label: "Consultants only" },
];

export default function AdminBroadcastPage() {
  const [message, setMessage] = useState("");
  const [segment, setSegment] = useState("all");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    setResult(null);

    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim(), segment }),
      });

      if (!res.ok) {
        throw new Error("Broadcast failed");
      }

      const data = await res.json();
      setResult(`Sent to ${data.sent} recipient${data.sent !== 1 ? "s" : ""}`);
      setMessage("");
    } catch (err) {
      setResult("Failed to send broadcast");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-[#5E4B8B] dark:text-white flex items-center gap-2">
        <Megaphone className="w-6 h-6 text-[#9D7DC5]" /> Broadcast
      </h1>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card-3d p-5 space-y-4"
      >
        <div>
          <label className="block text-sm font-medium text-[#5E4B8B] dark:text-white mb-1">
            Message
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            maxLength={500}
            placeholder="Type your announcement..."
            className="w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-900 border border-[#E1C5E7] dark:border-gray-700 text-[#5E4B8B] dark:text-white resize-none"
          />
          <p className="text-xs text-[#B8A1D9] mt-1">
            {message.length}/500 characters
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#5E4B8B] dark:text-white mb-2">
            Send to
          </label>
          <div className="grid grid-cols-3 gap-2">
            {SEGMENTS.map((s) => (
              <button
                key={s.value}
                onClick={() => setSegment(s.value)}
                className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                  segment === s.value
                    ? "bg-gradient-to-r from-[#9D7DC5] to-[#533AFD] text-white shadow-lg"
                    : "bg-white dark:bg-gray-900 border border-[#E1C5E7] dark:border-gray-700 text-[#5E4B8B] dark:text-white"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSend}
          disabled={sending || !message.trim()}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#9D7DC5] to-[#533AFD] text-white font-medium shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {sending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Sending...
            </>
          ) : (
            <>
              <Megaphone className="w-4 h-4" /> Send Broadcast
            </>
          )}
        </motion.button>

        {result && (
          <p className={`text-sm text-center ${result.includes("Sent") ? "text-green-600" : "text-red-500"}`}>
            {result}
          </p>
        )}
      </motion.div>
    </div>
  );
}

// BATCH_F3_APPLIED
