# Supabase Realtime Setup for Zeal

## 1. Enable Realtime on Tables

Go to Supabase Dashboard → Database → Replication → Source.

Enable replication for:

- Notification
- Wallet
- Transaction
- Booking
- CallSession

## 2. Architecture

Browser → Supabase Realtime (WebSocket) → Broadcast to subscribers
Vercel Function → serverPublish() → Supabase REST

Vercel never holds WebSocket connections.

## 3. Server → Client Publishing

import { serverPublish } from "@/lib/realtime/server";

await serverPublish(`user:${userId}`, "notification", {
  id: notif.id,
  message: "New booking confirmed",
});

## 4. Client → Client Publishing

import { publishToChannel } from "@/lib/realtime/supabase-realtime";

await publishToChannel(`chat:${chatId}`, "message", { content: "Hi" });

## 5. Free Tier Limits

| Metric | Free Limit |
|--------|-----------|
| Concurrent connections | 200 |
| Messages per month | 2,000,000 |
| Channel joins per month | 2,000,000 |

## 6. Environment Variables

NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
NEXT_PUBLIC_REALTIME_ENABLED=true

## 7. Testing

1. Open app in two browser tabs (same user)
2. Trigger event in one tab (book a session)
3. Other tab receives it in <200ms

## 8. Fallback

If Realtime fails, React Query auto-refetches every 30s.
