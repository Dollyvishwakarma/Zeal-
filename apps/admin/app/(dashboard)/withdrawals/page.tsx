"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CreditCard, Check, X } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";

interface Withdrawal {
  id: string;
  amount: number;
  description: string;
  createdAt: string;
  metadata?: { upiId?: string; bankAccount?: string } | null;
  wallet: {
    user: {
      id: string;
      name?: string | null;
      email: string;
      username: string;
    };
  };
}

export default function AdminWithdrawalsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "withdrawals"],
    queryFn: async () => {
      const res = await fetch("/api/admin/withdrawals");
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  const actionMutation = useMutation({
    mutationFn: async ({ transactionId, action }: { transactionId: string; action: "APPROVE" | "REJECT" }) => {
      const res = await fetch("/api/admin/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId, action }),
      });
      if (!res.ok) throw new Error("Action failed");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "withdrawals"] }),
  });

  const withdrawals: Withdrawal[] = data?.withdrawals || [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#5E4B8B] dark:text-white flex items-center gap-2">
        <CreditCard className="w-6 h-6 text-[#9D7DC5]" /> Withdrawals
      </h1>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-[#F4E8F7] dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      ) : withdrawals.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No pending withdrawals"
          description="All payouts are up to date."
        />
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          {withdrawals.map((w, idx) => (
            <motion.div
              key={w.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="glass-card-3d p-5"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <p className="font-semibold text-[#5E4B8B] dark:text-white">
                    {w.wallet.user.name || `@${w.wallet.user.username}`}
                  </p>
                  <p className="text-xs text-[#B8A1D9]">{w.wallet.user.email}</p>
                </div>
                <p className="text-lg font-bold text-[#9D7DC5] flex-shrink-0">
                  ₹{Math.abs(w.amount).toFixed(2)}
                </p>
              </div>

              {w.metadata?.upiId && (
                <p className="text-xs text-[#B8A1D9] mb-1">
                  UPI: <span className="text-[#5E4B8B] dark:text-white">{w.metadata.upiId}</span>
                </p>
              )}

              <p className="text-[10px] text-[#B8A1D9] mb-3">
                Requested {new Date(w.createdAt).toLocaleString()}
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => actionMutation.mutate({ transactionId: w.id, action: "APPROVE" })}
                  disabled={actionMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm font-medium disabled:opacity-50"
                >
                  <Check className="w-4 h-4" /> Approve
                </button>
                <button
                  onClick={() => actionMutation.mutate({ transactionId: w.id, action: "REJECT" })}
                  disabled={actionMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium disabled:opacity-50"
                >
                  <X className="w-4 h-4" /> Reject
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

// BATCH_F3_APPLIED
