"use client";

// ═══════════════════════════════════════════════════════════════════════════════
// SparkBadge — Displays aggregate spark score with live delta animation
// Theme: dark slate + Zeal purple. Mobile-first.
// ═══════════════════════════════════════════════════════════════════════════════

import { motion, AnimatePresence } from "framer-motion";
import { Flame } from "lucide-react";
import { cn } from "@zeal/ui";

interface SparkBadgeProps {
  score: number;
  delta?: number | null;
  size?: "sm" | "md" | "lg";
  showDelta?: boolean;
  className?: string;
}

export function SparkBadge({
  score,
  delta = null,
  size = "md",
  showDelta = true,
  className,
}: SparkBadgeProps) {
  const sizes = {
    sm: { icon: 12, text: "text-xs", padding: "px-2 py-0.5", gap: "gap-1" },
    md: { icon: 16, text: "text-sm", padding: "px-3 py-1", gap: "gap-1.5" },
    lg: { icon: 20, text: "text-base", padding: "px-4 py-1.5", gap: "gap-2" },
  }[size];

  const displayScore = score >= 1000
    ? `${(score / 1000).toFixed(score >= 10000 ? 0 : 1)}K`
    : String(score);

  return (
    <div
      className={cn(
        "relative inline-flex items-center rounded-full",
        "bg-gradient-to-r from-orange-500/20 to-amber-500/10",
        "border border-orange-500/30 text-orange-400",
        sizes.padding,
        sizes.gap,
        className
      )}
      title={`${score.toLocaleString()} Sparks (social proof)`}
    >
      <Flame size={sizes.icon} className="text-orange-500 animate-pulse" />
      <span className={cn("font-bold font-mono tracking-tight", sizes.text)}>
        {displayScore}
      </span>

      <AnimatePresence>
        {showDelta && delta !== null && delta !== 0 && (
          <motion.span
            initial={{ opacity: 0, y: 8, scale: 0.8 }}
            animate={{ opacity: 1, y: -14, scale: 1 }}
            exit={{ opacity: 0, y: -22, scale: 0.8 }}
            className="absolute -top-1 right-0 text-xs font-black text-emerald-400 pointer-events-none"
          >
            {delta > 0 ? "+" : ""}{delta}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}