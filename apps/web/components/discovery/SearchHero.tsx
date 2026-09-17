"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// ZEAL — AI Search Hero
// Premium glassmorphism search with debounced AI intent detection + results
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, Sparkles, Loader2, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const QUICK_PROMPTS = [
  { label: "💼 Career anxiety", value: "I'm feeling anxious about my career" },
  { label: "💕 Relationship", value: "I need relationship guidance" },
  { label: "🌟 Kundali", value: "I want my birth chart read" },
  { label: "🔮 Tarot", value: "I want a tarot reading" },
  { label: "🧘 Healing", value: "I need energy healing" },
];

interface ConsultantCard {
  id: string;
  category: string;
  rating: number;
  "sparkScore": number;
  "perMinuteRate": number;
  user: {
    id: string;
    name: string | null;
    username: string;
    avatar: string | null;
    is_online: boolean;
  };
}

interface SearchResponse {
  intent: {
    categoryId: string;
    categoryName: string;
    confidence: number;
    mood: string | null;
  };
  consultants: ConsultantCard[];
  totalMatches: number;
  cached: boolean;
}

export function SearchHero() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);

    if (!query || query.trim().length < 3) {
      setResult(null);
      setError(null);
      return;
    }

    timerRef.current = window.setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/ai?task=search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
          signal: ctrl.signal,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error ?? `HTTP ${res.status}`);
        }

        setResult(await res.json());
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError(err instanceof Error ? err.message : "Search failed");
        }
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [query]);

  return (
    <div className="relative overflow-hidden rounded-3xl bg-slate-900/60 backdrop-blur-xl border border-white/10 p-6 md:p-10 mb-10">
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#9D7DC5]/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#533AFD]/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#9D7DC5]/10 border border-[#9D7DC5]/20 text-[#9D7DC5] text-xs font-bold mb-4">
          <Sparkles size={14} /> Ask Zeal
        </div>

        <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-3">
          Find the right guide.
        </h1>
        <p className="text-slate-400 mb-6 max-w-xl">
          Describe what you need. We&apos;ll match you with the right tradition, service, and consultant.
        </p>

        <div className="relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="I'm feeling anxious about..."
            className="w-full pl-14 pr-14 py-5 bg-slate-950/80 border border-white/10 rounded-2xl text-base text-white placeholder:text-slate-500 focus:border-[#9D7DC5] outline-none transition-all"
          />
          {loading && (
            <Loader2 className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9D7DC5] animate-spin" />
          )}
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p.value}
              onClick={() => setQuery(p.value)}
              className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white transition-all"
            >
              {p.label}
            </button>
          ))}
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm"
            >
              {error}
            </motion.div>
          )}

          {result && !error && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6 p-5 bg-slate-950/60 border border-[#9D7DC5]/20 rounded-2xl"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold uppercase tracking-wider text-[#9D7DC5]">
                  Matched · {result.intent.categoryName}
                </p>
                <span className="text-xs text-slate-500">
                  {Math.round(result.intent.confidence * 100)}% confidence
                  {result.cached && " · cached"}
                </span>
              </div>

              <p className="text-sm text-slate-300 mb-4">
                {result.totalMatches} consultant{result.totalMatches !== 1 ? "s" : ""} ready to help
              </p>

              {result.consultants.length > 0 && (
                <div className="flex items-center gap-3 mb-4">
                  {result.consultants.slice(0, 4).map((c) => (
                    <div key={c.id} className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-800 overflow-hidden flex-shrink-0">
                        {c.user.avatar ? (
                          <img src={c.user.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white">
                            {(c.user.name ?? "?").charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <span className="text-xs text-slate-500">
                    {result.consultants.length > 4 ? `+${result.consultants.length - 4} more` : "top matches"}
                  </span>
                </div>
              )}

              <Link
                href={`/services/${result.intent.categoryId}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#9D7DC5] to-[#533AFD] text-white rounded-xl text-sm font-medium hover:shadow-lg hover:shadow-[#533AFD]/30 transition-all"
              >
                View {result.intent.categoryName} <ArrowRight size={14} />
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}