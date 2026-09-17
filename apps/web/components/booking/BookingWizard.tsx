"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Phone, Video, Users, ChevronLeft, ChevronRight, Check, Loader2 } from "lucide-react";
import { SlotPicker } from "./SlotPicker";
import { formatCurrency } from "@zeal/utils";

type Modality = "chat" | "audio" | "video" | "physical";

interface BookingWizardProps {
  consultant: {
    id: string;
    name: string;
    avatar?: string | null;
    category: string;
    chatRate?: number | null;
    audioRate?: number | null;
    videoRate?: number | null;
    physicalRate?: number | null;
    perMinuteRate: number;
  };
}

const MODALITIES: Array<{
  id: Modality;
  label: string;
  icon: typeof MessageCircle;
  rateKey: "chatRate" | "audioRate" | "videoRate" | "physicalRate";
  description: string;
}> = [
  { id: "chat", label: "Chat", icon: MessageCircle, rateKey: "chatRate", description: "Real-time text" },
  { id: "audio", label: "Audio Call", icon: Phone, rateKey: "audioRate", description: "Voice call" },
  { id: "video", label: "Video Call", icon: Video, rateKey: "videoRate", description: "Video session" },
  { id: "physical", label: "In-Person", icon: Users, rateKey: "physicalRate", description: "Meet in person" },
];

const DURATIONS = [15, 30, 45, 60];

export function BookingWizard({ consultant }: BookingWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [modality, setModality] = useState<Modality>("chat");
  const [duration, setDuration] = useState(30);
  const [slot, setSlot] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedModality = MODALITIES.find((m) => m.id === modality)!;
  const rate =
    consultant[selectedModality.rateKey] ?? consultant.perMinuteRate ?? 50;
  const isPerMinute = modality !== "physical";
  const total = isPerMinute ? (duration / 60) * rate : rate;

  const canNext = () => {
    if (step === 1) return true;
    if (step === 2) return !!slot;
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
          modality,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error?.message || "Booking failed");
      }

      const data = await res.json();
      router.push(`/bookings?highlight=${data.booking.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {[1, 2, 3].map((n) => (
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
            {n < 3 && (
              <div
                className={`w-8 h-0.5 ${
                  step > n ? "bg-[#9D7DC5]" : "bg-[#F4E8F7] dark:bg-gray-800"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Service */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: "spring", stiffness: 180, damping: 22 }}
            className="space-y-4"
          >
            <h2 className="text-xl font-bold text-[#5E4B8B] dark:text-white">
              Choose your service
            </h2>

            <div className="grid grid-cols-2 gap-3">
              {MODALITIES.map((m) => {
                const Icon = m.icon;
                const mRate = consultant[m.rateKey] ?? consultant.perMinuteRate ?? 50;
                const selected = modality === m.id;
                return (
                  <motion.button
                    key={m.id}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setModality(m.id)}
                    className={`p-4 rounded-2xl text-left transition-all ${
                      selected
                        ? "bg-gradient-to-br from-[#9D7DC5]/20 to-[#533AFD]/10 border-2 border-[#9D7DC5]"
                        : "bg-white dark:bg-gray-900 border-2 border-[#E1C5E7] dark:border-gray-700"
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 mb-2 ${
                        selected ? "text-[#9D7DC5]" : "text-[#B8A1D9]"
                      }`}
                    />
                    <p className="font-medium text-[#5E4B8B] dark:text-white text-sm">
                      {m.label}
                    </p>
                    <p className="text-xs text-[#B8A1D9] mt-0.5">{m.description}</p>
                    <p className="text-xs text-[#9D7DC5] font-semibold mt-1">
                      {m.id === "physical" ? formatCurrency(mRate) : `${formatCurrency(mRate)}/min`}
                    </p>
                  </motion.button>
                );
              })}
            </div>

            <div>
              <p className="text-sm font-medium text-[#5E4B8B] dark:text-white mb-2">
                Duration
              </p>
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
          </motion.div>
        )}

        {/* Step 2: Slot */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: "spring", stiffness: 180, damping: 22 }}
            className="space-y-4"
          >
            <h2 className="text-xl font-bold text-[#5E4B8B] dark:text-white">
              Pick a time
            </h2>
            <SlotPicker
              consultantId={consultant.id}
              durationMinutes={duration}
              selectedSlot={slot}
              onSelect={setSlot}
            />
          </motion.div>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: "spring", stiffness: 180, damping: 22 }}
            className="space-y-4"
          >
            <h2 className="text-xl font-bold text-[#5E4B8B] dark:text-white">
              Confirm & pay
            </h2>

            <div className="glass-card-3d p-5 space-y-3">
              <div className="flex items-center gap-3 pb-3 border-b border-[#E1C5E7] dark:border-gray-700">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#9D7DC5]/20 to-[#533AFD]/10 flex items-center justify-center font-semibold text-[#9D7DC5]">
                  {consultant.name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-[#5E4B8B] dark:text-white">
                    {consultant.name}
                  </p>
                  <p className="text-xs text-[#B8A1D9] capitalize">
                    {consultant.category.toLowerCase()}
                  </p>
                </div>
              </div>

              <Row label="Service" value={selectedModality.label} />
              <Row label="Duration" value={`${duration} minutes`} />
              {slot && (
                <Row
                  label="When"
                  value={new Date(slot).toLocaleString("en-IN", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                />
              )}

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

      {/* Navigation */}
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

        {step < 3 ? (
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
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Processing...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" /> Confirm & Pay
              </>
            )}
          </motion.button>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-[#B8A1D9]">{label}</span>
      <span className="text-[#5E4B8B] dark:text-white font-medium">{value}</span>
    </div>
  );
}

// BATCH_F2_APPLIED
