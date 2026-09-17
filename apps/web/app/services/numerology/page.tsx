"use client";

// Numerology — uses unified /api/ai?task=numerology (cached 24h)

import { useState } from "react";
import { motion } from "framer-motion";
import { Hash, Sparkles, Loader2 } from "lucide-react";

export default function NumerologyPage() {
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai?task=numerology", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, dob }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string })?.error || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { analysis?: string };
      setAnalysis(data.analysis ?? "Computation complete.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen-app bg-slate-950 text-slate-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <Hash className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-4xl font-black mb-2">Destiny Numerology</h1>
          <p className="text-slate-400">Calculate life path and karmic frequency cycles.</p>
        </div>

        {!analysis ? (
          <form
            onSubmit={handleSubmit}
            className="bg-slate-900/60 backdrop-blur-xl border border-white/10 p-8 sm:p-12 rounded-3xl shadow-2xl space-y-6"
          >
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-2xl outline-none text-white focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Birth Date
              </label>
              <input
                type="date"
                required
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-2xl outline-none text-white focus:border-amber-500"
              />
            </div>

            {error && <p className="text-rose-400 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-amber-500 text-slate-950 rounded-2xl font-bold hover:bg-amber-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : "Compute Profile"}
            </button>
          </form>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/60 backdrop-blur-xl border border-white/10 p-8 sm:p-12 rounded-3xl shadow-2xl space-y-6"
          >
            <h3 className="text-2xl font-bold flex items-center gap-2 text-white">
              <Sparkles className="text-amber-500" /> {fullName}&apos;s Matrix
            </h3>
            <p className="text-slate-300 font-light leading-relaxed whitespace-pre-line">
              {analysis}
            </p>
            <button
              onClick={() => setAnalysis("")}
              className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-medium hover:bg-white/10 transition-colors text-slate-200"
            >
              Calculate Another
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}