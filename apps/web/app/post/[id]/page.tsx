"use client";
export const dynamic = "force-dynamic";

import { useParams } from "next/navigation";
import { MessageSquare, Sparkles, Home } from "lucide-react";

export default function PostDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <button onClick={() => window.location.href = "/"} className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-purple-400 mb-8">
          <Home size={16} /> Return to Cosmos
        </button>

        <div className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-8 sm:p-12 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
              C
            </div>
            <div>
              <h4 className="font-bold">Verified Consultant</h4>
              <p className="text-xs text-slate-400">Cosmos Feed Post #{id}</p>
            </div>
          </div>
          <p className="text-slate-300 leading-relaxed text-lg mb-8 font-light">
            Planetary transits this week bring heightened intuition and structural clarity. Meditate upon your ascendant house to align with these frequencies.
          </p>
          <div className="flex items-center gap-2 text-purple-400 text-sm font-medium">
            <MessageSquare size={16} /> 12 Comments on Transmission
          </div>
        </div>
      </div>
    </div>
  );
}
