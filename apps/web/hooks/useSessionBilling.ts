"use client";

import { useState, useEffect, useRef } from "react";

interface UseSessionBillingParams {
  ratePerMinute: number;
  active: boolean;
  startTime?: Date;
}

export function useSessionBilling({
  ratePerMinute,
  active,
  startTime,
}: UseSessionBillingParams) {
  const [seconds, setSeconds] = useState(0);
  const [cost, setCost] = useState(0);
  const startRef = useRef<Date>(startTime || new Date());

  useEffect(() => {
    if (!active) return;
    startRef.current = startTime || new Date();

    const tick = () => {
      const elapsed = Math.floor(
        (Date.now() - startRef.current.getTime()) / 1000,
      );
      setSeconds(elapsed);
      setCost((elapsed / 60) * ratePerMinute);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [active, ratePerMinute, startTime]);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  return { seconds, cost, formattedDuration: formatDuration(seconds) };
}

// BATCH_F2_APPLIED
