"use client";

import { useState } from "react";
import { reviewConsultantApplication } from "@/actions/admin";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function AdminReviewButton({ appId, userId }: { appId: string; userId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleReview = async (approve: boolean) => {
    setLoading(true);
    const res = await reviewConsultantApplication(appId, userId, approve);
    if (res.success) {
      router.refresh();
    } else {
      alert(res.error || "Action failed.");
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2 shrink-0">
      <button
        disabled={loading}
        onClick={() => handleReview(false)}
        className="btn-3d px-4 py-2.5 rounded-xl bg-rose-600/10 hover:bg-rose-600/20 border border-rose-500/30 text-rose-400 font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
      >
        <XCircle size={14} /> Reject
      </button>
      <button
        disabled={loading}
        onClick={() => handleReview(true)}
        className="btn-3d px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <><CheckCircle2 size={14} /> Approve Guide</>}
      </button>
    </div>
  );
}
