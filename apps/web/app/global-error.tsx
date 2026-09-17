"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { captureError } from "@/lib/observability";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureError(error, { source: "global-error", digest: error.digest });
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#F4E8F7] dark:bg-gray-900 p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-[#5E4B8B] dark:text-white mb-2">Something went wrong</h2>
            <p className="text-sm text-[#B8A1D9] dark:text-gray-400 mb-4">
              {error.message || "An unexpected error occurred. Our team has been notified."}
            </p>
            {error.digest && (
              <p className="text-xs text-[#B8A1D9] mb-4 font-mono">Error ID: {error.digest}</p>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={reset}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#9D7DC5] to-[#533AFD] text-white font-medium flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Try Again
              </button>
              <button
                onClick={() => { window.location.href = "/dashboard"; }}
                className="px-5 py-3 rounded-xl bg-[#F4E8F7] dark:bg-gray-800 text-[#5E4B8B] dark:text-white font-medium"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}

