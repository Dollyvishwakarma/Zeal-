"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
}

interface SlotPickerProps {
  consultantId: string;
  durationMinutes: number;
  selectedSlot: string | null;
  onSelect: (iso: string) => void;
}

export function SlotPicker({
  consultantId,
  durationMinutes,
  selectedSlot,
  onSelect,
}: SlotPickerProps) {
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  });
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const dateStr = date.toISOString().slice(0, 10);
    setLoading(true);

    fetch(
      `/api/bookings/availability?consultantId=${consultantId}&date=${dateStr}&durationMinutes=${durationMinutes}`,
    )
      .then((res) => (res.ok ? res.json() : { slots: [] }))
      .then((data) => {
        if (cancelled) return;
        setSlots((data.slots || []) as TimeSlot[]);
      })
      .catch(() => setSlots([]))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [consultantId, date, durationMinutes]);

  const changeDate = (days: number) => {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    if (next.getTime() < Date.now() - 86_400_000) return;
    setDate(next);
  };

  return (
    <div className="space-y-4">
      {/* Date navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => changeDate(-1)}
          className="p-2 rounded-xl hover:bg-[#F4E8F7] dark:hover:bg-gray-800 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-[#9D7DC5]" />
        </button>
        <p className="font-medium text-[#5E4B8B] dark:text-white">
          {date.toLocaleDateString("en-IN", {
            weekday: "long",
            day: "numeric",
            month: "short",
          })}
        </p>
        <button
          onClick={() => changeDate(1)}
          className="p-2 rounded-xl hover:bg-[#F4E8F7] dark:hover:bg-gray-800 transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-[#9D7DC5]" />
        </button>
      </div>

      {/* Slots */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-[#9D7DC5]" />
        </div>
      ) : slots.length === 0 ? (
        <p className="text-center py-8 text-[#B8A1D9] text-sm">
          No slots available on this day
        </p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {slots.map((slot) => {
            const isSelected = selectedSlot === slot.start;
            return (
              <motion.button
                key={slot.start}
                whileTap={{ scale: 0.96 }}
                onClick={() => slot.available && onSelect(slot.start)}
                disabled={!slot.available}
                className={`py-3 px-2 rounded-xl text-sm font-medium transition-all ${
                  isSelected
                    ? "bg-gradient-to-r from-[#9D7DC5] to-[#533AFD] text-white shadow-lg"
                    : slot.available
                    ? "bg-white dark:bg-gray-900 border border-[#E1C5E7] dark:border-gray-700 text-[#5E4B8B] dark:text-white hover:border-[#9D7DC5]"
                    : "bg-[#F4E8F7]/50 dark:bg-gray-800/50 text-[#B8A1D9]/50 cursor-not-allowed line-through"
                }`}
              >
                {new Date(slot.start).toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// BATCH_F2_APPLIED
