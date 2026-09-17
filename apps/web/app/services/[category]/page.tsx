// apps/web/app/services/[category]/page.tsx
// ═══════════════════════════════════════════════════════════════════════════════
// Category Page — service cards grid for a single category
// ═══════════════════════════════════════════════════════════════════════════════

import { createAdminClient } from "@zeal/database/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Star } from "lucide-react";
import {
  CATEGORY_ID_TO_NAME,
  CATEGORY_ID_TO_PRISMA,
} from "@/lib/services/slug";
import { getServicesByCategory } from "@/lib/services/registry";

export const dynamic = "force-dynamic";

// ─── Explicit row types (Supabase client is `any`) ──────────────────────────
interface ConsultantRow {
  id: string;
  specialties: string[] | null;
  rating: number | null;
  perMinuteRate: number | null;
  sparkScore: number | null;
}

interface ServiceStats {
  count: number;
  avgRating: number;
  minPrice: number;
}

interface PageProps {
  params: Promise<{ category: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { category } = await params;
  const name = CATEGORY_ID_TO_NAME[category] ?? category;
  return { title: `${name} — Zeal` };
}

export default async function CategoryPage({ params }: PageProps) {
  const { category } = await params;
  const categoryName = CATEGORY_ID_TO_NAME[category];

  if (!categoryName) notFound();

  const services = getServicesByCategory(category);
  const prismaCategory = CATEGORY_ID_TO_PRISMA[category];

  const admin = createAdminClient();
  const { data } = await admin
    .from("Consultant")
    .select("id, specialties, rating, perMinuteRate, sparkScore")
    .eq("category", prismaCategory)
    .eq("status", "VERIFIED")
    .eq("isActive", true);

  const consultants = (data ?? []) as ConsultantRow[];

  // Per-service stats
  const serviceStats = new Map<string, ServiceStats>();

  for (const svc of services) {
    const matched = consultants.filter((c: ConsultantRow) =>
      (c.specialties ?? []).some((s: string) =>
        svc.specialties.includes(s) ||
        s.toLowerCase() === svc.displayName.toLowerCase()
      )
    );
    const count = matched.length;
    const avgRating = count > 0
      ? matched.reduce(
          (sum: number, c: ConsultantRow) => sum + (c.rating ?? 0),
          0
        ) / count
      : 0;
    const minPrice = count > 0
      ? Math.min(
          ...matched.map((c: ConsultantRow) => c.perMinuteRate ?? 0)
        )
      : 0;

    serviceStats.set(svc.serviceSlug, { count, avgRating, minPrice });
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link
        href="/services"
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-[#9D7DC5] mb-6 transition-colors"
      >
        <ArrowLeft size={14} /> All categories
      </Link>

      {/* Hero */}
      <div className="mb-8">
        <div className="text-5xl mb-4">✨</div>
        <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-2">
          {categoryName}
        </h1>
        <p className="text-slate-400">
          {consultants.length} verified guide{consultants.length !== 1 ? "s" : ""} · {services.length} specializations
        </p>
      </div>

      {/* Service cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((svc) => {
          const stats = serviceStats.get(svc.serviceSlug) ?? {
            count: 0,
            avgRating: 0,
            minPrice: 0,
          };

          return (
            <Link
              key={svc.serviceSlug}
              href={`/services/${category}/${svc.serviceSlug}`}
              className="group glass-card-3d p-6 hover:border-[#9D7DC5]/40 hover:-translate-y-1 transition-all duration-300 block"
            >
              <div className="text-3xl mb-3">{svc.icon}</div>

              <h3 className="font-bold text-white text-lg mb-2">
                {svc.displayName}
              </h3>
              <p className="text-sm text-slate-400 mb-4 line-clamp-2">
                {svc.description}
              </p>

              <div className="flex items-center gap-4 mb-4 text-xs">
                {stats.avgRating > 0 && (
                  <span className="flex items-center gap-1 text-amber-400">
                    <Star size={12} className="fill-amber-400" />
                    {stats.avgRating.toFixed(1)}
                  </span>
                )}
                {stats.minPrice > 0 && (
                  <span className="text-[#9D7DC5] font-mono">
                    ₹{stats.minPrice}/min
                  </span>
                )}
                <span className="text-slate-500">
                  {stats.count} guide{stats.count !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="flex items-center text-[#9D7DC5] text-sm font-medium group-hover:gap-2 transition-all">
                View consultants <ArrowRight size={14} className="ml-1" />
              </div>
            </Link>
          );
        })}
      </div>

      {services.length === 0 && (
        <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-3xl">
          <p className="text-slate-400">No services available in this category yet.</p>
        </div>
      )}
    </div>
  );
}