import { getExploreFeed } from "@/actions/discovery";
import Link from "next/link";
import { Sparkles, Compass, Star, Video, MessageCircle, ShieldCheck } from "lucide-react";

export default async function ExplorePage() {
  const { consultants, posts } = await getExploreFeed();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-10">
      
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-[2.5rem] p-8 bg-gradient-to-br from-purple-900/40 via-slate-900 to-indigo-950/60 border border-white/10 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/15 blur-[120px] rounded-full pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-bold mb-4">
            <Compass size={14} /> Discovery Network
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Connect with Elite Guides</h1>
          <p className="text-slate-400 text-sm mt-2 max-w-xl">Explore live insights, advisory posts, and connect instantly through secure real-time sessions.</p>
        </div>
      </div>

      {/* Online Consultants Horizontal Carousel / Grid */}
      <div>
        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Featured Guides</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {consultants.map((c: any) => (
            <Link 
              key={c.id} 
              href={`/consultant/${c.id}`}
              className="btn-3d p-4 rounded-3xl bg-slate-900/80 border border-white/10 flex flex-col items-center text-center group hover:border-purple-500/40 transition-all"
            >
              <div className="relative w-16 h-16 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-bold text-xl uppercase overflow-hidden mb-3 group-hover:scale-105 transition-transform">
                {c.avatar_url ? <img src={c.avatar_url} alt={c.full_name} className="w-full h-full object-cover" /> : c.full_name.charAt(0)}
                {c.is_online && <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-slate-900 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />}
              </div>
              <h4 className="font-bold text-white text-sm truncate w-full">{c.full_name}</h4>
              <p className="text-[10px] text-purple-400 font-semibold uppercase tracking-wider mt-1">Verified Guide</p>
            </Link>
          ))}
          {consultants.length === 0 && (
            <p className="text-slate-500 text-xs italic col-span-full py-4 text-center">No consultants active right now.</p>
          )}
        </div>
      </div>

      {/* Discovery Posts Feed */}
      <div>
        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Community Feed</h2>
        <div className="space-y-6">
          {posts.map((post: any) => (
            <div key={post.id} className="bg-slate-900/80 border border-white/10 rounded-3xl p-6 shadow-xl relative overflow-hidden">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-bold text-sm uppercase overflow-hidden">
                  {post.profiles?.avatar_url ? <img src={post.profiles.avatar_url} alt="" className="w-full h-full object-cover" /> : (post.profiles?.full_name?.charAt(0) || "U")}
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">{post.profiles?.full_name || "Consultant"}</h4>
                  <p className="text-[10px] text-slate-500">{new Date(post.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              <p className="text-slate-300 text-sm leading-relaxed mb-4">{post.content}</p>

              {post.image_url && (
                <div className="rounded-2xl overflow-hidden border border-white/5 mb-4 max-h-96">
                  <img src={post.image_url} alt="Post media" className="w-full h-full object-cover" />
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <Link href={`/consultant/${post.consultant_id}`} className="text-xs font-bold text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1.5">
                  <ShieldCheck size={14} /> View Consultant Profile
                </Link>
              </div>
            </div>
          ))}
          {posts.length === 0 && (
            <div className="text-center py-12 bg-slate-900/40 border border-white/5 rounded-3xl">
              <p className="text-slate-500 text-sm">No community posts available yet.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
