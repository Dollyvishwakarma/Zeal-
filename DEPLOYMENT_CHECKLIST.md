# Project Zeal – Deployment Checklist

## Pre-Deployment
- [ ] All environment variables set in Vercel:
  - [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - [ ] `CLERK_SECRET_KEY`
  - [ ] `DATABASE_URL` (if using database)
  - [ ] `NEXT_PUBLIC_WS_URL` (WebSocket URL)
  - [ ] `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET`
  - [ ] `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`
  - [ ] `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
  - [ ] `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`
  - [ ] `GROQ_API_KEY` (for AI features)

- [ ] Run `npm run type-check` – pass
- [ ] Run `npm run lint` – pass
- [ ] Run `npm test` – pass
- [ ] Run `npm run build` – pass

## Deployment
- [ ] Run `./scripts/deploy-production.sh`
- [ ] Verify deployment URL
- [ ] Run `./scripts/health-check.sh`

## Post-Deployment
- [ ] Test authentication (login/register)
- [ ] Test chat functionality
- [ ] Test video calls (LiveKit)
- [ ] Test payment (Razorpay)
- [ ] Test AI astrologer chat
- [ ] Test admin dashboard
- [ ] Check error pages (404, 500)
- [ ] Test responsiveness on mobile

## Rollback
- [ ] Run `./scripts/rollback.sh` if needed
