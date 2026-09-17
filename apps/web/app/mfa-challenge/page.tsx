"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// MFA Challenge — promotes AAL1 → AAL2 for users with enrolled TOTP factors
// ═══════════════════════════════════════════════════════════════════════════════

import { Suspense, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@zeal/database";
import {
  ShieldCheck, Loader2, KeyRound, AlertCircle, ArrowLeft,
} from "lucide-react";
import Link from "next/link";

interface TOTPFactor {
  id: string;
  friendly_name?: string | null;
  factor_type?: string;
  status?: string;
}

function MfaChallengeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectedFrom") || "/";

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);

  if (!supabaseRef.current) {
    supabaseRef.current = createClient();
  }
  const supabase = supabaseRef.current;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const { data: factorsData, error: factorsErr } =
          await supabase.auth.mfa.listFactors();

        if (factorsErr) throw factorsErr;

        const totpFactors = ((factorsData?.totp ?? []) as TOTPFactor[]).filter(
          (f) => f.status === "verified",
        );

        if (totpFactors.length === 0) {
          router.replace("/profile?mfa=not_enrolled");
          return;
        }

        if (!cancelled) setFactorId(totpFactors[0]!.id);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load factors");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId || code.length !== 6) return;

    setVerifying(true);
    setError(null);

    try {
      const { error: verifyErr } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code,
      });

      if (verifyErr) throw verifyErr;

      const { data: { user } } = await supabase.auth.getUser();
      const role = (user?.app_metadata?.role as string | undefined) ?? "USER";

      let destination = redirectTo;
      if (destination === "/" || destination === "/login") {
        if (["SUPER_ADMIN", "ADMIN", "SUPPORT", "VIEWER"].includes(role)) {
          destination = "/admin";
        } else if (role === "CLIENT_ADMIN") {
          destination = "/consultant/dashboard";
        } else {
          destination = "/explore";
        }
      }

      router.replace(destination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
      setVerifying(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, "").slice(0, 6);
    setCode(v);
  };

  if (loading) {
    return (
      <div className="min-h-screen-app flex items-center justify-center bg-slate-950">
        <Loader2 className="animate-spin text-purple-500" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen-app flex items-center justify-center p-4 relative overflow-hidden bg-slate-950">
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-purple-600/15 blur-[160px] rounded-full pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-indigo-600/10 blur-[150px] rounded-full pointer-events-none mix-blend-screen" />

      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative z-10">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-tr from-purple-500/20 to-indigo-500/20 border border-purple-500/30 rounded-[1.25rem] flex items-center justify-center mx-auto mb-5 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-white/5" />
            <ShieldCheck className="text-purple-400 relative z-10" size={32} />
          </div>
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 tracking-tight">
            Verify Identity
          </h1>
          <p className="text-slate-400 text-sm mt-2 font-medium">
            Enter the 6-digit code from your authenticator app
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold text-center flex items-center justify-center gap-2 animate-in fade-in zoom-in-95">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">
              Authentication Code
            </label>
            <div className="relative">
              <KeyRound
                size={18}
                className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                autoFocus
                value={code}
                onChange={handleCodeChange}
                placeholder="000000"
                maxLength={6}
                className="w-full pl-14 pr-5 py-5 bg-slate-950/50 border border-white/10 rounded-2xl text-center font-mono text-2xl tracking-[0.5em] text-white outline-none focus:border-purple-500 focus:bg-slate-950 transition-all shadow-inner"
              />
            </div>
            <p className="mt-2 text-[11px] text-slate-500 text-center font-medium">
              {code.length}/6 digits
            </p>
          </div>

          <button
            type="submit"
            disabled={verifying || code.length !== 6}
            className="btn-3d w-full py-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {verifying ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Verifying...
              </>
            ) : (
              <>
                <ShieldCheck size={16} /> Verify Code
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/5 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-purple-400 text-xs font-medium transition-colors"
          >
            <ArrowLeft size={12} /> Use a different account
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function MfaChallengePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen-app flex items-center justify-center bg-slate-950">
          <Loader2 className="animate-spin text-purple-500" size={32} />
        </div>
      }
    >
      <MfaChallengeContent />
    </Suspense>
  );
}
