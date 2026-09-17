import Link from "next/link";
import { ChevronLeft } from "lucide-react";

interface ServiceHeroProps {
  icon: string;
  displayName: string;
  categoryName: string;
  categoryId: string;
  description: string;
  consultantCount: number;
}

export function ServiceHero({
  icon,
  displayName,
  categoryName,
  categoryId,
  description,
  consultantCount,
}: ServiceHeroProps) {
  return (
    <div className="mb-8">
      <Link
        href="/services"
        className="inline-flex items-center gap-1 text-sm text-[#9D7DC5] hover:underline mb-4"
      >
        <ChevronLeft className="w-4 h-4" /> Back to Zeal Hub
      </Link>

      <div className="flex items-start gap-4">
        <div className="text-5xl flex-shrink-0">{icon}</div>
        <div>
          <p className="text-xs text-[#B8A1D9] uppercase tracking-wider mb-1">
            {categoryName}
          </p>
          <h1 className="text-2xl md:text-3xl font-bold text-[#5E4B8B] dark:text-white mb-1">
            {displayName}
          </h1>
          <p className="text-sm text-[#B8A1D9] dark:text-gray-400">
            {description}
          </p>
          <p className="text-sm text-[#9D7DC5] mt-2 font-medium">
            {consultantCount} verified consultant{consultantCount !== 1 ? "s" : ""} available
          </p>
        </div>
      </div>
    </div>
  );
}

// BATCH_F1_APPLIED
