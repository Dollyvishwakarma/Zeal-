"use client";
import React from "react";
import { motion } from "framer-motion";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@zeal/ui";

interface Props { children: React.ReactNode; fallback?: React.ReactNode; onReset?: () => void; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error: Error): State { return { hasError: true, error }; }
  override componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info);
  }
  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center min-h-[300px] p-6 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-[#5E4B8B] dark:text-white mb-2">Something went wrong</h2>
          <p className="text-sm text-[#B8A1D9] dark:text-gray-400 mb-4 max-w-md">{this.state.error?.message || "Unexpected error"}</p>
          <Button variant="primary" onClick={() => { this.setState({ hasError: false, error: null }); this.props.onReset?.(); }} className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Try Again
          </Button>
        </motion.div>
      );
    }
    return this.props.children;
  }
}

