// apps/web/app/services/[category]/[service]/page.tsx
// ═══════════════════════════════════════════════════════════════════════════════
// Service Page — consultant grid with filters + AI consultants
// ═══════════════════════════════════════════════════════════════════════════════

import { createAdminClient } from "@zeal/database/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CATEGORY_ID_TO_NAME } from "@/lib/services/slug";
import { getService } from "@/lib/services/registry";
import { ConsultantCard } from "@/components/shared/ConsultantCard";

export const dynamic = "force-dynamic";

// ─── Explicit row types ─────────────────────────────────────────────────────
interface HumanConsultantRow {
  id: string;
  category: string;
  specialties: string[] | null;
  languages: string[] | null;
  bio: string | null;
  perMinuteRate: number | null;
  rating: number | null;
  totalConsultations: number | null;
  sparkScore: number | null;
  isActive: boolean | null;
  isVerified: boolean | null;
  subdomain: string | null;
  user: {
    id: string;
    name: string | null;
    username: string;
    avatar: string | null;
    is_online: boolean | null;
  };
}

interface AIConsultantRow {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  category: string;
  bio: string | null;
  rating: number;
  isPaid: boolean | null;
  perMinuteRate: number | null;
  sparkScore: number | null;
  specialties: string[] | null;
  languages: string[] | null;
}

interface PageProps {
  params: Promise<{ category: string; service: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { category, service } = await params;
  const def = getService(category, service);
  return {
    title: def
      ? `${def.displayName} — ${CATEGORY_ID_TO_NAME[category]} — Zeal`
      : "Service — Zeal",
  };
}

export default async function ServicePage({ params }: PageProps) {
  const { category, service: serviceSlug } = await params;
  const def = getService(category, serviceSlug);
  const categoryName = CATEGORY_ID_TO_NAME[category];

  if (!def || !categoryName) notFound();

  const admin = createAdminClient();

  // Fetch human consultants
  const { data: humansRaw } = await admin
    .from("Consultant")
    .select(`
      id, category, specialties, languages, bio, "perMinuteRate", rating,
      "totalConsultations", "sparkScore", "isActive", "isVerified", subdomain,
      user:User!Consultant_userId_fkey(id, name, username, avatar, is_online)
    `)
    .eq("category", def.category)
    .eq("status", "VERIFIED")
    .eq("isActive", true)
    .order("sparkScore", { ascending: false })
    .limit(40);

  const humans = (humansRaw ?? []) as HumanConsultantRow[];

  // Fetch AI consultants matching this category
  const { data: aiRaw } = await admin
    .from("AIConsultant")
    .select('id, name, username, avatar, category, bio, rating, "isPaid", "perMinuteRate", "sparkScore", specialties, languages')
    .eq("isActive", true)
    .ilike("category", `%${def.category}%`)
    .limit(10);

  const aiConsultants = (aiRaw ?? []) as AIConsultantRow[];

  const humanMatches = humans.filter((c: HumanConsultantRow) =>
    (c.specialties ?? []).some((s: string) =>
      def.specialties.some(
        (sp: string) =>
          s.toLowerCase().includes(sp.toLowerCase()) ||
          sp.toLowerCase().includes(s.toLowerCase())
      )
    )
  );
  const humanList = humanMatches.length > 0 ? humanMatches : humans;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link
        href={`/services/${category}`}
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-[#9D7DC5] mb-6 transition-colors"
      >
        <ArrowLeft size={14} /> {categoryName}
      </Link>

      {/* Hero */}
      <div className="mb-8">
        <div className="text-5xl mb-4">{def.icon}</div>
        <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-2">
          {def.displayName}
        </h1>
        <p className="text-slate-400 max-w-2xl">{def.description}</p>
        <div className="flex flex-wrap items-center gap-4 mt-4 text-sm">
          <span className="text-slate-400">
            {humanList.length} human guide{humanList.length !== 1 ? "s" : ""}
          </span>
          {aiConsultants.length > 0 && (
            <span className="text-[#9D7DC5]">
              {aiConsultants.length} AI consultant{aiConsultants.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* AI consultants first */}
      {aiConsultants.length > 0 && (
        <div className="mb-10">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#9D7DC5] mb-4">
            ✨ AI Consultants · 24/7
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {aiConsultants.map((ai: AIConsultantRow) => (
              <AIConsultantCard key={ai.id} consultant={ai} />
            ))}
          </div>
        </div>
      )}

      {/* Human consultants */}
      {humanList.length > 0 && (
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">
            Verified Human Guides
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {humanList.map((c: HumanConsultantRow) => (
              <ConsultantCard
                key={c.id}
                consultant={{
                  id: c.id,
                  userId: c.user.id,
                  name: c.user.name ?? c.user.username,
                  username: c.user.username,
                  bio: c.bio ?? "",
                  avatar: c.user.avatar ?? "",
                  category: c.category as never,
                  isVerified: c.isVerified ?? false,
                  isOnline: c.user.is_online ?? false,
                  perMinuteRate: c.perMinuteRate ?? 0,
                  experience: 0,
                  rating: c.rating ?? 0,
                  totalConsultations: c.totalConsultations ?? 0,
                  sparks: c.sparkScore ?? 0,
                  languages: c.languages ?? [],
                  specialties: c.specialties ?? [],
                  faith: "OTHER" as never,
                  isAI: false,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {humanList.length === 0 && aiConsultants.length === 0 && (
        <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-3xl">
          <p className="text-slate-400">No consultants available for this service yet.</p>
          <Link
            href={`/services/${category}`}
            className="inline-block mt-4 px-5 py-2.5 bg-gradient-to-r from-[#9D7DC5] to-[#533AFD] text-white rounded-xl text-sm font-medium"
          >
            Back to {categoryName}
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── AI Consultant Card (local to this page) ────────────────────────────────
function AIConsultantCard({ consultant }: { consultant: AIConsultantRow }) {
  return (
    <Link
      href={`/ai-astrologers/${consultant.id}`}
      className="glass-card-3d p-5 hover:border-[#9D7DC5]/40 transition-all block"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="relative flex-shrink-0">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#9D7DC5] to-[#533AFD] flex items-center justify-center text-white font-bold text-lg overflow-hidden ring-2 ring-[#9D7DC5]/30">
            {consultant.avatar ? (
              <img src={consultant.avatar} alt={consultant.name} className="w-full h-full object-cover" />
            ) : (
              consultant.name.charAt(0).toUpperCase()
            )}
          </div>
          <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-gradient-to-r from-[#9D7DC5] to-[#533AFD] text-white text-[8px] font-bold rounded-full">
            AI
          </span>
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-950 rounded-full" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-white text-sm truncate">{consultant.name}</h3>
          <p className="text-xs text-slate-400 truncate">@{consultant.username}</p>
          <div className="flex items-center gap-2 mt-1 text-xs">
            <span className="text-amber-400">⭐ {consultant.rating.toFixed(1)}</span>
            <span className="text-[#9D7DC5]">
              {consultant.isPaid && consultant.perMinuteRate
                ? `₹${consultant.perMinuteRate}/min`
                : "Free"}
            </span>
          </div>
        </div>
      </div>
      <p className="text-xs text-slate-400 line-clamp-2 mb-3">{consultant.bio}</p>
      <div className="inline-flex items-center gap-1 text-[#9D7DC5] text-xs font-medium">
        Start chat →
      </div>
    </Link>
  );
}