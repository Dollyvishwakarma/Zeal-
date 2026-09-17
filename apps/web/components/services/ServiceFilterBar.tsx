"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { SlidersHorizontal, X } from "lucide-react";

export interface ServiceFilters {
  onlineOnly: boolean;
  maxPrice: number;
  minRating: number;
  language: string;
}

interface ServiceFilterBarProps {
  filters: ServiceFilters;
  onChange: (filters: ServiceFilters) => void;
  languages: string[];
}

export function ServiceFilterBar({
  filters,
  onChange,
  languages,
}: ServiceFilterBarProps) {
  const [expanded, setExpanded] = useState(false);

  const activeCount =
    (filters.onlineOnly ? 1 : 0) +
    (filters.maxPrice < 500 ? 1 : 0) +
    (filters.minRating > 0 ? 1 : 0) +
    (filters.language ? 1 : 0);

  return (
    <div className="mb-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-[#E1C5E7] dark:border-gray-700 text-sm text-[#5E4B8B] dark:text-white hover:bg-[#F4E8F7] dark:hover:bg-gray-700 transition-colors"
      >
        <SlidersHorizontal className="w-4 h-4" />
        Filters
        {activeCount > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-[#9D7DC5] text-white text-xs">
            {activeCount}
          </span>
        )}
      </button>

      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-3 p-4 rounded-xl bg-white dark:bg-gray-800 border border-[#E1C5E7] dark:border-gray-700 space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={filters.onlineOnly}
                onChange={(e) =>
                  onChange({ ...filters, onlineOnly: e.target.checked })
                }
                className="rounded"
              />
              <span className="text-[#5E4B8B] dark:text-white">
                Online only
              </span>
            </label>

            <div>
              <label className="text-xs text-[#B8A1D9] block mb-1">
                Max price: ₹{filters.maxPrice}/min
              </label>
              <input
                type="range"
                min={50}
                max={500}
                step={10}
                value={filters.maxPrice}
                onChange={(e) =>
                  onChange({ ...filters, maxPrice: Number(e.target.value) })
                }
                className="w-full accent-[#9D7DC5]"
              />
            </div>

            <div>
              <label className="text-xs text-[#B8A1D9] block mb-1">
                Min rating: {filters.minRating.toFixed(1)}★
              </label>
              <input
                type="range"
                min={0}
                max={5}
                step={0.5}
                value={filters.minRating}
                onChange={(e) =>
                  onChange({ ...filters, minRating: Number(e.target.value) })
                }
                className="w-full accent-[#9D7DC5]"
              />
            </div>

            <div>
              <label className="text-xs text-[#B8A1D9] block mb-1">
                Language
              </label>
              <select
                value={filters.language}
                onChange={(e) =>
                  onChange({ ...filters, language: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-[#E1C5E7] dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
              >
                <option value="">All languages</option>
                {languages.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {activeCount > 0 && (
            <button
              onClick={() =>
                onChange({
                  onlineOnly: false,
                  maxPrice: 500,
                  minRating: 0,
                  language: "",
                })
              }
              className="text-xs text-[#9D7DC5] hover:underline flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Clear filters
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
}

// BATCH_F1_APPLIED
