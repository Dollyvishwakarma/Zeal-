"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Check, X, Loader2, Shield, ExternalLink } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";

interface PendingConsultant {
  id: string;
  status: string;
  category: string;
  specialties: string[];
  bio?: string | null;
  perMinuteRate: number;
  verificationDocs?: unknown;
  createdAt: string;
  user: {
    id: string;
    name?: string | null;
    email: string;
    username: string;
    avatar?: string | null;
  };
}

export default function AdminVerificationPage() {
  const queryClient = useQueryClient();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "verification"],
    queryFn: async () => {
      const res = await fetch("/api/admin/verification");
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (consultantId: string) => {
      const res = await fetch("/api/admin/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consultantId, action: "APPROVE" }),
      });
      if (!res.ok) throw new Error("Approve failed");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "verification"] }),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ consultantId, reason }: { consultantId: string; reason: string }) => {
      const res = await fetch("/api/admin/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consultantId, action: "REJECT", reason }),
      });
      if (!res.ok) throw new Error("Reject failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "verification"] });
      setRejectingId(null);
      setReason("");
    },
  });

  const pending: PendingConsultant[] = data?.consultants || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#5E4B8B] dark:text-white flex items-center gap-2">
          <Shield className="w-6 h-6 text-[#9D7DC5]" /> Verification Queue
        </h1>
        <p className="text-sm text-[#B8A1D9] dark:text-gray-400 mt-1">
          {pending.length} applicant{pending.length !== 1 ? "s" : ""} awaiting review
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 rounded-2xl bg-[#F4E8F7] dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      ) : pending.length === 0 ? (
        <EmptyState
          icon={Shield}
          title="All caught up"
          description="No pending verifications at this time."
        />
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          {pending.map((c, idx) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="glass-card-3d p-5"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#9D7DC5]/20 to-[#533AFD]/10 flex items-center justify-center text-[#9D7DC5] font-semibold flex-shrink-0">
                  {(c.user.name || c.user.username).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[#5E4B8B] dark:text-white">
                    {c.user.name || `@${c.user.username}`}
                  </p>
                  <p className="text-xs text-[#B8A1D9]">{c.user.email}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#9D7DC5]/10 text-[#9D7DC5] font-medium">
                      {c.category}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F4E8F7] dark:bg-gray-800 text-[#5E4B8B] dark:text-white">
                      ₹{c.perMinuteRate}/min
                    </span>
                    <span className="text-[10px] text-[#B8A1D9]">
                      Applied {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {c.bio && (
                <p className="text-sm text-[#5E4B8B] dark:text-white mb-3 line-clamp-3">
                  {c.bio}
                </p>
              )}

              {c.specialties && c.specialties.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {c.specialties.map((s) => (
                    <span
                      key={s}
                      className="text-[10px] px-2 py-0.5 rounded-full border border-[#E1C5E7] dark:border-gray-700 text-[#5E4B8B] dark:text-white"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}

              {rejectingId === c.id ? (
                <div className="space-y-2">
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Reason for rejection..."
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-gray-900 border border-[#E1C5E7] dark:border-gray-700 text-sm text-[#5E4B8B] dark:text-white resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setRejectingId(null);
                        setReason("");
                      }}
                      className="flex-1 py-2 rounded-xl bg-white dark:bg-gray-800 border border-[#E1C5E7] dark:border-gray-700 text-[#5E4B8B] dark:text-white text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => rejectMutation.mutate({ consultantId: c.id, reason })}
                      disabled={rejectMutation.isPending}
                      className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-medium disabled:opacity-50"
                    >
                      {rejectMutation.isPending ? "Rejecting..." : "Confirm Reject"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => approveMutation.mutate(c.id)}
                    disabled={approveMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm font-medium disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" /> Approve
                  </button>
                  <button
                    onClick={() => setRejectingId(c.id)}
                    className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium"
                  >
                    <X className="w-4 h-4" /> Reject
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

// BATCH_F3_APPLIED
