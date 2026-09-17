"use client";

import { useState } from "react";
import { requestConsultationSession } from "@/actions/discovery";
import { Video, Loader2, PhoneCall } from "lucide-react";
import { useRouter } from "next/navigation";

export function CallRequestButton({ consultantId }: { consultantId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRing = async () => {
    setLoading(true);
    const res = await requestConsultationSession(consultantId);
    if (res.success && res.sessionId) {
      router.push(`/live/room/${res.sessionId}`);
    } else {
      alert(res.error || "Failed to start session.");
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleRing}
      disabled={loading}
      className="btn-3d px-6 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-purple-600/20 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><PhoneCall size={16} /> Request Live Session</>}
    </button>
  );
}
