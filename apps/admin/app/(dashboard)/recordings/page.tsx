'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Badge, Button } from '@zeal/ui';
import { Video, Send, RefreshCw, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAdminStore } from '@/lib/store/adminStore';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

function RecordingsContent() {
  const { profile } = useAdminStore();
  const queryClient = useQueryClient();
  const isSuper = profile?.role === 'SUPER_ADMIN';

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'recordings'],
    queryFn: async () => {
      const url = isSuper ? '/api/admin/recordings' : '/api/admin/recordings?self=true';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch recordings');
      return res.json();
    },
    refetchInterval: 60000,
  });

  const sendRecording = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/recordings/${id}/send`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to send recording');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'recordings'] }),
  });

  if (isLoading) return <LoadingState />;
  if (error) {
    return (
      <div className="glass-card-3d p-6 text-center text-red-500">
        <p>Failed to load recordings: {(error as Error).message}</p>
        <button onClick={() => refetch()} className="mt-2 text-[#9D7DC5] hover:underline">Retry</button>
      </div>
    );
  }

  const recordings = data?.items || [];
  if (recordings.length === 0) {
    return <EmptyState icon={Video} title="No Recordings" description="Recordings will appear here after calls." />;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {recordings.map((r: { id: string; recordingUrl?: string | null; recordingReady?: boolean; durationSeconds?: number; createdAt: string; consultant?: { user?: { name?: string | null } | null } | null }) => (
        <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card-3d hover:shadow-xl transition-all">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-[#9D7DC5]/20"><Video className="w-4 h-4 text-[#9D7DC5]" /></div>
              <div>
                <p className="font-medium text-[#5E4B8B] dark:text-white text-sm truncate max-w-[120px]">{r.consultant?.user?.name || 'Unknown'}</p>
                <p className="text-xs text-[#B8A1D9] dark:text-gray-400">{r.durationSeconds ? `${Math.floor(r.durationSeconds / 60)}m ${r.durationSeconds % 60}s` : 'N/A'}</p>
              </div>
            </div>
            <Badge variant={r.recordingReady ? 'success' : 'warning'} className="text-[10px]">{r.recordingReady ? 'Ready' : 'Processing'}</Badge>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-[#B8A1D9] dark:text-gray-400">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}</span>
          </div>
          <div className="mt-3 flex gap-2">
            {r.recordingReady && r.recordingUrl && (
              <Button variant="primary" size="sm" className="flex-1 text-xs py-1 btn-luxury" onClick={() => r.recordingUrl && window.open(r.recordingUrl, "_blank")}>
                <Video className="w-3 h-3 mr-1" /> Play
              </Button>
            )}
            <Button variant="secondary" size="sm" className="flex-1 text-xs py-1 glass" onClick={() => sendRecording.mutate(r.id)} disabled={sendRecording.isPending || !r.recordingReady}>
              <Send className="w-3 h-3 mr-1" /> Send
            </Button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export default function RecordingsPage() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-[#5E4B8B] dark:text-white flex items-center gap-2">
          <Video className="w-5 h-5 text-[#9D7DC5]" /> Recordings
          <span className="text-xs text-[#B8A1D9]">Auto‑delete after 12h</span>
        </h1>
        <button onClick={() => window.location.reload()} className="p-2 rounded-full hover:bg-[#F4E8F7] dark:hover:bg-gray-800 transition-colors">
          <RefreshCw className="w-5 h-5 text-[#B8A1D9]" />
        </button>
      </div>
      <ErrorBoundary>
        <RecordingsContent />
      </ErrorBoundary>
    </motion.div>
  );
}
