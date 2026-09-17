// apps/web/app/services/page.tsx
// ═══════════════════════════════════════════════════════════════════════════════
// Services Hub — AI search hero + 37-category grid with live stats
// ═══════════════════════════════════════════════════════════════════════════════

import { createAdminClient } from "@zeal/database/server";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SearchHero } from "@/components/discovery/SearchHero";
import { CATEGORY_ID_TO_NAME } from "@/lib/services/slug";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Zeal Services — Discover 37+ wellness traditions",
  description: "AI-powered search across astrology, tarot, therapy, numerology, palmistry, and 30+ more traditions.",
};

async function getCategoryStats() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("Consultant")
    .select("category, sparkScore, rating")
    .eq("status", "VERIFIED")
    .eq("isActive", true);

  const map = new Map<string, { count: number; sparks: number }>();
  for (const c of data ?? []) {
    const key = String(c.category ?? "").toLowerCase().replace(/_/g, "-");
    const existing = map.get(key) ?? { count: 0, sparks: 0 };
    existing.count += 1;
    existing.sparks += Number(c.sparkScore ?? 0);
    map.set(key, existing);
  }
  return map;
}

export default async function ServicesPage() {
  const statsMap = await getCategoryStats();
  const categories = Object.entries(CATEGORY_ID_TO_NAME);
  const totalConsultants = Array.from(statsMap.values()).reduce((s, v) => s + v.count, 0);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <SearchHero />

      {/* Stats bar */}
      <div className="flex flex-wrap items-center gap-6 mb-8 text-sm">
        <div>
          <span className="text-2xl font-black text-white">{categories.length}</span>
          <span className="text-slate-400 ml-2">categories</span>
        </div>
        <div>
          <span className="text-2xl font-black text-white">{totalConsultants}</span>
          <span className="text-slate-400 ml-2">verified guides</span>
        </div>
        <div>
          <span className="text-2xl font-black text-[#9D7DC5]">24/7</span>
          <span className="text-slate-400 ml-2">AI consultants</span>
        </div>
      </div>

      {/* Category grid */}
      <div className="mb-6">
        <h2 className="text-2xl md:text-3xl font-black text-white">
          Explore every tradition
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          From Vedic astrology to modern therapy — one platform.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {categories.map(([id, name]) => {
          const stats = statsMap.get(id) ?? { count: 0, sparks: 0 };
          return (
            <Link
              key={id}
              href={`/services/${id}`}
              className="group glass-card-3d p-5 hover:border-[#9D7DC5]/40 hover:-translate-y-1 transition-all duration-300 block relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#9D7DC5]/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#9D7DC5]/20 to-[#533AFD]/10 flex items-center justify-center text-xl mb-3">
                  ✨
                </div>
                <h3 className="font-bold text-white text-sm leading-tight mb-1.5 line-clamp-2">
                  {name}
                </h3>
                <p className="text-xs text-slate-400">
                  {stats.count} guide{stats.count !== 1 ? "s" : ""}
                </p>
                {stats.sparks > 0 && (
                  <p className="text-xs text-orange-400 mt-1 font-mono">
                    🔥 {stats.sparks.toLocaleString()}
                  </p>
                )}
                <div className="mt-3 flex items-center text-[#9D7DC5] text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Explore <ArrowRight size={12} className="ml-1" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}