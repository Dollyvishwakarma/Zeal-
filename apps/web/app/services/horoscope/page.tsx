"use client";

// Horoscope — uses unified /api/ai?task=horoscope (cached 6h)

import { useState } from "react";
import { motion } from "framer-motion";
import { Star, Sparkles, Loader2 } from "lucide-react";

const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

export default function HoroscopePage() {
  const [selectedSign, setSelectedSign] = useState("Aries");
  const [reading, setReading] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHoroscope = async (sign: string) => {
    setSelectedSign(sign);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai?task=horoscope", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sign }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string })?.error || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { reading?: string };
      setReading(data.reading ?? "No reading available.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen-app bg-slate-950 text-slate-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-medium text-xs uppercase tracking-widest mb-6">
          <Star size={14} /> Daily Transit Forecast
        </div>
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight mb-4">
          Daily Horoscope
        </h1>
        <p className="text-slate-400 font-light text-lg mb-12">
          Select your zodiac sign for real-time transit guidance.
        </p>

        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-10">
          {SIGNS.map((sign) => (
            <button
              key={sign}
              onClick={() => fetchHoroscope(sign)}
              disabled={loading}
              className={`py-3.5 rounded-2xl font-bold text-sm transition-all border ${
                selectedSign === sign
                  ? "bg-gradient-to-r from-[#9D7DC5] to-[#533AFD] text-white border-[#9D7DC5] shadow-lg"
                  : "bg-slate-900/60 border-white/10 text-slate-300 hover:border-[#9D7DC5]/50"
              }`}
            >
              {sign}
            </button>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8 sm:p-12 text-left"
        >
          <h3 className="text-2xl font-bold mb-4 flex items-center gap-2 text-white">
            <Sparkles className="text-[#9D7DC5]" /> {selectedSign} Forecast
          </h3>

          {loading ? (
            <div className="flex items-center gap-3 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              Computing planetary degrees...
            </div>
          ) : error ? (
            <p className="text-rose-400 text-sm">{error}</p>
          ) : (
            <p className="text-slate-300 leading-relaxed whitespace-pre-line">
              {reading || "Click a sign above to load your forecast."}
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
}