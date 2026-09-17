"use client";
import { useEffect, useState } from "react";
import { executeConsultationPulse } from "@/actions/pulse";
import { createBrowserClient } from "@supabase/ssr";
import { IndianRupee, Clock, AlertTriangle, ShieldCheck } from "lucide-react";

type Props = {
  consultationId: string;
  isClientNode: boolean; 
  ratePerMinute: number;
  initialBalance: number;
};

export function LivePulseTracker({ consultationId, isClientNode, ratePerMinute, initialBalance }: Props) {
  const [balance, setBalance] = useState(initialBalance);
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [warning, setWarning] = useState(false);
  const [terminated, setTerminated] = useState(false);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";
  const supabase = createBrowserClient(supabaseUrl, supabaseKey);

  // Websocket Subscription Listener
  useEffect(() => {
    // Listen for direct wallet deductions pushed from Postgres
    const channel = supabase.channel(`pulse_${consultationId}`)
      .on(
        'postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'wallet_ledger', filter: `reference_id=eq.${consultationId}` }, 
        (payload) => {
          if (payload.new.transaction_type === 'DEBIT') {
            setElapsedMinutes((prev) => prev + 1);
            if (!isClientNode) {
               setBalance((prev) => prev + parseFloat(payload.new.amount)); // Shows earned amount for Consultant
            }
          }
        }
      )
      .subscribe();

    // Prevent connection leak
    return () => { supabase.removeChannel(channel); };
  }, [consultationId, isClientNode, supabase]);

  // Client Billing Execution (Runs every 60 seconds)
  useEffect(() => {
    if (!isClientNode || terminated) return;

    const interval = setInterval(async () => {
      const result: any = await executeConsultationPulse(consultationId);
      
      if (result && result.success) {
        setBalance(result.remaining_inr);
        if (result.terminate_next) setWarning(true);
      } else if (result && result.terminate) {
        setTerminated(true);
        clearInterval(interval);
      }
    }, 60000); // Pulse strictly at 60s

    return () => clearInterval(interval);
  }, [isClientNode, consultationId, terminated]);

  if (terminated) {
    return (
      <div className="w-full bg-rose-50 dark:bg-rose-950/30 border-y border-rose-200 dark:border-rose-500/20 px-6 py-3 flex items-center justify-between text-rose-600 dark:text-rose-400 font-bold">
        <span className="flex items-center gap-2"><AlertTriangle size={18} /> Session Terminated. Wallet Depleted.</span>
        <button onClick={() => window.location.href = "/wallet"} className="px-4 py-1.5 bg-rose-600 text-white rounded-lg text-xs shadow-md">Recharge Node</button>
      </div>
    );
  }

  return (
    <div className={`w-full px-6 py-3 flex items-center justify-between border-y ${warning ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400' : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'}`}>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Clock size={16} className={warning ? 'animate-pulse text-amber-500' : 'text-slate-400'} />
          <span className="font-mono font-medium text-sm">{elapsedMinutes.toString().padStart(2, '0')}:00 Elapsed</span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-emerald-500 opacity-80">
          <ShieldCheck size={14} /> Live Sync
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <span className="text-xs uppercase font-bold tracking-widest opacity-60">
          {isClientNode ? 'Remaining Balance' : 'Current Earnings'}
        </span>
        <div className="font-mono font-bold text-lg flex items-center">
          <IndianRupee size={16} className="mr-0.5" />
          {balance.toFixed(2)}
        </div>
      </div>
    </div>
  );
}
