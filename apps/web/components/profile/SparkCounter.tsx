"use client";

import { useRealtimeSparks } from "@/hooks/useRealtimeSparks";
import { Flame } from "lucide-react";

interface SparkCounterProps {
  userId: string;
  initialSparks: number;
}

export function SparkCounter({ userId, initialSparks }: SparkCounterProps) {
  const liveSparks = useRealtimeSparks(userId, initialSparks);

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-50 to-amber-50 rounded-full border border-orange-100 shadow-sm transition-all duration-300 hover:scale-105">
      <Flame className="w-5 h-5 text-orange-500 animate-pulse" />
      <div className="flex flex-col">
        <span className="text-xs font-semibold text-orange-600 uppercase tracking-wider leading-none">
          Social Sparks
        </span>
        <span className="text-lg font-bold text-gray-900 leading-none mt-1">
          {liveSparks.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
