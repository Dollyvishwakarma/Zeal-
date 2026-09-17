"use client";

import { useState } from "react";
import { X, CreditCard } from "lucide-react";
import { useAuth } from "@/components/providers/SupabaseAuthProvider";
import { useRouter } from "next/navigation";

interface BookingModalProps {
  healerId: string;
  healerName: string;
  perMinuteRate: number;
  onClose: () => void;
}

export function BookingModal({ healerId, healerName, perMinuteRate, onClose }: BookingModalProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [duration, setDuration] = useState(15);
  const [isProcessing, setIsProcessing] = useState(false);

  const totalAmount = (duration / 60) * perMinuteRate;

  const handlePayment = async () => {
    setIsProcessing(true);
    try {
      // Use Supabase user fields
      const customerEmail = user?.email || "";
      const customerName = user?.user_metadata?.full_name || user?.user_metadata?.username || user?.email?.split("@")[0] || "User";

      const response = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          healerId,
          amount: totalAmount,
          currency: "INR",
          description: `Booking with ${healerName}`,
          customerEmail,
          customerName,
        }),
      });
      const data = await response.json();
      if (data.payment_url) {
        window.location.href = data.payment_url;
      } else {
        alert("Payment initiation failed. Please try again.");
      }
    } catch (error) {
      console.error("Payment error:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-[#5E4B8B]">Book {healerName}</h2>
          <button onClick={onClose} className="p-2 hover:bg-[#F4E8F7] rounded-full">
            <X className="w-5 h-5 text-[#B8A1D9]" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#5E4B8B] mb-1">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-[#E1C5E7] rounded-xl focus:ring-2 focus:ring-[#9D7DC5] outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#5E4B8B] mb-1">Time</label>
            <input
              type="time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="w-full px-3 py-2 border border-[#E1C5E7] rounded-xl focus:ring-2 focus:ring-[#9D7DC5] outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#5E4B8B] mb-1">Duration</label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full px-3 py-2 border border-[#E1C5E7] rounded-xl focus:ring-2 focus:ring-[#9D7DC5] outline-none"
            >
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
              <option value={45}>45 min</option>
              <option value={60}>60 min</option>
            </select>
          </div>

          <div className="bg-[#F4E8F7] rounded-xl p-4">
            <div className="flex justify-between text-sm">
              <span className="text-[#5E4B8B]">Rate</span>
              <span className="text-[#5E4B8B]">₹{perMinuteRate}/min</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-[#5E4B8B]">Duration</span>
              <span className="text-[#5E4B8B]">{duration} min</span>
            </div>
            <div className="flex justify-between font-bold mt-2 pt-2 border-t border-[#E1C5E7]">
              <span className="text-[#5E4B8B]">Total</span>
              <span className="text-[#9D7DC5]">₹{totalAmount.toFixed(2)}</span>
            </div>
          </div>

          <button
            onClick={handlePayment}
            disabled={!selectedDate || !selectedTime || isProcessing}
            className="w-full py-3 bg-[#9D7DC5] text-white rounded-xl font-medium hover:bg-[#533AFD] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              "Processing..."
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                Pay ₹{totalAmount.toFixed(2)} & Book
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
