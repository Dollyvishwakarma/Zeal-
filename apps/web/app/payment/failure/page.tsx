"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { XCircle } from "lucide-react";
import { Button } from "@zeal/ui";

export default function PaymentFailure() {
  const router = useRouter();
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="flex min-h-[80vh] flex-col items-center justify-center p-4 text-center"
    >
      <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-4">
        <XCircle className="w-10 h-10 text-red-600" />
      </div>
      <h1 className="text-2xl font-bold text-red-600">Payment Failed</h1>
      <p className="text-[#B8A1D9] dark:text-gray-400 mt-2 max-w-md">
        Your payment could not be processed. Please try again or use a different payment method.
      </p>
      <div className="flex gap-3 mt-6">
        <Button variant="primary" onClick={() => router.back()}>Try Again</Button>
        <Button variant="secondary" onClick={() => router.push("/explore")}>Explore More</Button>
      </div>
    </motion.div>
  );
}
