"use client";

import Link from "next/link";
import { useState, memo } from "react";
import { motion } from "framer-motion";
import type { ConsultantProfile } from "@zeal/types";
import { Badge, Button } from "@zeal/ui";
import { cn } from "@zeal/ui";
import { useAppStoreShallow } from "@/lib/store/appStore";
import { useRouter } from "next/navigation";
import { Sparkles, Zap, Star, Clock, ChevronRight } from "lucide-react";

interface ConsultantCardProps {
  consultant: ConsultantProfile;
  variant?: "horizontal" | "vertical" | "compact";
  onChat?: (consultantId: string) => void;
  onBook?: (consultantId: string) => void;
  showActions?: boolean;
  priority?: boolean;
}

const ConsultantCard = memo(function ConsultantCard({
  consultant,
  variant = "vertical",
  onChat,
  onBook,
  showActions = true,
  priority = false,
}: ConsultantCardProps) {
  const router = useRouter();
  const { isAuthenticated } = useAppStoreShallow((state) => ({
    isAuthenticated: state.isAuthenticated,
  }));
  const [isLoading, setIsLoading] = useState(false);
  const isVertical = variant === "vertical";
  const isCompact = variant === "compact";

  const isAI = consultant.isAI === true;

  const handleChat = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      router.push("/auth/login?redirect=/explore");
      return;
    }

    setIsLoading(true);
    try {
      if (isAI) {
        router.push(`/chat/ai-${consultant.id}`);
      } else if (onChat) {
        await onChat(consultant.id);
      } else {
        router.push(`/chat/${consultant.id}`);
      }
    } catch (error) {
      console.error("Failed to start chat:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBook = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isAI) {
      router.push(`/ai-astrologers/${consultant.id}`);
      return;
    }
    if (onBook) {
      onBook(consultant.id);
    } else {
      router.push(`/booking?consultantId=${consultant.id}`);
    }
  };

  const rating = consultant.rating || 4.5;
  const href = isAI ? `/ai-astrologers/${consultant.id}` : `/consultant/${consultant.id}`;

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={cn(
        "glass-card-3d group relative overflow-hidden transition-all duration-300",
        isVertical ? "flex flex-col items-center text-center" : "flex items-start gap-4",
        isCompact ? "p-3" : "p-4",
      )}
    >
      {consultant.isOnline && (
        <div className="absolute top-2 right-2 z-10">
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-700 dark:text-green-400 border border-green-500/30">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            {isAI ? "24/7" : "Online"}
          </span>
        </div>
      )}

      <div className="relative">
        <div
          className={cn(
            "rounded-full ring-2 ring-[#9D7DC5]/30 p-1",
            isCompact ? "w-12 h-12" : "w-20 h-20",
          )}
        >
          <img
            src={consultant.avatar || "https://ui-avatars.com/api/?name=U&background=9D7DC5&color=fff"}
            alt={consultant.name}
            className="w-full h-full rounded-full object-cover"
            loading={priority ? "eager" : "lazy"}
          />
        </div>
        {isAI && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-gradient-to-r from-[#9D7DC5] to-[#533AFD] text-white text-[8px] font-bold rounded-full flex items-center gap-0.5">
            <Sparkles className="w-2.5 h-2.5" /> AI
          </span>
        )}
        {consultant.isVerified && !isAI && (
          <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#9D7DC5] rounded-full flex items-center justify-center text-white text-xs border-2 border-white dark:border-gray-900">
            ✓
          </span>
        )}
      </div>

      <div className={cn("flex-1 min-w-0", isVertical ? "mt-2" : "mt-0")}>
        <Link href={href} className="block">
          <h3 className="font-semibold text-[#5E4B8B] dark:text-white hover:text-[#9D7DC5] transition-colors">
            {consultant.name}
          </h3>
          <p className="text-xs text-[#B8A1D9] dark:text-gray-400">@{consultant.username}</p>
        </Link>

        <div className="flex items-center gap-2 mt-1 text-xs flex-wrap">
          <span className="text-yellow-500 flex items-center gap-0.5">
            <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
            {rating.toFixed(1)}
          </span>
          <span className="text-[#B8A1D9] dark:text-gray-400">•</span>
          <span className="text-[#5E4B8B] dark:text-white font-medium">
            {consultant.perMinuteRate === 0 ? "Free" : `₹${consultant.perMinuteRate}/min`}
          </span>
          {consultant.totalConsultations > 0 && (
            <>
              <span className="text-[#B8A1D9] dark:text-gray-400">•</span>
              <span className="text-[#B8A1D9] dark:text-gray-400">
                {consultant.totalConsultations} consults
              </span>
            </>
          )}
        </div>

        {consultant.specialties && consultant.specialties.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {consultant.specialties.slice(0, isCompact ? 1 : 2).map((s) => (
              <Badge key={s} variant="outline" className="text-[8px] px-1.5 py-0">
                {s}
              </Badge>
            ))}
          </div>
        )}

        {showActions && (
          <div className={cn("flex gap-2 mt-3", isVertical ? "flex-col w-full" : "flex-row")}>
            <Button
              variant="primary"
              size="sm"
              onClick={handleChat}
              disabled={isLoading}
              className={cn("flex-1 text-xs py-1.5", isVertical ? "w-full" : "")}
            >
              {isLoading ? (
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Connecting
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Chat Now
                </span>
              )}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleBook}
              className={cn("flex-1 text-xs py-1.5", isVertical ? "w-full" : "")}
            >
              <Clock className="w-3 h-3 mr-1" /> {isAI ? "View" : "Book"}
            </Button>
          </div>
        )}

        {isCompact && !showActions && (
          <ChevronRight className="w-4 h-4 text-[#B8A1D9] ml-auto" />
        )}
      </div>
    </motion.div>
  );
});

export { ConsultantCard };
