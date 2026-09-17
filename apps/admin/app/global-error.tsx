"use client";

import * as React from "react";
import { Button } from "@zeal/ui";

export default function AdminGlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("Admin global error:", error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
            <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2">Admin Error</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{error.message}</p>
            <Button onClick={reset} variant="primary">Try Again</Button>
          </div>
        </div>
      </body>
    </html>
  );
}
