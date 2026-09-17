"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Clock, AlertCircle } from "lucide-react";
import { Badge, Button } from "@zeal/ui";

interface PerMinuteBillingProps {
  ratePerMinute: number;
  onStart: () => void;
  onEnd: () => void;
  isActive: boolean;
}

export function PerMinuteBilling({ ratePerMinute, onStart, onEnd, isActive }: PerMinuteBillingProps) {
  const [duration, setDuration] = React.useState(0);
  const [total, setTotal] = React.useState(0);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
        setTotal(prev => prev + ratePerMinute / 60);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, ratePerMinute]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="bg-[#F4E8F7] dark:bg-gray-800 rounded-xl p-4 border border-[#E1C5E7] dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#9D7DC5]" />
          <span className="font-medium text-[#5E4B8B] dark:text-white">
            {isActive ? formatTime(duration) : "00:00"}
          </span>
          <Badge variant={isActive ? "success" : "secondary"} className="text-xs">
            {isActive ? "Active" : "Not started"}
          </Badge>
        </div>
        <div className="text-right">
          <p className="text-sm text-[#B8A1D9] dark:text-gray-400">Rate</p>
          <p className="font-bold text-[#5E4B8B] dark:text-white">₹{ratePerMinute}/min</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-[#B8A1D9] dark:text-gray-400">Total</p>
          <p className="font-bold text-[#9D7DC5]">₹{total.toFixed(2)}</p>
        </div>
      </div>
      {isActive ? (
        <Button variant="danger" size="sm" className="mt-3 w-full" onClick={onEnd}>
          End Session
        </Button>
      ) : (
        <Button variant="primary" size="sm" className="mt-3 w-full" onClick={onStart}>
          Start Session
        </Button>
      )}
      {!isActive && duration > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-2 text-sm text-[#B8A1D9] dark:text-gray-400 flex items-center gap-1"
        >
          <AlertCircle className="w-4 h-4" /> Last session: {formatTime(duration)} (₹{total.toFixed(2)})
        </motion.div>
      )}
    </div>
  );
}
