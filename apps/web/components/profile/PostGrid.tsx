"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Heart, MessageCircle, Loader2, ImageIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";

interface PostItem { id: string; imageUrl: string; cheerCount: number; commentCount: number; }

export function PostGrid({ userId }: { userId: string }) {
  const [selected, setSelected] = useState<PostItem | null>(null);

  const { data, isLoading } = useQuery<PostItem[]>({
    queryKey: ["posts", userId],
    queryFn: async () => {
      const res = await fetch("/api/users/" + userId + "/posts");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!userId,
  });

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[#9D7DC5]" /></div>;
  const posts = data || [];
  if (posts.length === 0) return <EmptyState icon={ImageIcon} title="No posts yet" description="Posts will appear here once shared." />;

  return (
    <>
      <div className="grid grid-cols-3 gap-1 mt-4">
        {posts.map((post) => (
          <button key={post.id} onClick={() => setSelected(post)} className="aspect-square relative group overflow-hidden rounded-lg">
            <img src={post.imageUrl} alt="Post" className="w-full h-full object-cover" loading="lazy" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white">
              <span className="flex items-center gap-1"><Heart className="w-5 h-5 fill-white" /> {post.cheerCount}</span>
              <span className="flex items-center gap-1"><MessageCircle className="w-5 h-5" /> {post.commentCount}</span>
            </div>
          </button>
        ))}
      </div>
      {selected && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)} role="button" aria-label="Close">
          <div className="max-w-2xl w-full bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-2xl">
            <img src={selected.imageUrl} alt="Post" className="w-full max-h-[80vh] object-contain" />
          </div>
        </div>
      )}
    </>
  );
}

