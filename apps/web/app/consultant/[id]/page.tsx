// apps/web/app/consultant/[id]/page.tsx
// ═══════════════════════════════════════════════════════════════════════════════
// Consultant Profile — Instagram-style
// ─────────────────────────────────────────────────────────────────────────────
// Expert patterns applied:
//   • Two-stage fetch (profile → then parallel queries scoped by userId)
//   • pickOne() helper for Supabase array-or-object joins
//   • Explicit row types for every query (no implicit any)
//   • Null-checked relation narrowing
// ═══════════════════════════════════════════════════════════════════════════════

import { createAdminClient } from "@zeal/database/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Star, Flame, MessageSquare, Calendar, ArrowLeft,
} from "lucide-react";

export const dynamic = "force-dynamic";

// ─── Relation helper ─────────────────────────────────────────────────────────
type Relation<T> = T | T[] | null | undefined;

function pickOne<T>(relation: Relation<T>): T | null {
  if (relation == null) return null;
  if (Array.isArray(relation)) return relation[0] ?? null;
  return relation;
}

// ─── Row types (Supabase client is `any`, so we declare explicitly) ──────────
interface UserRelation {
  id: string;
  name: string | null;
  username: string;
  avatar: string | null;
  is_online: boolean;
}

interface ConsultantRow {
  id: string;
  userId: string;
  category: string;
  specialties: string[] | null;
  languages: string[] | null;
  bio: string | null;
  perMinuteRate: number;
  rating: number;
  totalConsultations: number;
  sparkScore: number;
  isVerified: boolean;
  status: string;
  subdomain: string | null;
  user: Relation<UserRelation>;
}

interface PostRow {
  id: string;
  content: string;
  mediaUrls: string[] | null;
  cheerCount: number;
  commentCount: number;
  createdAt: string;
}

interface BookingReviewRow {
  rating: number | null;
  review: string | null;
  updatedAt: string;
  user: Relation<{ name: string | null; avatar: string | null }>;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

// ─── Metadata ────────────────────────────────────────────────────────────────
export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const admin = createAdminClient();
  const { data } = await admin
    .from("Consultant")
    .select("user:User!Consultant_userId_fkey(name, username)")
    .eq("id", id)
    .maybeSingle();

  const rel = (data as { user?: Relation<{ name?: string | null; username?: string }> } | null)?.user;
  const user = pickOne(rel);
  const displayName = user?.name ?? user?.username ?? "Consultant";
  return { title: `${displayName} — Zeal` };
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default async function ConsultantProfilePage({ params }: PageProps) {
  const { id } = await params;

  const admin = createAdminClient();

  // ─── Stage 1: Load profile ───────────────────────────────────────────────
  const { data: profileData } = await admin
    .from("Consultant")
    .select(`
      id, "userId", category, specialties, languages, bio, "perMinuteRate",
      rating, "totalConsultations", "sparkScore", "isVerified", status, subdomain,
      user:User!Consultant_userId_fkey(id, name, username, avatar, is_online)
    `)
    .eq("id", id)
    .eq("status", "VERIFIED")
    .maybeSingle();

  if (!profileData) notFound();

  const profileRow = profileData as unknown as ConsultantRow;
  const userRel = pickOne(profileRow.user);

  // If the joined User row is missing, treat as not found
  if (!userRel) notFound();

  // TypeScript now narrows userRel to UserRelation (non-null)
  const user: UserRelation = userRel;

  // ─── Stage 2: Parallel fetches scoped by userId ──────────────────────────
  const [postsRes, reviewsRes, followRes] = await Promise.all([
    admin
      .from("Post")
      .select('id, content, "mediaUrls", "cheerCount", "commentCount", "createdAt"')
      .eq("authorId", profileRow.userId)   // ← scoped to this consultant
      .eq("isFlagged", false)
      .order("createdAt", { ascending: false })
      .limit(30),

    admin
      .from("Booking")
      .select('rating, review, "updatedAt", user:User!Booking_userId_fkey(name, avatar)')
      .eq("consultantId", profileRow.id)
      .eq("status", "COMPLETED")
      .not("rating", "is", null)
      .order("updatedAt", { ascending: false })
      .limit(10),

    admin
      .from("UserActivity")
      .select("*", { count: "exact", head: true })
      .eq("consultantId", profileRow.id)
      .eq("type", "follow"),
  ]);

  const posts = (postsRes.data ?? []) as PostRow[];
  const reviews = (reviewsRes.data ?? []) as BookingReviewRow[];
  const followers = (followRes as { count?: number | null }).count ?? 0;

  // ─── Derived ─────────────────────────────────────────────────────────────
  const displayName = user.name ?? user.username;
  const initials = displayName.charAt(0).toUpperCase();
  const coverFallback =
    "bg-gradient-to-tr from-slate-900 via-[#533AFD]/30 to-[#9D7DC5]/30";

  return (
    <div className="min-h-screen-app bg-slate-950 text-slate-50 pb-24">
      {/* Cover */}
      <div className={`relative w-full h-48 md:h-64 ${coverFallback}`}>
        <Link
          href="/services"
          className="absolute top-4 left-4 p-2 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition-all z-10"
          aria-label="Back to services"
        >
          <ArrowLeft size={18} />
        </Link>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-16 md:-mt-20 relative z-10">
        {/* Avatar + Name + CTAs */}
        <div className="flex flex-col md:flex-row md:items-end gap-4 mb-6">
          <div className="relative inline-block">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-slate-950 bg-gradient-to-br from-[#9D7DC5] to-[#533AFD] flex items-center justify-center text-white text-4xl font-black overflow-hidden">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                initials
              )}
            </div>
            <div
              className={`absolute bottom-2 right-2 w-6 h-6 rounded-full border-4 border-slate-950 ${
                user.is_online ? "bg-emerald-500" : "bg-slate-500"
              }`}
              aria-label={user.is_online ? "Online" : "Offline"}
            />
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-3xl md:text-4xl font-black text-white truncate">
              {displayName}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              @{user.username} · {profileRow.category.toLowerCase().replace(/_/g, " ")}
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm">
              <span className="flex items-center gap-1 text-amber-400">
                <Star size={14} className="fill-amber-400" />
                {profileRow.rating.toFixed(1)}
              </span>
              <span className="flex items-center gap-1 text-orange-400">
                <Flame size={14} /> {profileRow.sparkScore.toLocaleString()}
              </span>
              <span className="text-[#9D7DC5] font-mono">
                ₹{profileRow.perMinuteRate}/min
              </span>
              {profileRow.isVerified && (
                <span className="text-emerald-400 text-xs">✓ Verified</span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/chat/new?consultantId=${profileRow.userId}`}
              className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-[#9D7DC5] to-[#533AFD] text-white rounded-2xl text-sm font-bold hover:shadow-lg hover:shadow-[#533AFD]/30 transition-all"
            >
              <MessageSquare size={16} /> Chat
            </Link>
            <Link
              href={`/booking?consultantId=${profileRow.id}`}
              className="flex items-center gap-2 px-5 py-3 bg-white/5 border border-white/10 text-white rounded-2xl text-sm font-bold hover:bg-white/10 transition-all"
            >
              <Calendar size={16} /> Book
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 p-5 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl mb-6">
          <StatCell label="Sessions"  value={profileRow.totalConsultations} />
          <StatCell label="Followers" value={followers} />
          <StatCell label="Sparks"    value={profileRow.sparkScore} />
          <StatCell label="Rating"    value={profileRow.rating.toFixed(1)} />
        </div>

        {/* Bio */}
        {profileRow.bio && (
          <p className="text-slate-300 leading-relaxed mb-4">{profileRow.bio}</p>
        )}

        {/* Chips */}
        <div className="flex flex-wrap gap-2 mb-8">
          {(profileRow.specialties ?? []).map((s: string) => (
            <span
              key={s}
              className="px-3 py-1 rounded-full bg-[#9D7DC5]/10 border border-[#9D7DC5]/20 text-[#9D7DC5] text-xs"
            >
              {s}
            </span>
          ))}
          {(profileRow.languages ?? []).map((l: string) => (
            <span
              key={l}
              className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300 text-xs"
            >
              {l}
            </span>
          ))}
        </div>

        {/* Tabs */}
        <div className="mb-4 flex items-center gap-4 border-b border-white/5">
          <button className="pb-3 text-sm font-bold text-white uppercase tracking-wider border-b-2 border-[#9D7DC5]">
            Posts ({posts.length})
          </button>
          <button className="pb-3 text-sm font-bold text-slate-400 uppercase tracking-wider">
            Reviews ({reviews.length})
          </button>
        </div>

        {/* Post grid */}
        {posts.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-white/5 rounded-3xl">
            <p className="text-slate-400 text-sm">No posts yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1 md:gap-2">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/post/${post.id}`}
                className="aspect-square relative group overflow-hidden rounded-lg"
              >
                {post.mediaUrls && post.mediaUrls.length > 0 ? (
                  <img
                    src={post.mediaUrls[0]}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-900 to-slate-950 flex items-center justify-center p-3">
                    <p className="text-[10px] text-slate-300 line-clamp-4 text-center">
                      {post.content}
                    </p>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 text-white text-xs">
                  <span>❤️ {post.cheerCount}</span>
                  <span>💬 {post.commentCount}</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Reviews preview */}
        {reviews.length > 0 && (
          <div className="mt-10">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">
              Recent Reviews
            </h2>
            <div className="space-y-3">
              {reviews.slice(0, 5).map((r, i) => {
                const reviewer = pickOne(r.user);
                return (
                  <div
                    key={i}
                    className="p-4 bg-slate-900/60 border border-white/5 rounded-2xl"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-white overflow-hidden">
                        {reviewer?.avatar ? (
                          <img
                            src={reviewer.avatar}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          (reviewer?.name ?? "?").charAt(0).toUpperCase()
                        )}
                      </div>
                      <span className="text-sm font-medium text-white">
                        {reviewer?.name ?? "Anonymous"}
                      </span>
                      <span className="text-amber-400 text-xs ml-auto">
                        {"⭐".repeat(Math.max(0, Math.min(5, r.rating ?? 0)))}
                      </span>
                    </div>
                    {r.review && (
                      <p className="text-sm text-slate-300">{r.review}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function StatCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center">
      <div className="text-lg md:text-2xl font-black text-white font-mono">
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      <div className="text-[10px] md:text-xs text-slate-400 uppercase tracking-wider mt-1">
        {label}
      </div>
    </div>
  );
}