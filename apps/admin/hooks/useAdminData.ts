'use client';
import { useQuery, UseQueryOptions } from '@tanstack/react-query';

export interface UseAdminDataOptions<T> extends UseQueryOptions<T> {
  queryKey: string[];
  url: string;
  params?: Record<string, any>;
}

export function useAdminData<T>(
  options: UseAdminDataOptions<T>
) {
  const {
    queryKey,
    url,
    params,
    ...restOptions
  } = options;

  return useQuery<T>({
    queryKey,
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.append(key, String(value));
          }
        });
      }
      const queryString = searchParams.toString();
      const fullUrl = queryString ? `${url}?${queryString}` : url;
      const res = await fetch(fullUrl);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Failed to fetch data (${res.status})`);
      }
      return res.json();
    },
    retry: 1,
    staleTime: 1000 * 60 * 5,
    ...restOptions,
  });
}
