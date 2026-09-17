'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
}

let toasts: Toast[] = [];
let listeners: ((toasts: Toast[]) => void)[] = [];

function emit() {
  listeners.forEach((fn) => fn([...toasts]));
}

export function toast({
  title,
  description,
  variant = 'default',
}: {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
}) {
  const id = Date.now().toString();
  toasts.push({ id, title, description, variant });
  emit();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  }, 5000);
}

export function Toaster() {
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<Toast[]>([]);

  useEffect(() => {
    setMounted(true);
    const handler = (newToasts: Toast[]) => setItems(newToasts);
    listeners.push(handler);
    return () => {
      listeners = listeners.filter((fn) => fn !== handler);
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed bottom-20 right-4 z-50 space-y-2 max-w-sm w-full">
      <AnimatePresence>
        {items.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.9 }}
            className={cn(
              'p-4 rounded-xl shadow-lg border',
              toast.variant === 'destructive'
                ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-200'
                : toast.variant === 'success'
                ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/30 dark:border-green-800 dark:text-green-200'
                : 'bg-white border-gray-200 text-gray-800 dark:bg-gray-800 dark:border-gray-700 dark:text-white'
            )}
          >
            <p className="font-medium text-sm">{toast.title}</p>
            {toast.description && (
              <p className="text-sm opacity-80 mt-1">{toast.description}</p>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>,
    document.body
  );
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ');
}
