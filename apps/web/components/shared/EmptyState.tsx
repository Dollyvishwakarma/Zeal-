"use client";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import Link from "next/link";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; href: string } | React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  const actionNode = action && typeof action === "object" && "label" in action && "href" in action
    ? <Link href={(action as { href: string }).href} className="mt-4 inline-flex px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#9D7DC5] to-[#533AFD] text-white text-sm font-medium">{(action as { label: string }).label}</Link>
    : action as React.ReactNode;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[280px] p-6 text-center"
    >
      <div className="p-4 rounded-full bg-[#F4E8F7] dark:bg-gray-800 mb-4">
        <Icon className="w-8 h-8 text-[#B8A1D9] dark:text-gray-500" />
      </div>
      <h3 className="text-lg font-semibold text-[#5E4B8B] dark:text-white">{title}</h3>
      {description && (
        <p className="text-sm text-[#B8A1D9] dark:text-gray-400 mt-1 max-w-md">{description}</p>
      )}
      {actionNode}
    </motion.div>
  );
}

