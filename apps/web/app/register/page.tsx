"use client";

import { useState, useMemo } from "react";
import { registerAction } from "@/actions/auth";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles, Loader2, Mail, Lock, User,
  Briefcase, ArrowRight, ShieldCheck, Compass,
} from "lucide-react";

type Strength = 0 | 1 | 2 | 3;

function computeStrength(pw: string): Strength {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return 1;
  if (score === 2) return 2;
  return 3;
}

const STRENGTH_META: Record<Strength, { label: string; color: string; width: string }> = {
  0: { label: "", color: "", width: "0%" },
  1: { label: "Weak", color: "bg-rose-500", width: "33%" },
  2: { label: "Fair", color: "bg-amber-500", width: "66%" },
  3: { label: "Strong", color: "bg-emerald-500", width: "100%" },
};

export default function RegisterPage() {
  const [accountType, setAccountType] = useState<"user" | "consultant">("user");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const strength = useMemo(() => computeStrength(password), [password]);
  const meta = STRENGTH_META[strength];
  const passwordOk = password.length >= 12;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!passwordOk) {
      setError("Password must be at least 12 characters.");
      return;
    }

    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    formData.append("accountType", accountType);

    const res = await registerAction(formData);

    if (res.success && res.destination) {
      router.push(res.destination);
    } else {
      setError(res.error || "Failed to create account. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen-app flex items-center justify-center p-4 relative overflow-hidden bg-slate-950">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 blur-[180px] rounded-full pointer-events-none mix-blend-screen" />

      <div className="w-full max-w-lg bg-slate-900/60 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white tracking-tight">Join Project Zeal</h1>
          <p className="text-slate-400 text-sm mt-2 font-medium">Select your portal intent to begin.</p>
        </div>

        <div className="grid grid-cols-2 gap-2 bg-slate-950/80 p-1.5 rounded-2xl border border-white/5 mb-8 shadow-inner">
          <button
            type="button"
            onClick={() => setAccountType("user")}
            className={`py-3.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
              accountType === "user"
                ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30 scale-[1.02]"
                : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
            }`}
          >
            <Compass size={16} /> Seeker
          </button>
          <button
            type="button"
            onClick={() => setAccountType("consultant")}
            className={`py-3.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
              accountType === "consultant"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-[1.02]"
                : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
            }`}
          >
            <Briefcase size={16} /> Guide / Advisor
          </button>
        </div>

        {accountType === "consultant" && (
          <div className="mb-6 p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs space-y-2 animate-in fade-in zoom-in-95">
            <div className="font-black flex items-center gap-2 text-indigo-200">
              <ShieldCheck size={16} className="text-indigo-400" /> Consultant Fast-Track
            </div>
            <p className="text-[11px] leading-relaxed text-indigo-300/80 font-medium">
              You will be securely routed to the multi-step verification form after account creation.
            </p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold text-center animate-in fade-in">
            {error}
          </div>
        )}

        <div className="mb-6">
          <GoogleAuthButton
            label={accountType === "consultant" ? "Apply with Google" : "Sign up with Google"}
            redirectPath={accountType === "consultant" ? "/apply" : "/explore"}
            intent={accountType}
          />
        </div>

        <div className="relative flex items-center justify-center mb-6">
          <div className="border-t border-white/10 w-full" />
          <span className="bg-slate-900 px-4 text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Or Email</span>
          <div className="border-t border-white/10 w-full" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Legal Name</label>
            <div className="relative group">
              <User size={18} className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
              <input name="fullName" type="text" required placeholder="Aacharya Sharma"
                className="w-full pl-12 pr-4 py-3.5 bg-slate-950/50 border border-white/10 rounded-2xl text-sm focus:border-purple-500 focus:bg-slate-950 text-white outline-none transition-all shadow-inner" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Email Address</label>
            <div className="relative group">
              <Mail size={18} className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
              <input name="email" type="email" required placeholder="name@domain.com"
                className="w-full pl-12 pr-4 py-3.5 bg-slate-950/50 border border-white/10 rounded-2xl text-sm focus:border-purple-500 focus:bg-slate-950 text-white outline-none transition-all shadow-inner" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Create Password</label>
            <div className="relative group">
              <Lock size={18} className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
              <input
                name="password"
                type="password"
                required
                minLength={12}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 12 characters"
                className={`w-full pl-12 pr-4 py-3.5 bg-slate-950/50 border rounded-2xl text-sm focus:border-purple-500 focus:bg-slate-950 text-white outline-none transition-all shadow-inner ${
                  password.length > 0 && !passwordOk ? "border-rose-500/40" : "border-white/10"
                }`}
              />
            </div>

            {password.length > 0 && (
              <div className="mt-2 space-y-1.5 animate-in fade-in slide-in-from-top-1">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${meta.color} transition-all duration-500 ease-out rounded-full`}
                      style={{ width: meta.width }}
                    />
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${
                    strength === 1 ? "text-rose-400" : strength === 2 ? "text-amber-400" : "text-emerald-400"
                  }`}>
                    {meta.label}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium">
                  {passwordOk ? "✓ Meets 12-character minimum" : `${12 - password.length} more character${12 - password.length === 1 ? "" : "s"} required`}
                </p>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !passwordOk}
            className="btn-3d w-full py-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 mt-8 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : (
              <>
                <span>{accountType === "consultant" ? "Initialize Application" : "Create Seeker Profile"}</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center pt-6 border-t border-white/5">
          <p className="text-slate-400 text-xs font-medium">
            Already have an account?{" "}
            <Link href="/login" className="text-purple-400 font-bold hover:text-purple-300 transition-colors">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
