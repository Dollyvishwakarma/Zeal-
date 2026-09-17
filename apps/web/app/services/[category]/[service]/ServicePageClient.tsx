"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Sparkles, Users } from "lucide-react";
import { ServiceHero } from "@/components/services/ServiceHero";
import {
  ServiceFilterBar,
  type ServiceFilters,
} from "@/components/services/ServiceFilterBar";
import { ConsultantGrid } from "@/components/services/ConsultantGrid";
import type { ServiceDefinition } from "@/lib/services";
import type { ConsultantProfile } from "@zeal/types";

interface ServicePageClientProps {
  service: ServiceDefinition;
  consultants: ConsultantProfile[];
  languages: string[];
  humanCount: number;
  aiCount: number;
}

const DEFAULT_FILTERS: ServiceFilters = {
  onlineOnly: false,
  maxPrice: 500,
  minRating: 0,
  language: "",
};

export function ServicePageClient({
  service,
  consultants,
  languages,
  humanCount,
  aiCount,
}: ServicePageClientProps) {
  const [filters, setFilters] = useState<ServiceFilters>(DEFAULT_FILTERS);
  const [tab, setTab] = useState<"all" | "human" | "ai">("all");

  const filtered = useMemo(() => {
    let list = consultants;

    // Tab filter
    if (tab === "human") list = list.filter((c) => !c.isAI);
    if (tab === "ai") list = list.filter((c) => c.isAI);

    // Other filters
    return list.filter((c) => {
      if (filters.onlineOnly && !c.isOnline) return false;
      if ((c.perMinuteRate || 50) > filters.maxPrice) return false;
      if ((c.rating || 0) < filters.minRating) return false;
      if (filters.language && !(c.languages || []).includes(filters.language)) {
        return false;
      }
      return true;
    });
  }, [consultants, filters, tab]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <ServiceHero
        icon={service.icon}
        displayName={service.displayName}
        categoryName={service.categoryName}
        categoryId={service.categoryId}
        description={service.description}
        consultantCount={consultants.length}
      />

      {/* Tabs: All / Humans / AI */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab("all")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            tab === "all"
              ? "bg-gradient-to-r from-[#9D7DC5] to-[#533AFD] text-white shadow-lg"
              : "bg-white dark:bg-gray-800 border border-[#E1C5E7] dark:border-gray-700 text-[#5E4B8B] dark:text-white"
          }`}
        >
          All ({consultants.length})
        </button>
        <button
          onClick={() => setTab("human")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5 ${
            tab === "human"
              ? "bg-gradient-to-r from-[#9D7DC5] to-[#533AFD] text-white shadow-lg"
              : "bg-white dark:bg-gray-800 border border-[#E1C5E7] dark:border-gray-700 text-[#5E4B8B] dark:text-white"
          }`}
        >
          <Users className="w-4 h-4" /> Humans ({humanCount})
        </button>
        <button
          onClick={() => setTab("ai")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5 ${
            tab === "ai"
              ? "bg-gradient-to-r from-[#9D7DC5] to-[#533AFD] text-white shadow-lg"
              : "bg-white dark:bg-gray-800 border border-[#E1C5E7] dark:border-gray-700 text-[#5E4B8B] dark:text-white"
          }`}
        >
          <Sparkles className="w-4 h-4" /> AI ({aiCount})
        </button>
      </div>

      <ServiceFilterBar
        filters={filters}
        onChange={setFilters}
        languages={languages}
      />

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-[#B8A1D9] dark:text-gray-400">
          <p>No consultants match your filters.</p>
          <p className="text-sm mt-1">Try relaxing the filters or switching tabs.</p>
        </div>
      ) : (
        <ConsultantGrid consultants={filtered} />
      )}
    </div>
  );
}
