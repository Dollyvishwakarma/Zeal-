"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import { Calendar, Clock, ShieldCheck, Home } from "lucide-react";

export default function ConsultantAvailabilityPage() {
  const [slots, setSlots] = useState([
    { day: "Monday", active: true, time: "09:00 - 17:00" },
    { day: "Tuesday", active: true, time: "09:00 - 17:00" },
    { day: "Wednesday", active: false, time: "Off" }
  ]);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
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
          <h1 className="text-3xl font-bold mb-2">Manage Availability</h1>
          <p className="text-slate-400 font-light mb-8">Configure your active consultation hours for clients.</p>

          <div className="space-y-4 mb-8">
            {slots.map((s, idx) => (
              <div key={s.day} className="flex items-center justify-between p-4 bg-slate-950/50 rounded-2xl border border-white/5">
                <span className="font-medium">{s.day}</span>
                <span className="text-sm text-purple-400">{s.time}</span>
              </div>
            ))}
          </div>

          <button onClick={handleSave} className="px-8 py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-950 rounded-2xl font-bold hover:bg-purple-600 transition-all">
            {saved ? "Saved Successfully!" : "Save Availability"}
          </button>
        </div>
      </div>
    </div>
  );
}
