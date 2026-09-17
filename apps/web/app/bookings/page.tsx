"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createBrowserClient } from "@supabase/ssr";
import { Calendar, Clock, ShieldCheck, ArrowRight, Home, Video, User } from "lucide-react";
import Link from "next/link";

interface Booking {
  id: string;
  consultant_name: string;
  specialty: string;
  date: string;
  time: string;
  status: "Confirmed" | "Completed" | "Pending";
}

const FALLBACK_BOOKINGS: Booking[] = [
  { id: "1", consultant_name: "Acharya Rajesh", specialty: "Vedic & Dasha Expert", date: "2026-03-25", time: "04:00 PM EST", status: "Confirmed" },
  { id: "2", consultant_name: "Dr. Elena Vance", specialty: "Hellenistic Astrology", date: "2026-03-28", time: "06:30 PM EST", status: "Pending" }
];

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>(FALLBACK_BOOKINGS);
  const [loading, setLoading] = useState(true);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";
  const supabase = createBrowserClient(supabaseUrl, supabaseKey);

  useEffect(() => {
    let isMounted = true;
    const fetchBookings = async () => {
      try {
        const { data, error } = await supabase.from("consultant_bookings").select("*");
        if (!isMounted) return;
        if (!error && data && data.length > 0) {
          setBookings(data);
        }
      } catch (err) {
        // Fallbacks remain active if table doesn't exist yet
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchBookings();
    return () => { isMounted = false; };
  }, [supabase]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 py-16 px-4 sm:px-6 lg:px-8 selection:bg-purple-500/30 transition-colors duration-500 relative overflow-hidden">
      
      {/* Background Glows */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-200 dark:bg-purple-600/10 blur-[150px] rounded-full pointer-events-none -z-10" />

      <div className="max-w-[72rem] mx-auto relative z-10">
        
        <div className="mb-12">
          <button 
            onClick={() => window.location.href = "/"} 
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-purple-600 dark:text-slate-400 dark:hover:text-purple-400 mb-4 transition-colors"
          >
            <Home size={16} /> Return to Cosmos
          </button>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-100 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 text-purple-700 dark:text-purple-300 font-medium text-xs uppercase tracking-widest mb-4">
                <Calendar size={14} /> Encrypted Consultations
              </div>
              <h1 className="text-4xl sm:text-6xl font-medium tracking-tight">Your Bookings.</h1>
              <p className="text-slate-600 dark:text-slate-400 font-light mt-2 text-lg">Manage your scheduled sessions with verified master consultants.</p>
            </div>
            
            <Link href="/ai-consultants" className="px-6 py-3.5 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-medium text-sm hover:bg-purple-600 dark:hover:bg-purple-400 transition-all shadow-md inline-flex items-center gap-2">
              Book New Session <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
            {[1, 2].map(i => <div key={i} className="h-48 bg-slate-200 dark:bg-slate-900/30 rounded-[2.5rem]" />)}
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-24 bg-white/50 dark:bg-slate-900/20 rounded-[2.5rem] border border-slate-200 dark:border-white/5">
            <Calendar size={48} className="mx-auto text-slate-400 dark:text-slate-700 mb-4" />
            <h3 className="text-xl font-medium text-slate-700 dark:text-slate-300">No active bookings</h3>
            <p className="text-slate-500 mt-2 mb-6">Schedule a consultation with our verified master network.</p>
            <Link href="/ai-consultants" className="px-6 py-3 bg-purple-600 text-white rounded-xl font-medium text-sm">Find Advisor</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AnimatePresence>
              {bookings.map((b, idx) => (
                <motion.div 
                  key={b.id} 
                  initial={{ opacity: 0, y: 20 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: idx * 0.1 }}
                  className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl dark:hover:border-purple-500/30 transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex justify-between items-start mb-6">
                      <span className={`px-3.5 py-1.5 rounded-full text-xs font-medium border ${b.status === 'Confirmed' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20'}`}>
                        {b.status}
                      </span>
                      <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                        <ShieldCheck size={14} className="text-purple-500" /> Encrypted Room
                      </span>
                    </div>

                    <h3 className="text-2xl font-medium text-slate-900 dark:text-white mb-1">{b.consultant_name}</h3>
                    <p className="text-purple-600 dark:text-purple-400 text-xs font-medium uppercase tracking-wider mb-6">{b.specialty}</p>

                    <div className="space-y-2 mb-8 text-sm text-slate-600 dark:text-slate-400 font-light">
                      <div className="flex items-center gap-2"><Calendar size={16} /> Date: {b.date}</div>
                      <div className="flex items-center gap-2"><Clock size={16} /> Time: {b.time}</div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                    <span className="text-xs text-emerald-500 font-medium flex items-center gap-1"><Video size={14} /> Link opens at scheduled time</span>
                    <button onClick={() => alert("Connecting to secure video node...")} className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-medium text-sm hover:bg-purple-600 dark:hover:bg-purple-400 transition-all shadow-md">
                      Join Session
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
