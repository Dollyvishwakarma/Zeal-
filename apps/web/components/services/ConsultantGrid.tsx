"use client";
import { motion } from "framer-motion";
import { ConsultantCard } from "@/components/shared/ConsultantCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { UserX } from "lucide-react";
import type { ConsultantProfile } from "@zeal/types";

interface ConsultantGridProps { consultants: ConsultantProfile[]; showActions?: boolean; }

export function ConsultantGrid({ consultants, showActions = true }: ConsultantGridProps) {
  if (consultants.length === 0) {
    return <EmptyState icon={UserX} title="No consultants match" description="Try relaxing the filters above." />;
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {consultants.map((c, idx) => (
        <motion.div key={c.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(idx * 0.04, 0.4) }}>
          <ConsultantCard consultant={c} variant="vertical" showActions={showActions} />
        </motion.div>
      ))}
    </div>
  );
}

