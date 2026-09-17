"use client";

// Tarot — uses unified /api/ai?task=tarot (cached 12h)

import { useState } from "react";
import { motion } from "framer-motion";
import { Layers, Sparkles, RotateCcw, Loader2 } from "lucide-react";

const MAJOR_ARCANA = [
  "The Fool", "The Magician", "The High Priestess", "The Empress",
  "The Emperor", "The Hierophant", "The Lovers", "The Chariot",
  "Strength", "The Hermit", "Wheel of Fortune", "Justice",
  "The Hanged Man", "Death", "Temperance", "The Devil",
  "The Tower", "The Star", "The Moon", "The Sun", "Judgement", "The World",
];

export default function TarotPage() {
  const [drawnCards, setDrawnCards] = useState<string[]>([]);
  const [reading, setReading] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const drawSpread = async () => {
    setLoading(true);
    setReading("");
    setError(null);

    const shuffled = [...MAJOR_ARCANA].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 3);
    setDrawnCards(selected);

    try {
      const res = await fetch("/api/ai?task=tarot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cards: selected }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string })?.error || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { reading?: string };
      setReading(data.reading ?? "Your cards have been drawn.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to interpret");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen-app bg-slate-950 text-slate-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-medium text-xs uppercase tracking-widest mb-6">
          <Layers size={14} /> Arcane Divination
        </div>
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight mb-4">
          Three-Card Tarot
        </h1>
        <p className="text-slate-400 font-light text-lg max-w-2xl mx-auto mb-12">
          Draw your Past, Present, and Future for AI-synthesized interpretation.
        </p>

        {drawnCards.length === 0 ? (
          <button
            onClick={drawSpread}
            disabled={loading}
            className="px-8 py-5 bg-gradient-to-r from-[#9D7DC5] to-[#533AFD] text-white rounded-full font-bold text-lg hover:shadow-2xl hover:shadow-[#533AFD]/30 transition-all inline-flex items-center gap-3 disabled:opacity-50"
          >
            {loading ? (
              <><Loader2 size={22} className="animate-spin" /> Drawing...</>
            ) : (
              <><Sparkles size={22} /> Draw Your Spread</>
            )}
          </button>
        ) : (
          <div className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {drawnCards.map((card, idx) => (
                <motion.div
                  key={card}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.2 }}
                  className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-xl flex flex-col items-center justify-between min-h-[280px]"
                >
                  <span className="text-xs font-bold uppercase tracking-widest text-[#9D7DC5]">
                    {idx === 0 ? "Past Energy" : idx === 1 ? "Present State" : "Future Horizon"}
                  </span>
                  <div className="w-20 h-28 rounded-2xl bg-gradient-to-tr from-[#9D7DC5] to-[#533AFD] text-white flex items-center justify-center font-black text-3xl shadow-lg my-4">
                    {card.charAt(0)}
                  </div>
                  <h3 className="text-xl font-bold text-white">{card}</h3>
                </motion.div>
              ))}
            </div>

            {error && (
              <p className="text-rose-400 text-sm">{error}</p>
            )}

            {loading ? (
              <div className="flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-[#9D7DC5]" />
              </div>
            ) : reading ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8 sm:p-12 max-w-3xl mx-auto text-left"
              >
                <h3 className="text-2xl font-bold mb-4 flex items-center gap-2 text-white">
                  <Sparkles className="text-[#9D7DC5]" /> Esoteric Synthesis
                </h3>
                <p className="text-slate-300 leading-relaxed whitespace-pre-line">
                  {reading}
                </p>
                <button
                  onClick={() => { setDrawnCards([]); setReading(""); }}
                  className="mt-8 px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-medium hover:bg-white/10 transition-colors inline-flex items-center gap-2 text-slate-200"
                >
                  <RotateCcw size={16} /> Draw New Spread
                </button>
              </motion.div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}