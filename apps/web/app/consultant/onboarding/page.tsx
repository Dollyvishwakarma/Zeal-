"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Check, ChevronLeft, ChevronRight } from "lucide-react";

// Values MUST match the DB enum. Verified against migration 001.
const CATEGORIES = [
  "ASTROLOGER", "PSYCHOLOGIST", "TAROT", "NUMEROLOGIST", "PALMIST",
  "VASTU", "REIKI", "LIFE_COACH", "HEALER",
  "MOTIVATIONAL_SPEAKER", "SPIRITUAL_GUIDE", "YOGA_INSTRUCTOR",
] as const;
type Category = (typeof CATEGORIES)[number];

const FAITHS = ["HINDU", "ISLAM", "CHRISTIAN", "BUDDHIST", "JEWISH", "SIKH", "OTHER"] as const;
type Faith = (typeof FAITHS)[number];

export default function ConsultantOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    category: "ASTROLOGER" as Category,
    specialties: "",
    languages: "",
    bio: "",
    perMinuteRate: 50,
    faith: "HINDU" as Faith,
  });

  const canNext = () => {
    if (step === 1) return form.specialties.trim().length > 0;
    if (step === 2) return form.bio.trim().length >= 50;
    return form.perMinuteRate >= 10 && form.perMinuteRate <= 500;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/consultant/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: form.category,
          specialties: form.specialties.split(",").map((s) => s.trim()).filter(Boolean),
          languages: form.languages.split(",").map((s) => s.trim()).filter(Boolean) || ["English"],
          bio: form.bio,
          perMinuteRate: Number(form.perMinuteRate),
          faith: form.faith,
          availability: {
            monday: [{ start: "09:00", end: "18:00" }],
            tuesday: [{ start: "09:00", end: "18:00" }],
            wednesday: [{ start: "09:00", end: "18:00" }],
            thursday: [{ start: "09:00", end: "18:00" }],
            friday: [{ start: "09:00", end: "18:00" }],
            saturday: [],
            sunday: [],
          },
          verificationDocs: ["https://placeholder.example.com/doc.pdf"],
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: { message?: string } }).error?.message || "Submission failed");
      }
      router.push("/consultant/pending");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-center gap-2 mb-8">
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex items-center gap-2">
            <div className={"w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium " + (step >= n ? "bg-gradient-to-r from-[#9D7DC5] to-[#533AFD] text-white" : "bg-[#F4E8F7] dark:bg-gray-800 text-[#B8A1D9]")}>
              {step > n ? <Check className="w-4 h-4" /> : n}
            </div>
            {n < 3 && <div className={"w-8 h-0.5 " + (step > n ? "bg-[#9D7DC5]" : "bg-[#F4E8F7] dark:bg-gray-800")} />}
          </div>
        ))}
      </div>

      <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass-card-3d p-5 md:p-6 space-y-4">
        {step === 1 && (
          <>
            <h2 className="text-xl font-bold text-[#5E4B8B] dark:text-white">Your Practice</h2>
            <div>
              <label className="block text-sm font-medium text-[#5E4B8B] dark:text-white mb-1">Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Category })} className="w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-900 border border-[#E1C5E7] dark:border-gray-700 text-[#5E4B8B] dark:text-white">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#5E4B8B] dark:text-white mb-1">Specialties (comma separated)</label>
              <input type="text" value={form.specialties} onChange={(e) => setForm({ ...form, specialties: e.target.value })} placeholder="Vedic, KP, Nadi" className="w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-900 border border-[#E1C5E7] dark:border-gray-700 text-[#5E4B8B] dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#5E4B8B] dark:text-white mb-1">Languages (comma separated)</label>
              <input type="text" value={form.languages} onChange={(e) => setForm({ ...form, languages: e.target.value })} placeholder="English, Hindi" className="w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-900 border border-[#E1C5E7] dark:border-gray-700 text-[#5E4B8B] dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#5E4B8B] dark:text-white mb-1">Faith</label>
              <select value={form.faith} onChange={(e) => setForm({ ...form, faith: e.target.value as Faith })} className="w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-900 border border-[#E1C5E7] dark:border-gray-700 text-[#5E4B8B] dark:text-white">
                {FAITHS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <h2 className="text-xl font-bold text-[#5E4B8B] dark:text-white">About You</h2>
            <div>
              <label className="block text-sm font-medium text-[#5E4B8B] dark:text-white mb-1">Bio (50+ characters)</label>
              <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={6} maxLength={1000} placeholder="Share your experience, approach, and what makes you unique…" className="w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-900 border border-[#E1C5E7] dark:border-gray-700 text-[#5E4B8B] dark:text-white resize-none" />
              <p className="text-xs text-[#B8A1D9] mt-1">{form.bio.length}/1000 · min 50</p>
            </div>
          </>
        )}
        {step === 3 && (
          <>
            <h2 className="text-xl font-bold text-[#5E4B8B] dark:text-white">Your Rates</h2>
            <div>
              <label className="block text-sm font-medium text-[#5E4B8B] dark:text-white mb-1">Per-minute rate (₹10 – ₹500)</label>
              <input type="number" min={10} max={500} value={form.perMinuteRate} onChange={(e) => setForm({ ...form, perMinuteRate: Number(e.target.value) })} className="w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-900 border border-[#E1C5E7] dark:border-gray-700 text-[#5E4B8B] dark:text-white" />
            </div>
            <div className="p-4 rounded-xl bg-[#F4E8F7] dark:bg-gray-800 text-sm text-[#5E4B8B] dark:text-white">
              You earn <strong>{Math.round(form.perMinuteRate * 0.9)}₹/min</strong> after the 10% platform fee.
            </div>
          </>
        )}
        {error && <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm" role="alert">{error}</div>}
      </motion.div>

      <div className="flex gap-3 mt-6">
        {step > 1 && (
          <button onClick={() => setStep(step - 1)} disabled={submitting} className="flex items-center gap-1 px-5 py-3 rounded-2xl bg-white dark:bg-gray-900 border border-[#E1C5E7] dark:border-gray-700 text-[#5E4B8B] dark:text-white font-medium">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
        )}
        {step < 3 ? (
          <button onClick={() => canNext() && setStep(step + 1)} disabled={!canNext()} className="flex-1 flex items-center justify-center gap-1 py-3.5 rounded-2xl bg-gradient-to-r from-[#9D7DC5] to-[#533AFD] text-white font-medium disabled:opacity-50">
            Continue <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={submitting} className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-[#9D7DC5] to-[#533AFD] text-white font-medium disabled:opacity-50">
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : <><Check className="w-4 h-4" /> Submit Application</>}
          </button>
        )}
      </div>
    </div>
  );
}

