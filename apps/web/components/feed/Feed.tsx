"use client";
import { useCallback, useEffect } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import { Loader2, Newspaper } from "lucide-react";
import { PostCard, type PostCardData } from "./PostCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { useRealtime } from "@/hooks/useRealtime";

interface FeedPage {
  posts: PostCardData[];
  nextCursor?: string;
}

const PAGE_SIZE = 10;

export function Feed() {
  const qc = useQueryClient();
  const { ref: loadMoreRef, inView } = useInView({ rootMargin: "200px" });

  const query = useInfiniteQuery<
    FeedPage,
    Error,
    { pages: FeedPage[]; pageParams: Array<string | undefined> },
    readonly ["feed"],
    string | undefined
  >({
    queryKey: ["feed"] as const,
    initialPageParam: undefined,
    queryFn: async ({ pageParam }) => {
      const url = pageParam
        ? "/api/posts/feed?cursor=" + encodeURIComponent(String(pageParam)) + "&limit=" + PAGE_SIZE
        : "/api/posts/feed?limit=" + PAGE_SIZE;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch feed");
      return res.json() as Promise<FeedPage>;
    },
    getNextPageParam: (last) => last.nextCursor,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  useRealtime<{ id?: string }>(
    "feed:global",
    "post:created",
    useCallback(() => { qc.invalidateQueries({ queryKey: ["feed"] }); }, [qc]),
  );

  useEffect(() => {
    if (inView && query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage();
    }
  }, [inView, query]);

  if (query.status === "pending") {
    return (
      <div className="space-y-4" aria-busy="true" aria-live="polite">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl border border-[#E1C5E7] dark:border-gray-700 p-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#E1C5E7] dark:bg-gray-700" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-[#E1C5E7] dark:bg-gray-700 rounded w-24" />
                <div className="h-3 bg-[#E1C5E7] dark:bg-gray-700 rounded w-16" />
              </div>
            </div>
            <div className="mt-3 h-4 bg-[#E1C5E7] dark:bg-gray-700 rounded w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (query.status === "error") {
    return (
      <div className="text-center py-12 text-red-500" role="alert">
        Failed to load feed.
        <button onClick={() => void query.refetch()} className="text-[#9D7DC5] underline ml-1">
          Retry
        </button>
      </div>
    );
  }

  const posts = query.data?.pages.flatMap((p) => p.posts) ?? [];

  if (posts.length === 0) {
    return (
      <EmptyState
        icon={Newspaper}
        title="No posts yet"
        description="Follow consultants to see their updates here."
      />
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
      <div ref={loadMoreRef} className="h-12 flex justify-center items-center">
        {query.isFetchingNextPage && (
          <Loader2 className="w-6 h-6 animate-spin text-[#9D7DC5]" aria-label="Loading more" />
        )}
      </div>
    </div>
  );
}

