"use client";
import { useState } from "react";
import { BookOpen, MessageCircle, Phone } from "lucide-react";
import { BookingModal } from "./BookingModal";

interface ActionButtonsProps {
  healerId: string;
  healerName: string;
  perMinuteRate: number;
  isAvailable: boolean;
}

export function ActionButtons({ healerId, healerName, perMinuteRate, isAvailable }: ActionButtonsProps) {
  const [showBooking, setShowBooking] = useState(false);

  return (
    <>
      <div className="flex items-center gap-3 mt-4 w-full max-w-xs">
        <button
          onClick={() => setShowBooking(true)}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#9D7DC5] text-white rounded-xl hover:bg-[#533AFD] transition-all"
        >
          <BookOpen className="w-4 h-4" />
          Book {perMinuteRate > 0 && `(₹${perMinuteRate}/min)`}
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#F4E8F7] text-[#5E4B8B] rounded-xl hover:bg-[#E1C5E7] transition-all">
          <MessageCircle className="w-4 h-4" />
          Chat
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#F4E8F7] text-[#5E4B8B] rounded-xl hover:bg-[#E1C5E7] transition-all">
          <Phone className="w-4 h-4" />
          Call
        </button>
      </div>

      {showBooking && (
        <BookingModal
          healerId={healerId}
          healerName={healerName}
          perMinuteRate={perMinuteRate}
          onClose={() => setShowBooking(false)}
        />
      )}
    </>
  );
}
