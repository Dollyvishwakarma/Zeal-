'use client';
import { motion } from 'framer-motion';

interface LoadingSkeletonProps {
  type?: 'card' | 'table' | 'list' | 'stats';
  count?: number;
}

export function LoadingSkeleton({ type = 'card', count = 3 }: LoadingSkeletonProps) {
  const renderSkeleton = () => {
    switch (type) {
      case 'stats':
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {[...Array(count)].map((_, i) => (
              <div key={i} className="glass-card-3d p-4 animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-2" />
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              </div>
            ))}
          </div>
        );
      case 'table':
        return (
          <div className="glass-card-3d p-4 animate-pulse">
            <div className="space-y-3">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-full" />
              {[...Array(count)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
                </div>
              ))}
            </div>
          </div>
        );
      case 'list':
        return (
          <div className="space-y-3">
            {[...Array(count)].map((_, i) => (
              <div key={i} className="glass-card-3d p-4 animate-pulse flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-2" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                </div>
                <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            ))}
          </div>
        );
      default:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {[...Array(count)].map((_, i) => (
              <div key={i} className="glass-card-3d p-4 animate-pulse h-48" />
            ))}
          </div>
        );
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      {renderSkeleton()}
    </motion.div>
  );
}
