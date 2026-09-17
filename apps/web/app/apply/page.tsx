"use client";

import { useEffect, useState } from "react";
import { submitConsultantApplication, checkApplicationStatus } from "@/actions/consultant";
import {
  Sparkles, Send, Loader2, BookOpen, Clock, ShieldCheck,
  ArrowRight, Image as ImageIcon, Briefcase, Camera, AlertCircle,
} from "lucide-react";
import Link from "next/link";

export default function ApplyPage() {
  const [loading, setLoading] = useState(true);
  const [appStatus, setAppStatus] = useState<string | null>(null);

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [expertise, setExpertise] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [bio, setBio] = useState("");

  const bioOk = bio.trim().length >= 20;

  useEffect(() => {
    async function loadStatus() {
      const { status } = await checkApplicationStatus();
      setAppStatus(status);
      setLoading(false);
    }
    loadStatus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bioOk) {
      setErrorMsg("Bio must be at least 20 characters.");
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append("expertise", expertise);
    formData.append("bio", bio);
    formData.append("avatarUrl", avatarUrl);
    formData.append("coverUrl", coverUrl);

    const res = await submitConsultantApplication(formData);
    if (res.success) {
      setAppStatus("pending");
    } else {
      setErrorMsg(res.error || "Failed to submit application.");
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-purple-500" size={32} />
      </div>
    );
  }

  if (appStatus === "pending") {
    return (
      <div className="min-h-screen-app bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900/80 backdrop-blur-2xl border border-indigo-500/30 rounded-[2.5rem] p-10 text-center shadow-2xl max-w-lg w-full animate-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock size={32} className="text-indigo-400" />
          </div>
          <h1 className="text-3xl font-black mb-4">Application Under Review</h1>
          <p className="text-slate-400">
            Your metaphysical profile has been securely transmitted. The God-View administration will verify your credentials.
          </p>
          <Link href="/explore" className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl mt-8 font-bold transition-all">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (appStatus === "verified") {
    return (
      <div className="min-h-screen-app bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900/80 backdrop-blur-2xl border border-emerald-500/30 rounded-[2.5rem] p-10 text-center shadow-2xl max-w-lg w-full">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck size={32} className="text-emerald-400" />
          </div>
          <h1 className="text-3xl font-black mb-4">You are a Consultant</h1>
          <p className="text-slate-400">Your application is approved and your profile is live.</p>
          <Link href="/consultant/dashboard" className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl mt-8 font-bold transition-all">
            Enter Command Center
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen-app bg-slate-950 text-slate-50 flex items-center justify-center p-4 sm:p-10 relative overflow-hidden">
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-indigo-600/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="max-w-2xl w-full relative z-10">
        <div className="bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 sm:p-12 shadow-2xl">
          <div className="flex items-center justify-center gap-2 mb-10">
            <div className={`h-1.5 rounded-full transition-all duration-500 ${step >= 1 ? "w-16 bg-indigo-500" : "w-4 bg-slate-800"}`} />
            <div className={`h-1.5 rounded-full transition-all duration-500 ${step >= 2 ? "w-16 bg-indigo-500" : "w-4 bg-slate-800"}`} />
            <div className={`h-1.5 rounded-full transition-all duration-500 ${step >= 3 ? "w-16 bg-indigo-500" : "w-4 bg-slate-800"}`} />
          </div>

          {errorMsg && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-bold text-center flex items-center justify-center gap-2">
              <AlertCircle size={16} /> {errorMsg}
            </div>
          )}

          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500">
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold mb-4">
                  <Briefcase size={14} /> Phase 1
                </div>
                <h1 className="text-3xl font-black tracking-tight">Domain of Expertise</h1>
                <p className="text-slate-400 text-sm mt-2">Select your primary metaphysical discipline for the registry.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                {["Vedic Astrology", "Tarot Reading", "Numerology", "Vastu Shastra"].map((domain) => (
                  <button
                    key={domain}
                    onClick={() => setExpertise(domain)}
                    className={`p-6 rounded-2xl border-2 text-left transition-all ${
                      expertise === domain
                        ? "border-indigo-500 bg-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.2)]"
                        : "border-white/5 bg-slate-950 hover:border-white/20"
                    }`}
                  >
                    <BookOpen size={24} className={`mb-3 ${expertise === domain ? "text-indigo-400" : "text-slate-500"}`} />
                    <h3 className="font-bold text-slate-200">{domain}</h3>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!expertise}
                className="w-full py-4 bg-white text-slate-950 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                Continue <ArrowRight size={16} />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500">
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold mb-4">
                  <Camera size={14} /> Phase 2
                </div>
                <h1 className="text-3xl font-black tracking-tight">Visual Identity</h1>
                <p className="text-slate-400 text-sm mt-2">Establish your public presence on the platform.</p>
              </div>

              <div className="space-y-5 mb-8">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Avatar URL</label>
                  <div className="relative">
                    <ImageIcon size={18} className="absolute left-4 top-3.5 text-slate-500" />
                    <input
                      type="url"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="https://example.com/avatar.jpg"
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-950 border border-white/10 rounded-2xl text-sm focus:border-indigo-500 outline-none text-slate-200"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Profile Cover URL</label>
                  <div className="relative">
                    <ImageIcon size={18} className="absolute left-4 top-3.5 text-slate-500" />
                    <input
                      type="url"
                      value={coverUrl}
                      onChange={(e) => setCoverUrl(e.target.value)}
                      placeholder="https://example.com/cover.jpg"
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-950 border border-white/10 rounded-2xl text-sm focus:border-indigo-500 outline-none text-slate-200"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-bold text-sm transition-all">
                  Back
                </button>
                <button onClick={() => setStep(3)} className="flex-1 py-4 bg-white text-slate-950 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all flex items-center justify-center gap-2">
                  Continue <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500">
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold mb-4">
                  <Sparkles size={14} /> Final Phase
                </div>
                <h1 className="text-3xl font-black tracking-tight">Professional Bio</h1>
                <p className="text-slate-400 text-sm mt-2">Detail your lineage, certifications, and guiding philosophy.</p>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <textarea
                    required
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={6}
                    placeholder="I am dedicated to providing clarity and spiritual alignment..."
                    className={`w-full p-5 bg-slate-950 border rounded-2xl text-sm focus:border-emerald-500 outline-none text-slate-200 resize-none custom-scrollbar ${
                      bio.length > 0 && !bioOk ? "border-rose-500/40" : "border-white/10"
                    }`}
                  />
                  <div className="flex items-center justify-between mt-2 text-[11px]">
                    <span className={`font-medium ${bioOk ? "text-emerald-400" : "text-slate-500"}`}>
                      {bioOk ? "✓ Bio meets minimum length" : `Minimum 20 characters (${bio.trim().length}/20)`}
                    </span>
                    <span className="text-slate-600 font-mono">{bio.length}/1000</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    disabled={submitting}
                    className="px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-bold text-sm transition-all disabled:opacity-50"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={!bioOk || submitting}
                    className="flex-1 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl font-black text-sm shadow-xl shadow-emerald-500/20 hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 size={18} className="animate-spin" /> : <>Transmit Application <Send size={16} /></>}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
