# @zeal/database

Supabase-only data layer for Zeal. Replaces Prisma entirely.

## Clients

- `createClient()` — browser (anon key, RLS enforced)
- `createServerClientFromCookies()` — server components / routes
- `getUserId()` / `getActorRole()` — session helpers
- `getAdminClient()` — service role (bypasses RLS)

## Queries

`Queries.Users`, `Queries.Consultants`, `Queries.Bookings`,
`Queries.Wallet`, `Queries.Notifications`, `Queries.Posts`,
`Queries.Chat`, `Queries.AIConsultants`

## Services

`Ledger`, `NotificationService`, `CallBilling`, `audit()`,
`requestMeta()`, `generateSlots()`

## Migrations

SQL lives in `supabase/migrations/` at the repo root.
