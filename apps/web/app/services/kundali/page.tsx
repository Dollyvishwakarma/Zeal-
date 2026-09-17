"use client";

// Janam Kundali — uses unified /api/ai?task=kundali

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Orbit, Sparkles, ArrowRight, User, Calendar, Clock, MapPin, Loader2,
} from "lucide-react";

export default function KundaliPage() {
  const [formData, setFormData] = useState({ name: "", dob: "", tob: "", pob: "" });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/ai?task=kundali", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string })?.error || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { analysis?: string };
      setResult(data.analysis ?? "Kundali computation complete.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to compute");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen-app bg-slate-950 text-slate-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#9D7DC5]/10 border border-[#9D7DC5]/20 text-[#9D7DC5] font-medium text-xs uppercase tracking-widest mb-6">
            <Orbit size={14} /> Vedic Ephemeris
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-4">
            Janam Kundali
          </h1>
          <p className="text-slate-400 text-lg">
            Generate your precise Vedic birth chart analysis.
          </p>
        </div>

        {!result ? (
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleSubmit}
            className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8 sm:p-12 shadow-2xl space-y-6"
          >
            {error && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 bg-slate-950 border border-white/10 rounded-2xl focus:border-[#9D7DC5] outline-none text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Date of Birth
                </label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                  <input
                    type="date"
                    required
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 bg-slate-950 border border-white/10 rounded-2xl focus:border-[#9D7DC5] outline-none text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Time of Birth
                </label>
                <div className="relative">
                  <Clock className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                  <input
                    type="time"
                    required
                    value={formData.tob}
                    onChange={(e) => setFormData({ ...formData, tob: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 bg-slate-950 border border-white/10 rounded-2xl focus:border-[#9D7DC5] outline-none text-white"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Place of Birth
              </label>
              <div className="relative">
                <MapPin className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  required
                  value={formData.pob}
                  onChange={(e) => setFormData({ ...formData, pob: e.target.value })}
                  placeholder="City, Country"
                  className="w-full pl-12 pr-4 py-3 bg-slate-950 border border-white/10 rounded-2xl focus:border-[#9D7DC5] outline-none text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-[#9D7DC5] to-[#533AFD] text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:shadow-2xl hover:shadow-[#533AFD]/30 transition-all disabled:opacity-50"
            >
              {loading ? (
                <><Loader2 className="animate-spin" size={20} /> Computing...</>
              ) : (
                <>Compute Janam Kundali <ArrowRight size={18} /></>
              )}
            </button>
          </motion.form>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8 sm:p-12 shadow-2xl"
          >
            <h2 className="text-2xl font-bold text-white mb-2">
              {formData.name}&apos;s Kundali
            </h2>
            <p className="text-slate-500 text-sm mb-6">
              {formData.dob} · {formData.tob} · {formData.pob}
            </p>
            <p className="text-slate-300 leading-relaxed whitespace-pre-line">
              {result}
            </p>
            <button
              onClick={() => setResult(null)}
              className="mt-6 px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-medium hover:bg-white/10 transition-colors text-slate-200"
            >
              Recalculate
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}