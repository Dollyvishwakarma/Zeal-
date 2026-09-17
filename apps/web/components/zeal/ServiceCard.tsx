"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface ServiceCardProps {
  id: string;
  name: string;
  icon: string;
  description: string;
  route: string;
  index?: number;
}

export function ServiceCard({ id, name, icon, description, route, index = 0 }: ServiceCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: index * 0.06,
        type: "spring",
        stiffness: 180,
        damping: 22,
      }}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="group"
    >
      <Link href={route} className="block h-full">
        <div className="glass-card-3d p-4 h-full flex flex-col items-start gap-2 border border-white/10 hover:border-[#9D7DC5]/30 transition-all duration-300 hover:shadow-xl hover:shadow-[#9D7DC5]/10">
          <div className="flex items-center gap-3 w-full">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#9D7DC5]/20 to-[#533AFD]/10 flex items-center justify-center text-2xl flex-shrink-0">
              {icon}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-[#5E4B8B] dark:text-white text-sm truncate">
                {name}
              </h4>
              <p className="text-xs text-[#B8A1D9] dark:text-gray-400 line-clamp-1">
                {description}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-[#B8A1D9] group-hover:text-[#9D7DC5] transition-colors flex-shrink-0" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// ZEAL_CATEGORY_ENHANCED
