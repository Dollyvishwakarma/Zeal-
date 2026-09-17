import { getUserId } from "@/lib/auth";
import { NextResponse } from 'next/server';
import { NotificationService } from '@/lib/notifications/service';
import { withErrorHandler, AppError } from '@/lib/errors';

export const POST = withErrorHandler(async () => {
  const userId = await getUserId();
  if (!userId) throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');

  await NotificationService.markAllAsRead(userId);
  return NextResponse.json({ success: true });
});
