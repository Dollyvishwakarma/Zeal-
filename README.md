# Project Zeal

A comprehensive faith, wellness, and creator economy platform built with Next.js 16, React 19, and a modular monolith architecture.

## ✨ Features

- **Multi-Faith Consultation** – Astrologers, psychologists, tarot readers, healers, and coaches across all faiths
- **Instagram-Style Social** – Feed, explore, sparks, and chat
- **AI Astrologers** – 24/7 AI-powered consultations (3 free, 2 paid per category)
- **Per-Minute Billing** – Real-time billing for chat, voice, and video consultations
- **Spark Economy** – Earn Sparks through engagement, redeem for promotions
- **Real-Time Notifications** – WebSocket-powered notifications with click-to-redirect
- **Admin Dashboard** – Complete management for bookings, users, healers, and content
- **Video Calls** – LiveKit-powered video conferencing
- **Creator Marketplace** – Spark Bazaar for influencer promotions
- **Referral Program** – Earn Sparks by referring friends
- **Daily Quests** – Gamification with daily and weekly challenges

## 🏗️ Architecture

- **Monorepo**: Turborepo with npm workspaces
- **Frontend**: Next.js 16 App Router + React 19
- **Backend**: Fastify 5 + Prisma 7
- **Database**: PostgreSQL (Neon Serverless)
- **Cache**: Redis (Upstash)
- **Storage**: Cloudflare R2
- **Auth**: Clerk
- **Real-time**: Socket.io + Redis Pub/Sub
- **Video**: LiveKit
- **AI**: Zhipu AI + Agnes AI + Groq
- **Payments**: Razorpay

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- npm or pnpm

### Installation

\`\`\`bash
# Clone the repository
git clone https://github.com/your-org/zeal.git
cd zeal

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Fill in your variables

# Start development server
npm run dev
\`\`\`

### Workspaces

\`\`\`bash
# Web app (user-facing)
npm run dev --workspace=web

# Admin dashboard
npm run dev --workspace=admin

# API backend
npm run dev --workspace=api
\`\`\`

## 📦 Deployment

\`\`\`bash
# Run production build
npm run build

# Deploy to Vercel (web & admin)
./scripts/deploy-production.sh

# Or deploy with Docker
docker-compose up -d
\`\`\`

## 📁 Project Structure

\`\`\`
zeal/
├── apps/
│   ├── web/          # User-facing Next.js app
│   ├── admin/        # Admin dashboard
│   └── api/          # Fastify API backend
├── packages/
│   ├── types/        # Shared TypeScript types
│   ├── utils/        # Shared utilities
│   ├── ui/           # Shared UI components
│   └── database/     # Prisma client
├── docker/           # Docker configuration
├── scripts/          # Utility scripts
├── .github/          # GitHub Actions workflows
└── docs/             # Documentation
\`\`\`

## 🔧 Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start all workspaces in development mode |
| `npm run build` | Build all workspaces |
| `npm run lint` | Run linting |
| `npm run type-check` | Run TypeScript type checking |
| `npm test` | Run tests |
| `./scripts/audit.sh` | Run full project audit |
| `./scripts/health-check.sh` | Check service health |
| `./scripts/deploy-production.sh` | Deploy to production |
| `./scripts/rollback.sh` | Rollback deployment |
| `./scripts/alerting.sh` | Run health checks and send alerts |

## 🛡️ Security

- Environment variables for secrets
- Clerk authentication with MFA
- Input validation with Zod
- Rate limiting on API routes
- Security headers (CSP, HSTS, XSS protection)
- SQL injection prevention (Prisma)
- HTTPS enforced

## 📖 API Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/posts/feed` | Get feed posts |
| POST | `/api/posts/create` | Create a post |
| GET | `/api/explore/search` | Search consultants |
| GET | `/api/sparks/feed` | Get spark activities |
| GET | `/api/users/[userId]/profile` | Get user profile |
| POST | `/api/payments/create-order` | Create payment order |
| GET | `/api/bazaar/listings` | Get bazaar listings |
| GET | `/api/quests` | Get quests |
| POST | `/api/quests/[questId]/complete` | Complete a quest |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing`)
5. Open a Pull Request

## 📄 License

MIT

## 🙏 Acknowledgements

- [Next.js](https://nextjs.org/)
- [React](https://react.dev/)
- [Clerk](https://clerk.com/)
- [LiveKit](https://livekit.io/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Prisma](https://www.prisma.io/)
- [Razorpay](https://razorpay.com/)
- [Zhipu AI](https://zhipuai.cn/)
- [Agnes AI](https://agnes.ai/)
- [Groq](https://groq.com/)
