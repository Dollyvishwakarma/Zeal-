"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { createBrowserClient } from "@supabase/ssr";
import { Calendar, Clock, ShieldCheck, ArrowRight, Home, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function BookingPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate secure transaction & booking insert
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 py-16 px-4 sm:px-6 lg:px-8 transition-colors duration-500 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-200 dark:bg-purple-600/10 blur-[150px] rounded-full pointer-events-none -z-10" />
      <div className="max-w-3xl mx-auto relative z-10">
        <button onClick={() => window.location.href = "/"} className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-purple-600 dark:text-slate-400 mb-6 transition-colors">
          <Home size={16} /> Return to Cosmos
        </button>

        <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-8 sm:p-12 shadow-2xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 font-medium text-xs uppercase tracking-widest mb-4">
            <Calendar size={14} /> Secure Consultation Booking
          </div>
          <h1 className="text-3xl sm:text-4xl font-medium tracking-tight mb-2">Schedule Master Session</h1>
          <p className="text-slate-600 dark:text-slate-400 font-light mb-8">Select your preferred date and encrypted time slot for live guidance.</p>

          {success ? (
            <div className="text-center py-12 space-y-4">
              <CheckCircle2 size={64} className="mx-auto text-emerald-500" />
              <h3 className="text-2xl font-bold">Booking Confirmed</h3>
              <p className="text-slate-400">Your session has been securely scheduled. Check your dashboard for room access.</p>
              <button onClick={() => window.location.href = "/dashboard"} className="mt-6 px-8 py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-950 rounded-2xl font-bold">
                Go to Dashboard
              </button>
            </div>
          ) : (
            <form onSubmit={handleBook} className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Select Date</label>
                <input type="date" required value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Select Time Slot</label>
                <select value={selectedTime} onChange={e => setSelectedTime(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl outline-none">
                  <option value="">Choose slot...</option>
                  <option value="10:00 AM">10:00 AM EST</option>
                  <option value="02:00 PM">02:00 PM EST</option>
                  <option value="06:00 PM">06:00 PM EST</option>
                </select>
              </div>
              <button type="submit" disabled={loading} className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-950 rounded-2xl font-bold hover:bg-purple-600 dark:hover:bg-purple-400 transition-all shadow-xl">
                {loading ? "Securing Slot..." : "Confirm & Pay Session"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
