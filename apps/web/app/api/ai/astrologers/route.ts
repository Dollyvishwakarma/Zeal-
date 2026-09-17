import { NextResponse } from 'next/server';
import { withErrorHandler } from '@/lib/errors';

export const GET = withErrorHandler(async () => {
  // Mock data – replace with database query
  const astrologers = [
    { id: 'ai1', name: 'AstroAI-1', specialty: 'Vedic Astrology', isFree: true, rating: 4.8 },
    { id: 'ai2', name: 'AstroAI-2', specialty: 'Nadi Astrology', isFree: true, rating: 4.7 },
    { id: 'ai3', name: 'AstroAI-3', specialty: 'Western Astrology', isFree: true, rating: 4.6 },
    { id: 'ai4', name: 'AstroAI-4', specialty: 'Premium Vedic', isFree: false, perMinuteRate: 2, rating: 4.9 },
    { id: 'ai5', name: 'AstroAI-5', specialty: 'Premium Nadi', isFree: false, perMinuteRate: 2, rating: 4.9 },
  ];
  return NextResponse.json(astrologers);
});
