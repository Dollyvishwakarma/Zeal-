'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, Button, Input } from '@zeal/ui';
import { useAdminStore } from '@/lib/store/adminStore';
import { Wallet as WalletIcon, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

function WalletContent() {
  const { profile } = useAdminStore();
  const queryClient = useQueryClient();
  const isSuper = profile?.role === 'SUPER_ADMIN';
  const [amount, setAmount] = useState(100);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'wallet'],
    queryFn: async () => {
      const res = await fetch(isSuper ? '/api/admin/wallet' : '/api/admin/consultants/wallet');
      if (!res.ok) throw new Error('Failed to fetch wallet');
      return res.json();
    },
    refetchInterval: 30000,
  });

  const { data: transactions, isLoading: txLoading } = useQuery({
    queryKey: ['admin', 'transactions'],
    queryFn: async () => {
      const res = await fetch('/api/admin/wallet/transactions');
      if (!res.ok) throw new Error('Failed to fetch transactions');
      return res.json();
    },
  });

  const topUp = useMutation({
    mutationFn: async (amount: number) => {
      const res = await fetch('/api/admin/wallet/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });
      if (!res.ok) throw new Error('Top-up failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'wallet'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'transactions'] });
    },
  });

  if (isLoading) return <LoadingState />;
  if (error) {
    return (
      <div className="glass-card-3d p-6 text-center text-red-500">
        <p>Failed to load wallet: {(error as Error).message}</p>
        <button onClick={() => refetch()} className="mt-2 text-[#9D7DC5] hover:underline">Retry</button>
      </div>
    );
  }

  const wallet = data?.wallet || { balance: 0 };
  const txItems = transactions?.items || [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="glass-card-3d">
        <CardHeader>
          <CardTitle className="text-[#5E4B8B] dark:text-white">Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl sm:text-4xl font-bold text-[#9D7DC5]">₹{wallet.balance.toFixed(2)}</p>
          {isSuper && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-4">
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full sm:w-32 glass border-[#E1C5E7] dark:border-gray-700"
              />
              <Button variant="primary" onClick={() => topUp.mutate(amount)} disabled={topUp.isPending} className="btn-luxury w-full sm:w-auto">
                {topUp.isPending ? 'Processing...' : 'Top Up'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="glass-card-3d">
        <CardHeader>
          <CardTitle className="text-[#5E4B8B] dark:text-white">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {txLoading ? (
              <LoadingState />
            ) : txItems.length === 0 ? (
              <EmptyState icon={WalletIcon} title="No Transactions" description="Your transactions will appear here." />
            ) : (
              txItems.slice(0, 10).map((tx: { id: string; type: string; amount: number; description: string; createdAt: string }) => (
                <div key={tx.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-[#F4E8F7] dark:hover:bg-gray-800 transition-colors">
                  <div className="flex items-center gap-2">
                    {tx.type === 'TOPUP' ? <ArrowUpRight className="w-4 h-4 text-green-500" /> : <ArrowDownRight className="w-4 h-4 text-red-500" />}
                    <div>
                      <p className="text-sm text-[#5E4B8B] dark:text-white">{tx.description}</p>
                      <p className="text-xs text-[#B8A1D9]">{new Date(tx.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-medium ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.amount > 0 ? '+' : ''}₹{tx.amount.toFixed(2)}
                  </span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function WalletPage() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-[#5E4B8B] dark:text-white flex items-center gap-2">
          <WalletIcon className="w-5 h-5 text-[#9D7DC5]" /> Wallet
        </h1>
        <button onClick={() => window.location.reload()} className="p-2 rounded-full hover:bg-[#F4E8F7] dark:hover:bg-gray-800 transition-colors">
          <RefreshCw className="w-5 h-5 text-[#B8A1D9]" />
        </button>
      </div>
      <ErrorBoundary>
        <WalletContent />
      </ErrorBoundary>
    </motion.div>
  );
}
