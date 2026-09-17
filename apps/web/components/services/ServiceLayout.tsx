'use client';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ReactNode } from 'react';

interface ServiceLayoutProps {
  title: string;
  icon: string;
  description: string;
  children: ReactNode;
}

export function ServiceLayout({ title, icon, description, children }: ServiceLayoutProps) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <Link href="/services" className="flex items-center gap-2 text-[#9D7DC5] hover:underline mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Services
        </Link>

        <div className="text-center mb-6">
          <span className="text-5xl block mb-2">{icon}</span>
          <h1 className="text-3xl font-bold text-[#5E4B8B] dark:text-white">{title}</h1>
          <p className="text-[#B8A1D9] dark:text-gray-400 mt-1">{description}</p>
        </div>

        <div className="glass-card-3d border-0">
          {children}
        </div>
      </motion.div>
    </div>
  );
}
