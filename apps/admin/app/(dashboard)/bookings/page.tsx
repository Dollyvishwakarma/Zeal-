'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Card, CardContent, Badge, Button } from '@zeal/ui';
import { Search, Filter, RefreshCw, Check, X, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { useAdminStore } from '@/lib/store/adminStore';

function BookingsContent() {
  const { profile } = useAdminStore();
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const limit = 10;
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'bookings', filter, page],
    queryFn: async () => {
      const res = await fetch(`/api/admin/bookings?status=${filter}&page=${page}&limit=${limit}`);
      if (!res.ok) throw new Error('Failed to fetch bookings');
      return res.json();
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/admin/bookings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update booking');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] });
    },
  });

  if (isLoading) return <LoadingState />;
  if (error) {
    return (
      <div className="glass-card-3d p-6 text-center text-red-500">
        <p>Failed to load bookings: {(error as Error).message}</p>
        <button onClick={() => refetch()} className="mt-2 text-[#9D7DC5] hover:underline">
          Retry
        </button>
      </div>
    );
  }

  const bookings = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  if (bookings.length === 0) {
    return <EmptyState icon={Calendar} title="No Bookings" description="No bookings match your current filters." />;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 rounded-xl glass border border-[#E1C5E7] dark:border-gray-700 text-sm focus:ring-2 focus:ring-[#9D7DC5] outline-none w-full sm:w-auto"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button onClick={() => refetch()} className="p-2 rounded-full hover:bg-[#F4E8F7] dark:hover:bg-gray-800 transition-colors">
            <RefreshCw className="w-5 h-5 text-[#B8A1D9]" />
          </button>
        </div>
        <div className="text-sm text-[#B8A1D9] dark:text-gray-400">
          {total} bookings
        </div>
      </div>

      {/* Mobile card view */}
      <div className="block sm:hidden space-y-4">
        {bookings.map((b: { id: string; status: string; scheduledAt: string; amount: number; user?: { name?: string | null } | null; consultant?: { user?: { name?: string | null } | null } | null }) => (
          <div key={b.id} className="glass-card-3d p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-[#5E4B8B] dark:text-white">{b.user?.name || 'N/A'}</p>
                <p className="text-sm text-[#B8A1D9] dark:text-gray-400">{b.consultant?.user?.name || 'N/A'}</p>
              </div>
              <Badge variant={
                b.status === 'confirmed' ? 'success' :
                b.status === 'pending' ? 'warning' :
                b.status === 'cancelled' ? 'destructive' :
                'secondary'
              }>
                {b.status}
              </Badge>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-[#5E4B8B] dark:text-white">{new Date(b.scheduledAt).toLocaleDateString()}</span>
              <span className="text-[#9D7DC5]">₹{b.amount}</span>
            </div>
            {b.status === 'pending' && (
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => updateStatus.mutate({ id: b.id, status: 'confirmed' })}
                  className="flex-1 py-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors text-sm"
                >
                  Confirm
                </button>
                <button
                  onClick={() => updateStatus.mutate({ id: b.id, status: 'cancelled' })}
                  className="flex-1 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors text-sm"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop table view */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[#F4E8F7] dark:bg-gray-800">
            <tr>
              <th className="text-left p-3 text-xs font-medium text-[#5E4B8B] dark:text-white">User</th>
              <th className="text-left p-3 text-xs font-medium text-[#5E4B8B] dark:text-white">Consultant</th>
              <th className="text-left p-3 text-xs font-medium text-[#5E4B8B] dark:text-white">Date</th>
              <th className="text-left p-3 text-xs font-medium text-[#5E4B8B] dark:text-white">Amount</th>
              <th className="text-left p-3 text-xs font-medium text-[#5E4B8B] dark:text-white">Status</th>
              <th className="text-left p-3 text-xs font-medium text-[#5E4B8B] dark:text-white">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E1C5E7] dark:divide-gray-700">
            {bookings.map((b: { id: string; status: string; scheduledAt: string; amount: number; user?: { name?: string | null } | null; consultant?: { user?: { name?: string | null } | null } | null }) => (
              <tr key={b.id} className="hover:bg-[#F4E8F7] dark:hover:bg-gray-800/50 transition-colors">
                <td className="p-3 text-sm text-[#5E4B8B] dark:text-white">{b.user?.name || 'N/A'}</td>
                <td className="p-3 text-sm text-[#5E4B8B] dark:text-white">{b.consultant?.user?.name || 'N/A'}</td>
                <td className="p-3 text-sm text-[#5E4B8B] dark:text-white">{new Date(b.scheduledAt).toLocaleDateString()}</td>
                <td className="p-3 text-sm text-[#5E4B8B] dark:text-white">₹{b.amount}</td>
                <td className="p-3"><Badge variant={
                  b.status === 'confirmed' ? 'success' :
                  b.status === 'pending' ? 'warning' :
                  b.status === 'cancelled' ? 'destructive' :
                  'secondary'
                }>{b.status}</Badge></td>
                <td className="p-3 flex gap-2">
                  {b.status === 'pending' && (
                    <>
                      <button onClick={() => updateStatus.mutate({ id: b.id, status: 'confirmed' })} className="p-1 rounded-full bg-green-100 text-green-700 hover:bg-green-200 transition-colors"><Check className="w-4 h-4" /></button>
                      <button onClick={() => updateStatus.mutate({ id: b.id, status: 'cancelled' })} className="p-1 rounded-full bg-red-100 text-red-700 hover:bg-red-200 transition-colors"><X className="w-4 h-4" /></button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg hover:bg-[#F4E8F7] dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm text-[#B8A1D9] dark:text-gray-400">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg hover:bg-[#F4E8F7] dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function BookingsPage() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-[#5E4B8B] dark:text-white">Bookings</h1>
      </div>
      <ErrorBoundary>
        <BookingsContent />
      </ErrorBoundary>
    </motion.div>
  );
}
