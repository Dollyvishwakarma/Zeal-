"use client";

import { useState, useEffect } from "react";
import { adminLoginAction } from "@/actions/auth";
import { useRouter } from "next/navigation";
import { ShieldAlert, Lock, Mail, Loader2, Server, Timer } from "lucide-react";

export default function AdminLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lockSeconds, setLockSeconds] = useState(0);
  const router = useRouter();

  // Live countdown when lockout is detected
  useEffect(() => {
    if (lockSeconds <= 0) return;
    const t = setInterval(() => setLockSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [lockSeconds]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (lockSeconds > 0) return;

    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const res = await adminLoginAction(formData);

    if (res.success && res.destination) {
      router.push(res.destination);
    } else {
      const msg = res.error || "Authentication failed.";
      setError(msg);
      // Detect lockout messages and start a 15-minute countdown
      if (/lock|too many|rate/i.test(msg)) {
        setLockSeconds(15 * 60);
      }
      setLoading(false);
    }
  };

  const formatCountdown = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const locked = lockSeconds > 0;

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-rose-600/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md bg-zinc-950/80 backdrop-blur-2xl border border-white/5 rounded-3xl p-10 shadow-2xl relative z-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Server className="text-rose-500" size={32} />
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-widest">Zeal Core</h1>
          <p className="text-zinc-500 text-xs mt-2 uppercase tracking-wider font-bold">Restricted Access Node</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold text-center flex items-center justify-center gap-2 animate-in fade-in zoom-in-95">
            <ShieldAlert size={16} /> {error}
          </div>
        )}

        {locked && (
          <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold text-center animate-in fade-in">
            <div className="flex items-center justify-center gap-2 mb-1.5">
              <Timer size={14} />
              <span>ACCESS LOCKED</span>
            </div>
            <p className="text-amber-300 font-mono text-lg tracking-widest">{formatCountdown(lockSeconds)}</p>
            <p className="text-amber-500/80 text-[10px] mt-1 font-medium">Too many failed attempts. Try again later.</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative group">
            <Mail size={16} className="absolute left-4 top-4 text-zinc-600 group-focus-within:text-rose-500 transition-colors" />
            <input
              name="email"
              type="email"
              required
              disabled={locked}
              autoComplete="email"
              placeholder="admin@zeal.com"
              className="w-full pl-12 pr-4 py-3.5 bg-zinc-900/50 border border-white/5 rounded-xl text-sm focus:border-rose-500 text-white outline-none transition-all disabled:opacity-50"
            />
          </div>
          <div className="relative group">
            <Lock size={16} className="absolute left-4 top-4 text-zinc-600 group-focus-within:text-rose-500 transition-colors" />
            <input
              name="password"
              type="password"
              required
              disabled={locked}
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full pl-12 pr-4 py-3.5 bg-zinc-900/50 border border-white/5 rounded-xl text-sm focus:border-rose-500 text-white outline-none transition-all disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={loading || locked}
            className="w-full py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 mt-6 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : locked ? "Locked" : "Authorize"}
          </button>
        </form>
      </div>
    </div>
  );
}
