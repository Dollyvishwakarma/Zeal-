"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@zeal/ui";

interface SeeAllLinkProps {
  href: string;
  children?: React.ReactNode;
  className?: string;
}

export function SeeAllLink({ href, children = "See All", className }: SeeAllLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-1 text-sm font-medium text-[#9D7DC5] dark:text-[#9D7DC5] hover:text-[#533AFD] dark:hover:text-[#533AFD] transition-all duration-300 relative",
        className
      )}
    >
      <span className="relative">
        {children}
        <span className="absolute -bottom-0.5 left-0 w-0 h-[2px] bg-[#9D7DC5] dark:bg-[#9D7DC5] group-hover:w-full transition-all duration-300" />
      </span>
      <ChevronRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
    </Link>
  );
}
