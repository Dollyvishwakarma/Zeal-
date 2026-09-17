"use client";

import { useEffect, useState, useRef } from "react";
import { getProfileData, updateProfileName, processWalletRecharge } from "@/actions/profile";
import { signOutAction } from "@/actions/auth";
import { createClient } from "@zeal/database";
import {
  User, Wallet, Shield, IndianRupee, ArrowUpRight, ArrowDownRight,
  Clock, Plus, Loader2, Edit3, CheckCircle2, LogOut, Sparkles,
  KeyRound, ShieldCheck, AlertCircle, X,
} from "lucide-react";
import { useRouter } from "next/navigation";

type MfaFactor = {
  id: string;
  friendly_name?: string | null;
  factor_type: string;
  status: string;
};

type EnrollState =
  | { kind: "idle" }
  | { kind: "enrolling" }
  | { kind: "verifying"; factorId: string; qrCode: string; secret: string }
  | { kind: "done" };

export default function ProfileDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"general" | "billing" | "security">("general");

  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState("");
  const [updatingName, setUpdatingName] = useState(false);

  const [rechargeLoading, setRechargeLoading] = useState(false);

  // MFA state
  const [mfaFactors, setMfaFactors] = useState<MfaFactor[]>([]);
  const [mfaLoading, setMfaLoading] = useState(true);
  const [enrollState, setEnrollState] = useState<EnrollState>({ kind: "idle" });
  const [verifyCode, setVerifyCode] = useState("");
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [unenrollingId, setUnenrollingId] = useState<string | null>(null);

  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  if (!supabaseRef.current) supabaseRef.current = createClient();
  const supabase = supabaseRef.current;

  useEffect(() => {
    loadData();
    loadMfaFactors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    const res = await getProfileData();
    if (!res) {
      router.push("/login");
      return;
    }
    setData(res);
    setNewName(res.profile.full_name);
    setLoading(false);
  };

  const loadMfaFactors = async () => {
    setMfaLoading(true);
    try {
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const all = (factorsData?.all ?? []) as MfaFactor[];
      const verified = all.filter(
        (f) => f.factor_type === "totp" && f.status === "verified",
      );
      setMfaFactors(verified);
    } catch (err) {
      console.warn("[mfa] load failed:", err);
    } finally {
      setMfaLoading(false);
    }
  };

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingName(true);
    const formData = new FormData();
    formData.append("fullName", newName);
    const res = await updateProfileName(formData);
    if (res.success) {
      setIsEditing(false);
      await loadData();
    }
    setUpdatingName(false);
  };

  const handleRecharge = async (amount: number) => {
    setRechargeLoading(true);
    const res = await processWalletRecharge(amount);
    if (res.success) await loadData();
    setRechargeLoading(false);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // MFA actions
  // ═══════════════════════════════════════════════════════════════════════════
  const startEnrollment = async () => {
    setMfaError(null);
    setEnrollState({ kind: "enrolling" });

    try {
      // Clean up any previous unverified factors (Supabase rejects duplicate friendly names)
      const { data: listData } = await supabase.auth.mfa.listFactors();
      const unverified = ((listData?.all ?? []) as MfaFactor[]).filter(
        (f) => f.factor_type === "totp" && f.status === "unverified",
      );
      for (const f of unverified) {
        try { await supabase.auth.mfa.unenroll({ factorId: f.id }); } catch { /* ignore */ }
      }

      const { data: enrollData, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `Authenticator-${Date.now()}`,
      });

      if (error) throw error;
      if (!enrollData) throw new Error("No enrollment data returned");

      const svg = enrollData.totp.qr_code;
      const qrDataUrl = svg.startsWith("data:")
        ? svg
        : `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

      setEnrollState({
        kind: "verifying",
        factorId: enrollData.id,
        qrCode: qrDataUrl,
        secret: enrollData.totp.secret,
      });
    } catch (err) {
      setMfaError(err instanceof Error ? err.message : "Enrollment failed");
      setEnrollState({ kind: "idle" });
    }
  };

  const verifyEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enrollState.kind !== "verifying") return;
    if (verifyCode.length !== 6) return;

    setMfaError(null);
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: enrollState.factorId,
        code: verifyCode,
      });
      if (error) throw error;

      setEnrollState({ kind: "done" });
      setVerifyCode("");
      await loadMfaFactors();

      setTimeout(() => setEnrollState({ kind: "idle" }), 3000);
    } catch (err) {
      setMfaError(err instanceof Error ? err.message : "Verification failed");
    }
  };

  const cancelEnrollment = async () => {
    if (enrollState.kind === "verifying") {
      try { await supabase.auth.mfa.unenroll({ factorId: enrollState.factorId }); } catch { /* ignore */ }
    }
    setVerifyCode("");
    setMfaError(null);
    setEnrollState({ kind: "idle" });
  };

  const removeFactor = async (factorId: string) => {
    if (!confirm("Remove two-factor authentication? You will lose 2FA protection.")) return;
    setUnenrollingId(factorId);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      await loadMfaFactors();
    } catch (err) {
      setMfaError(err instanceof Error ? err.message : "Unenroll failed");
    } finally {
      setUnenrollingId(null);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, "").slice(0, 6);
    setVerifyCode(v);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-purple-500" size={32} />
      </div>
    );
  }

  const profile = data?.profile;
  const transactions = data?.transactions;
  const hasMfa = mfaFactors.length > 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-4 sm:p-10 relative overflow-hidden">
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-purple-600/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10 pt-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold mb-3">
              <Sparkles size={14} /> Personal Command Center
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Account Settings</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1 space-y-2">
            <button
              onClick={() => setActiveTab("general")}
              className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl text-sm font-bold transition-all ${
                activeTab === "general"
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20"
                  : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200"
              }`}
            >
              <User size={18} /> General Info
            </button>
            <button
              onClick={() => setActiveTab("billing")}
              className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl text-sm font-bold transition-all ${
                activeTab === "billing"
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                  : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200"
              }`}
            >
              <Wallet size={18} /> Billing & Wallet
            </button>
            <button
              onClick={() => setActiveTab("security")}
              className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl text-sm font-bold transition-all ${
                activeTab === "security"
                  ? "bg-rose-600 text-white shadow-lg shadow-rose-600/20"
                  : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200"
              }`}
            >
              <Shield size={18} /> Security
            </button>
          </div>

          <div className="lg:col-span-3">
            {activeTab === "general" && (
              <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <User className="text-purple-400" size={20} /> Identity & Profile
                </h2>

                <div className="space-y-6">
                  <div className="p-6 bg-slate-950/50 rounded-3xl border border-white/5">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Display Name</label>
                    {isEditing ? (
                      <form onSubmit={handleUpdateName} className="flex gap-3">
                        <input
                          type="text"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          className="flex-1 px-4 py-3 bg-slate-900 border border-purple-500/50 rounded-xl text-sm focus:outline-none focus:border-purple-500"
                          required
                        />
                        <button type="submit" disabled={updatingName} className="px-5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center">
                          {updatingName ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                        </button>
                      </form>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-semibold">{profile?.full_name}</span>
                        <button onClick={() => setIsEditing(true)} className="p-2 text-slate-400 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors">
                          <Edit3 size={18} />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-6 bg-slate-950/50 rounded-3xl border border-white/5">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                      <div className="text-sm font-medium text-slate-300">{data?.email || "Anonymous"}</div>
                    </div>
                    <div className="p-6 bg-slate-950/50 rounded-3xl border border-white/5">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Account Role Tier</label>
                      <div className="inline-block px-3 py-1 rounded-lg bg-purple-500/20 text-purple-300 text-xs font-bold uppercase border border-purple-500/30">
                        {profile?.role}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "billing" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-gradient-to-br from-slate-900/90 to-slate-900/50 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none" />
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                      <p className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Available Ledger Balance</p>
                      <h2 className="text-5xl font-black font-mono flex items-center text-white">
                        <IndianRupee size={40} className="text-emerald-400 mr-1" />
                        {Number(profile?.wallet_balance || 0).toLocaleString("en-IN", {
                          minimumFractionDigits: 2, maximumFractionDigits: 2,
                        })}
                      </h2>
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                      <button onClick={() => handleRecharge(500)} disabled={rechargeLoading} className="flex-1 md:flex-none px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-sm font-bold transition-all cursor-pointer">
                        + ₹500
                      </button>
                      <button onClick={() => handleRecharge(1000)} disabled={rechargeLoading} className="flex-1 md:flex-none px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20 hover:opacity-90 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer">
                        {rechargeLoading ? <Loader2 className="animate-spin" size={18} /> : <><Plus size={18} /> Add Funds</>}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 shadow-xl">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <Clock className="text-slate-400" size={18} /> Financial Ledger
                  </h3>
                  <div className="space-y-4">
                    {transactions?.length === 0 ? (
                      <div className="text-center text-slate-500 text-sm py-8">No transactions found.</div>
                    ) : (
                      transactions?.map((tx: any) => (
                        <div key={tx.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.transaction_type === "credit" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
                              {tx.transaction_type === "credit" ? <ArrowDownRight size={18} /> : <ArrowUpRight size={18} />}
                            </div>
                            <div>
                              <p className="text-sm font-bold">{tx.description}</p>
                              <p className="text-xs text-slate-400">{new Date(tx.created_at).toLocaleString()}</p>
                            </div>
                          </div>
                          <div className={`font-mono font-bold ${tx.transaction_type === "credit" ? "text-emerald-400" : "text-slate-300"}`}>
                            {tx.transaction_type === "credit" ? "+" : "-"} ₹{Number(tx.amount).toFixed(2)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "security" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 shadow-xl">
                  <div className="flex items-start justify-between gap-4 mb-6">
                    <div>
                      <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                        <ShieldCheck className="text-emerald-400" size={20} /> Two-Factor Authentication
                      </h2>
                      <p className="text-xs text-slate-400 mt-1.5">
                        Add an extra layer of security using an authenticator app (Google Authenticator, 1Password, Authy).
                      </p>
                    </div>
                    {hasMfa && (
                      <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
                        Enabled
                      </span>
                    )}
                  </div>

                  {mfaError && (
                    <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                      <AlertCircle size={14} /> {mfaError}
                    </div>
                  )}

                  {mfaLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="animate-spin text-purple-500" size={24} />
                    </div>
                  ) : enrollState.kind === "done" ? (
                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-bold flex items-center gap-2 animate-in fade-in zoom-in-95">
                      <CheckCircle2 size={18} /> Two-factor authentication enabled.
                    </div>
                  ) : enrollState.kind === "verifying" ? (
                    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2">
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-slate-300 font-medium">
                          Scan this QR code with your authenticator app
                        </p>
                        <button onClick={cancelEnrollment} className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors" aria-label="Cancel">
                          <X size={16} />
                        </button>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-6 p-5 bg-slate-950/50 rounded-2xl border border-white/5">
                        <div className="w-40 h-40 bg-white rounded-xl p-2 flex-shrink-0">
                          <img src={enrollState.qrCode} alt="MFA QR code" className="w-full h-full" />
                        </div>
                        <div className="flex-1 min-w-0 w-full">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                            Manual entry key
                          </p>
                          <code className="block text-xs text-purple-300 font-mono bg-slate-900 border border-white/5 rounded-lg px-3 py-2 break-all">
                            {enrollState.secret}
                          </code>
                        </div>
                      </div>

                      <form onSubmit={verifyEnrollment} className="space-y-3">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Enter the 6-digit code
                        </label>
                        <div className="flex gap-3">
                          <div className="relative flex-1">
                            <KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              autoComplete="one-time-code"
                              value={verifyCode}
                              onChange={handleCodeChange}
                              placeholder="000000"
                              maxLength={6}
                              className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-white/10 rounded-xl text-sm font-mono tracking-[0.3em] text-center text-white outline-none focus:border-purple-500 transition-all"
                            />
                          </div>
                          <button
                            type="submit"
                            disabled={verifyCode.length !== 6}
                            className="btn-3d px-6 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Verify
                          </button>
                        </div>
                      </form>
                    </div>
                  ) : hasMfa ? (
                    <div className="space-y-3">
                      {mfaFactors.map((f) => (
                        <div key={f.id} className="flex items-center justify-between p-4 bg-slate-950/50 rounded-2xl border border-white/5">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                              <KeyRound size={18} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold truncate text-white">
                                {f.friendly_name || "Authenticator app"}
                              </p>
                              <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Verified</p>
                            </div>
                          </div>
                          <button
                            onClick={() => removeFactor(f.id)}
                            disabled={unenrollingId === f.id}
                            className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                          >
                            {unenrollingId === f.id ? <Loader2 size={14} className="animate-spin" /> : "Remove"}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <button
                      onClick={startEnrollment}
                      disabled={enrollState.kind === "enrolling"}
                      className="btn-3d w-full py-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                    >
                      {enrollState.kind === "enrolling" ? (
                        <><Loader2 size={18} className="animate-spin" /> Preparing…</>
                      ) : (
                        <><ShieldCheck size={16} /> Enable Two-Factor Authentication</>
                      )}
                    </button>
                  )}
                </div>

                <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 shadow-xl">
                  <div className="p-6 bg-rose-950/20 rounded-3xl border border-rose-500/10">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div>
                        <h4 className="text-sm font-bold text-white mb-1">Terminate Session</h4>
                        <p className="text-xs text-slate-400">Securely log out of your Zeal account on this device.</p>
                      </div>
                      <form action={signOutAction}>
                        <button type="submit" className="px-6 py-3 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl text-sm font-bold transition-all flex items-center gap-2">
                          <LogOut size={16} /> Secure Sign Out
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
