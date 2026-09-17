"use client";

import { useEffect, useRef, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { clientLogger } from "@/lib/logger/client";

function LoggingInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    // Track page view
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });

    startTimeRef.current = Date.now();
    clientLogger.pageView(pathname, params);

    // Log page ready on next paint
    const raf = requestAnimationFrame(() => {
      const duration = Date.now() - startTimeRef.current;
      clientLogger.pageReady(pathname, duration);
    });

    return () => cancelAnimationFrame(raf);
  }, [pathname, searchParams]);

  return null;
}

export function LoggingProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <LoggingInner />
      </Suspense>
      {children}
    </>
  );
}
