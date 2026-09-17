"use client";
import { useState, useCallback } from "react";
import Link from "next/link";
import { Heart, MessageCircle, Share2, Flag } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import { Avatar, AvatarImage, AvatarFallback } from "@zeal/ui";

export interface PostCardData {
  id: string;
  content: string;
  imageUrl?: string | null;
  author: { id?: string; username: string; name?: string | null; avatar?: string | null };
  cheerCount: number;
  commentCount: number;
  shareCount: number;
  createdAt: string;
}

interface PostCardProps { post: PostCardData; }


function ReportMenu({ postId }: { postId: string }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const submit = async (reason: string) => {
    try {
      await fetch("/api/posts/" + postId + "/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch { /* ignore */ }
    setOpen(false);
  };
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1 text-sm text-[#B8A1D9] hover:text-[#9D7DC5]" aria-label="More actions">
        <Flag className="w-5 h-5" />
      </button>
      {open && (
        <div className="absolute bottom-full right-0 mb-2 w-44 rounded-xl bg-white dark:bg-gray-900 border border-[#E1C5E7] dark:border-gray-700 shadow-xl overflow-hidden z-10">
          {["spam", "harassment", "inappropriate", "other"].map((r) => (
            <button key={r} onClick={() => submit(r)} className="block w-full text-left px-3 py-2 text-sm hover:bg-[#F4E8F7] dark:hover:bg-gray-800 capitalize">{r}</button>
          ))}
        </div>
      )}
      {done && <span className="text-xs text-green-600 absolute -bottom-5 right-0">Reported</span>}
    </div>
  );
}
export function PostCard({ post }: PostCardProps) {
  const [cheered, setCheered] = useState(false);
  const [cheers, setCheers] = useState(post.cheerCount);

  const handleCheer = useCallback(async () => {
    const wasCheered = cheered;
    const next = wasCheered ? cheers - 1 : cheers + 1;
    setCheers(next);
    setCheered(!wasCheered);
    try {
      const res = await fetch("/api/posts/" + post.id + "/cheer", {
        method: wasCheered ? "DELETE" : "POST",
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      if (typeof data.cheers === "number") setCheers(data.cheers);
    } catch {
      setCheers(cheers);
      setCheered(wasCheered);
    }
  }, [post.id, cheered, cheers]);

  const handleShare = useCallback(async () => {
    const url = typeof window !== "undefined" ? window.location.origin + "/post/" + post.id : "";
    try {
      if (navigator.share) await navigator.share({ url, title: "Check out this post on Zeal" });
      else await navigator.clipboard.writeText(url);
    } catch { /* user cancelled */ }
  }, [post.id]);

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-900 rounded-2xl border border-[#E1C5E7] dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
    >
      <header className="flex items-center gap-3 p-4">
        <Avatar className="w-10 h-10">
          <AvatarImage src={post.author.avatar || undefined} alt={post.author.username} />
          <AvatarFallback>{post.author.username[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="font-medium text-[#5E4B8B] dark:text-white truncate">@{post.author.username}</p>
          <p className="text-xs text-[#B8A1D9] dark:text-gray-400">
            {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
          </p>
        </div>
      </header>
      {post.imageUrl && (
        <img src={post.imageUrl} alt="Post" className="w-full aspect-square object-cover" loading="lazy" />
      )}
      <p className="p-4 text-[#5E4B8B] dark:text-white whitespace-pre-wrap break-words">{post.content}</p>
      <footer className="flex items-center justify-around p-3 border-t border-[#E1C5E7] dark:border-gray-700">
        <button onClick={handleCheer} className={"flex items-center gap-1 text-sm transition-colors " + (cheered ? "text-red-500" : "text-[#B8A1D9] hover:text-[#9D7DC5]")}>
          <Heart className={"w-5 h-5 " + (cheered ? "fill-red-500" : "")} />
          <span>{cheers}</span>
        </button>
        <Link href={"/post/" + post.id} className="flex items-center gap-1 text-sm text-[#B8A1D9] hover:text-[#9D7DC5]">
          <MessageCircle className="w-5 h-5" />
          <span>{post.commentCount}</span>
        </Link>
        <button onClick={handleShare} className="flex items-center gap-1 text-sm text-[#B8A1D9] hover:text-[#9D7DC5]">
          <Share2 className="w-5 h-5" />
          <span>{post.shareCount}</span>
        </button>
        <ReportMenu postId={post.id} />
      </footer>
    </motion.article>
  );
}

