"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, MapPin, ChevronLeft, ChevronRight, Check, Loader2 } from "lucide-react";
import { SlotPicker } from "./SlotPicker";
import { formatCurrency } from "@zeal/utils";

type ConsultationType = "CHAT" | "PHYSICAL";

interface BookingWizardProps {
  consultant: {
    id: string;
    name: string;
    avatar?: string | null;
    category: string;
    chatRate?: number | null;
    physicalRate?: number | null;
    perMinuteRate: number;
  };
}

const TYPES: Array<{
  id: ConsultationType;
  label: string;
  icon: typeof MessageCircle;
  rateKey: "chatRate" | "physicalRate";
  description: string;
}> = [
  { id: "CHAT", label: "Chat Consultation", icon: MessageCircle, rateKey: "chatRate", description: "Per-minute text chat" },
  { id: "PHYSICAL", label: "In-Person Visit", icon: MapPin, rateKey: "physicalRate", description: "Meet in person" },
];

const DURATIONS = [15, 30, 45, 60];

export function BookingWizard({ consultant }: BookingWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [type, setType] = useState<ConsultationType>("CHAT");
  const [duration, setDuration] = useState(30);
  const [slot, setSlot] = useState<string | null>(null);
  const [location, setLocation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedType = TYPES.find((t) => t.id === type)!;
  const rate = consultant[selectedType.rateKey] ?? consultant.perMinuteRate ?? 50;
  const isPerMinute = type === "CHAT";
  const total = isPerMinute ? (duration / 60) * rate : rate;

  const totalSteps = type === "PHYSICAL" ? 4 : 3;

  const canNext = () => {
    if (step === 1) return true;
    if (step === 2) return !!slot;
    if (step === 3 && type === "PHYSICAL") return location.trim().length > 0;
    return true;
  };

  const handleSubmit = async () => {
    if (!slot) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consultantId: consultant.id,
          scheduledAt: slot,
          durationMinutes: duration,
          consultationType: type,
          location: type === "PHYSICAL" ? location : null,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error?.message || errData.error || "Booking failed");
      }

      const data = await res.json();
      router.push(`/bookings?highlight=${data.bookingId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-center gap-2 mb-8">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((n) => (
          <div key={n} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                step >= n
                  ? "bg-gradient-to-r from-[#9D7DC5] to-[#533AFD] text-white"
                  : "bg-[#F4E8F7] dark:bg-gray-800 text-[#B8A1D9]"
              }`}
            >
              {step > n ? <Check className="w-4 h-4" /> : n}
            </div>
            {n < totalSteps && (
              <div className={`w-8 h-0.5 ${step > n ? "bg-[#9D7DC5]" : "bg-[#F4E8F7] dark:bg-gray-800"}`} />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <h2 className="text-xl font-bold text-[#5E4B8B] dark:text-white">Choose consultation type</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TYPES.map((t) => {
                const Icon = t.icon;
                const tRate = consultant[t.rateKey] ?? consultant.perMinuteRate ?? 50;
                const selected = type === t.id;
                return (
                  <motion.button
                    key={t.id}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setType(t.id)}
                    className={`p-5 rounded-2xl text-left transition-all ${
                      selected
                        ? "bg-gradient-to-br from-[#9D7DC5]/20 to-[#533AFD]/10 border-2 border-[#9D7DC5]"
                        : "bg-white dark:bg-gray-900 border-2 border-[#E1C5E7] dark:border-gray-700"
                    }`}
                  >
                    <Icon className={`w-6 h-6 mb-3 ${selected ? "text-[#9D7DC5]" : "text-[#B8A1D9]"}`} />
                    <p className="font-medium text-[#5E4B8B] dark:text-white">{t.label}</p>
                    <p className="text-xs text-[#B8A1D9] mt-1">{t.description}</p>
                    <p className="text-sm text-[#9D7DC5] font-semibold mt-2">
                      {t.id === "PHYSICAL" ? formatCurrency(tRate) : `${formatCurrency(tRate)}/min`}
                    </p>
                  </motion.button>
                );
              })}
            </div>

            {type === "CHAT" && (
              <div>
                <p className="text-sm font-medium text-[#5E4B8B] dark:text-white mb-2">Duration</p>
                <div className="grid grid-cols-4 gap-2">
                  {DURATIONS.map((d) => (
                    <motion.button
                      key={d}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setDuration(d)}
                      className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                        duration === d
                          ? "bg-gradient-to-r from-[#9D7DC5] to-[#533AFD] text-white shadow-lg"
                          : "bg-white dark:bg-gray-900 border border-[#E1C5E7] dark:border-gray-700 text-[#5E4B8B] dark:text-white"
                      }`}
                    >
                      {d} min
                    </motion.button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <h2 className="text-xl font-bold text-[#5E4B8B] dark:text-white">Pick a time</h2>
            <SlotPicker
              consultantId={consultant.id}
              durationMinutes={duration}
              selectedSlot={slot}
              onSelect={setSlot}
            />
          </motion.div>
        )}

        {step === 3 && type === "PHYSICAL" && (
          <motion.div
            key="step3-physical"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <h2 className="text-xl font-bold text-[#5E4B8B] dark:text-white">Where to meet?</h2>
            <textarea
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              rows={3}
              placeholder="Enter meeting location..."
              className="w-full px-4 py-3 rounded-xl bg-white dark:bg-gray-900 border border-[#E1C5E7] dark:border-gray-700 text-[#5E4B8B] dark:text-white outline-none focus:border-[#9D7DC5]"
            />
          </motion.div>
        )}

        {((step === 3 && type === "CHAT") || (step === 4 && type === "PHYSICAL")) && (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <h2 className="text-xl font-bold text-[#5E4B8B] dark:text-white">Confirm & pay</h2>

            <div className="glass-card-3d p-5 space-y-3">
              <div className="flex items-center gap-3 pb-3 border-b border-[#E1C5E7] dark:border-gray-700">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#9D7DC5]/20 to-[#533AFD]/10 flex items-center justify-center font-semibold text-[#9D7DC5]">
                  {consultant.name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-[#5E4B8B] dark:text-white">{consultant.name}</p>
                  <p className="text-xs text-[#B8A1D9] capitalize">{consultant.category.toLowerCase()}</p>
                </div>
              </div>

              <Row label="Type" value={selectedType.label} />
              <Row label="Duration" value={`${duration} minutes`} />
              {slot && (
                <Row
                  label="When"
                  value={new Date(slot).toLocaleString("en-IN", {
                    weekday: "short", day: "numeric", month: "short",
                    hour: "2-digit", minute: "2-digit",
                  })}
                />
              )}
              {type === "PHYSICAL" && location && <Row label="Location" value={location} />}

              <div className="pt-3 border-t border-[#E1C5E7] dark:border-gray-700 flex justify-between font-semibold text-lg">
                <span className="text-[#5E4B8B] dark:text-white">Total</span>
                <span className="text-[#9D7DC5]">{formatCurrency(total)}</span>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-3 mt-8">
        {step > 1 && (
          <button
            onClick={() => setStep(step - 1)}
            disabled={isSubmitting}
            className="flex items-center justify-center gap-1 px-6 py-3 rounded-2xl bg-white dark:bg-gray-900 border border-[#E1C5E7] dark:border-gray-700 text-[#5E4B8B] dark:text-white font-medium"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
        )}

        {step < totalSteps ? (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => canNext() && setStep(step + 1)}
            disabled={!canNext()}
            className="flex-1 flex items-center justify-center gap-1 py-3.5 rounded-2xl bg-gradient-to-r from-[#9D7DC5] to-[#533AFD] text-white font-medium shadow-lg disabled:opacity-50"
          >
            Continue <ChevronRight className="w-4 h-4" />
          </motion.button>
        ) : (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleSubmit}
            disabled={isSubmitting || !slot}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-[#9D7DC5] to-[#533AFD] text-white font-medium shadow-lg disabled:opacity-50"
          >
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
            ) : (
              <><Check className="w-4 h-4" /> Confirm & Pay</>
            )}
          </motion.button>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm gap-3">
      <span className="text-[#B8A1D9] flex-shrink-0">{label}</span>
      <span className="text-[#5E4B8B] dark:text-white font-medium text-right">{value}</span>
    </div>
  );
}