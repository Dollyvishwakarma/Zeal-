'use client';
import { useInfiniteQuery } from '@tanstack/react-query';

interface FeedResponse {
  posts: unknown[];
  nextCursor?: number;
}

export function useFeed() {
  return useInfiniteQuery<FeedResponse, Error>({
    queryKey: ['feed'],
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      const res = await fetch(`/api/posts/feed?cursor=${pageParam}`);
      if (!res.ok) throw new Error('Failed to fetch feed');
      const data: FeedResponse = await res.json();
      return data;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 1000 * 60,
    refetchOnWindowFocus: false,
  });
}
