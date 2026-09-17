"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";
import { Button } from "@zeal/ui";

export default function PaymentSuccess() {
  const router = useRouter();
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="flex min-h-[80vh] flex-col items-center justify-center p-4 text-center"
    >
      <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
        <CheckCircle className="w-10 h-10 text-green-600" />
      </div>
      <h1 className="text-2xl font-bold text-[#5E4B8B] dark:text-white">Payment Successful!</h1>
      <p className="text-[#B8A1D9] dark:text-gray-400 mt-2 max-w-md">
        Your booking has been confirmed. You will receive a confirmation email shortly.
      </p>
      <div className="flex gap-3 mt-6">
        <Button variant="primary" onClick={() => router.push("/dashboard")}>Go to Dashboard</Button>
        <Button variant="secondary" onClick={() => router.push("/explore")}>Explore More</Button>
      </div>
    </motion.div>
  );
}
