'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function useBooking() {
  const queryClient = useQueryClient();

  const createBooking = useMutation({
    mutationFn: async (data: {
      consultantId: string;
      scheduledAt: string;
      durationMinutes: number;
      externalEmail?: string;
    }) => {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Failed to create booking');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });

  const cancelBooking = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/bookings/${id}/cancel`, {
        method: 'POST',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Failed to cancel booking');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });

  const useBookings = (status?: string) => {
    return useQuery({
      queryKey: ['bookings', status],
      queryFn: async () => {
        const url = status ? `/api/bookings?status=${status}` : '/api/bookings';
        const res = await fetch(url);
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error?.message || 'Failed to fetch bookings');
        }
        return res.json();
      },
    });
  };

  return { createBooking, cancelBooking, useBookings };
}
