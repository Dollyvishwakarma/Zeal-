"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import { Home } from "lucide-react";

export default function ConsultantSettingsPage() {
  const [name, setName] = useState("Acharya Rajesh");
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => window.location.href = "/consultant/dashboard"} className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-purple-400 mb-8">
          <Home size={16} /> Back to Dashboard
        </button>

        <div className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-8 sm:p-12 shadow-2xl">
          <h1 className="text-3xl font-bold mb-2">Consultant Settings</h1>
          <p className="text-slate-400 font-light mb-8">Update your public practice profile.</p>

          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Display Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-2xl outline-none text-white" />
            </div>
            <button type="submit" className="px-8 py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-950 rounded-2xl font-bold">
              {saved ? "Saved Changes!" : "Save Profile"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
