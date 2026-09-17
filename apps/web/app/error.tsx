"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@zeal/ui";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("Page error:", error);
  }, [error]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center"
    >
      <div className="w-16 h-16 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
      </div>
      <h2 className="text-xl font-bold text-[#5E4B8B] dark:text-white mb-2">
        Something went wrong
      </h2>
      <p className="text-sm text-[#B8A1D9] dark:text-gray-400 mb-4 max-w-md">
        {error.message || "An unexpected error occurred."}
      </p>
      <Button variant="primary" onClick={reset} className="flex items-center gap-2">
        <RefreshCw className="w-4 h-4" /> Try Again
      </Button>
    </motion.div>
  );
}
