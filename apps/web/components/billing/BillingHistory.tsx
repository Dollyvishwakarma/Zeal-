"use client";

import { useEffect, useState } from "react";
import { useZealRealtime } from "@/providers/RealtimeProvider";
import { createClient } from "@zeal/database";
import { ArrowDownRight, ArrowUpRight, Receipt, Loader2, Clock } from "lucide-react";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  balance: number;
  description: string;
  createdAt: string;
}

export function BillingHistory({ walletId }: { walletId: string }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { subscribeToTable } = useZealRealtime();
  const supabase = createClient();

  useEffect(() => {
    if (!walletId) return;

    // 1. Initial Load
    const fetchHistory = async () => {
      const { data } = await supabase
        .from("Transaction")
        .select("id, type, amount, balance, description, createdAt")
        .eq("walletId", walletId)
        .order("createdAt", { ascending: false })
        .limit(20);
      
      if (data) setTransactions(data as any);
      setLoading(false);
    };

    fetchHistory();

    // 2. Real-Time Sync: New transactions pop in instantly
    const channel = subscribeToTable("Transaction", `walletId=eq.${walletId}`, (payload) => {
      if (payload.new) {
        setTransactions((prev) => [payload.new as Transaction, ...prev].slice(0, 20));
      }
    });

    return () => {
      channel?.unsubscribe();
    };
  }, [walletId, supabase, subscribeToTable]);

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Receipt className="w-5 h-5 text-gray-500" /> Billing History
        </h3>
        <span className="text-xs font-medium text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200">
          Last 20 Transactions
        </span>
      </div>
      
      <div className="divide-y divide-gray-50">
        {transactions.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            No transactions found for this wallet.
          </div>
        ) : (
          transactions.map((txn) => {
            const isCredit = ['CREDIT', 'TOPUP', 'EARNING', 'REFUND'].includes(txn.type);
            return (
              <div key={txn.id} className="p-5 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-full ${isCredit ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {isCredit ? <ArrowDownRight size={18} /> : <ArrowUpRight size={18} />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{txn.description}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                      <Clock size={12} />
                      {new Date(txn.createdAt).toLocaleString(undefined, { 
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                      })}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${isCredit ? 'text-green-600' : 'text-gray-900'}`}>
                    {isCredit ? '+' : '-'}₹{txn.amount.toFixed(2)}
                  </p>
                  <p className="text-xs font-medium text-gray-400 mt-1">
                    Bal: ₹{txn.balance.toFixed(2)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
