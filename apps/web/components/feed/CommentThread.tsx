"use client";
import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Send, Loader2, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarImage, AvatarFallback, Button } from "@zeal/ui";

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; username: string; name?: string | null; avatar?: string | null };
  replies?: Comment[];
}

export function CommentThread({ postId }: { postId: string }) {
  const qc = useQueryClient();
  const [text, setText] = useState("");

  const { data, isLoading } = useQuery<{ comments: Comment[] }>({
    queryKey: ["comments", postId],
    queryFn: async () => {
      const res = await fetch("/api/posts/" + postId + "/comments");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const send = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch("/api/posts/" + postId + "/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => { setText(""); qc.invalidateQueries({ queryKey: ["comments", postId] }); },
  });

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    send.mutate(text.trim());
  }, [text, send]);

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[#9D7DC5]" /></div>;
  const comments = data?.comments || [];

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a comment…"
          className="flex-1 px-4 py-3 rounded-xl bg-white dark:bg-gray-900 border border-[#E1C5E7] dark:border-gray-700 text-[#5E4B8B] dark:text-white focus:ring-2 focus:ring-[#9D7DC5] outline-none"
          maxLength={1000}
          disabled={send.isPending}
        />
        <Button type="submit" variant="primary" disabled={!text.trim() || send.isPending}>
          {send.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </form>

      {comments.length === 0 ? (
        <div className="text-center py-8 text-[#B8A1D9] text-sm flex flex-col items-center gap-2">
          <MessageCircle className="w-6 h-6" />
          No comments yet. Be the first!
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="flex gap-3">
              <Avatar className="w-9 h-9 flex-shrink-0">
                <AvatarImage src={c.author.avatar || undefined} alt={c.author.username} />
                <AvatarFallback>{c.author.username[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="font-medium text-sm text-[#5E4B8B] dark:text-white">@{c.author.username}</span>
                  <span className="text-xs text-[#B8A1D9]">{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</span>
                </div>
                <p className="text-sm text-[#5E4B8B] dark:text-white mt-0.5 whitespace-pre-wrap break-words">{c.content}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

