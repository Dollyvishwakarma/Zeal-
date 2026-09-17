"use client";

import { useState } from "react";
import { spawnAIPersonaAction } from "@/actions/ai";
import { Sparkles, Bot, Loader2, Link as LinkIcon, Database, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export function AISpawnerClient() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; msg: string; id?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const formData = new FormData(e.currentTarget);
    const res = await spawnAIPersonaAction(formData);

    if (res.success) {
      setResult({ success: true, msg: "AI Persona successfully deployed to the network.", id: res.aiId });
      (e.target as HTMLFormElement).reset();
    } else {
      setResult({ success: false, msg: res.error || "Deployment failed." });
    }
    setLoading(false);
  };

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-purple-500/20 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden flex flex-col">
      <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 blur-[80px] rounded-full pointer-events-none" />
      
      <h3 className="text-xl font-black mb-6 flex items-center gap-3 text-purple-400 relative z-10">
        <Bot size={24} /> Deploy AI Persona
      </h3>

      {result && (
        <div className={`mb-6 p-4 rounded-2xl text-sm font-bold flex flex-col gap-2 border relative z-10 ${result.success ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
          <div className="flex items-center gap-2">
            {result.success ? <CheckCircle2 size={18}/> : <Database size={18}/>} 
            {result.msg}
          </div>
          {result.success && result.id && (
            <Link href={`/consultant/${result.id}`} className="text-white underline text-xs ml-6">
              View Public Profile →
            </Link>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Persona Name</label>
            <input name="name" type="text" required placeholder="e.g. Aacharya Dev" className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-2xl text-sm focus:border-purple-500 outline-none text-slate-200" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Expertise Domain</label>
            <select name="expertise" required className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-2xl text-sm focus:border-purple-500 outline-none text-slate-200 appearance-none">
              <option value="Vedic Astrology">Vedic Astrology</option>
              <option value="Tarot Reading">Tarot Reading</option>
              <option value="Numerology">Numerology</option>
              <option value="Vastu Shastra">Vastu Shastra</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Avatar URL (Optional)</label>
          <div className="relative">
            <LinkIcon size={16} className="absolute left-4 top-3.5 text-slate-500" />
            <input name="avatarUrl" type="url" placeholder="https://example.com/avatar.png" className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-white/10 rounded-2xl text-sm focus:border-purple-500 outline-none text-slate-200" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">System Prompt (LLM Instructions)</label>
          <textarea 
            name="systemPrompt" 
            required 
            rows={4}
            placeholder="You are Aacharya Dev, a strict and highly analytical Vedic Astrologer. You speak using ancient Sanskrit terminology..." 
            className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-2xl text-sm focus:border-purple-500 outline-none text-slate-200 resize-none font-mono text-xs"
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-bold text-sm shadow-xl shadow-purple-600/20 transition-all flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : "Deploy to Network"} <Sparkles size={16} />
        </button>
      </form>
    </div>
  );
}
