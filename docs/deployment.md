# Project Zeal – Deployment Guide

## 1. Prerequisites

- Vercel account (for web & admin)
- Fly.io account (for API) or Docker host
- Environment variables set up

## 2. Environment Variables

See `.env.production.template` for all required variables.

## 3. Deploying to Vercel

### Web App
\`\`\`bash
cd apps/web
vercel --prod
\`\`\`

### Admin Dashboard
\`\`\`bash
cd apps/admin
vercel --prod
\`\`\`

## 4. Deploying API to Fly.io

\`\`\`bash
cd apps/api
flyctl deploy --app zeal-api
\`\`\`

## 5. Deploying with Docker

\`\`\`bash
docker-compose up -d
\`\`\`

## 6. Post-Deployment Checks

1. Run health check: `./scripts/health-check.sh`
2. Verify authentication works
3. Test chat and video calls
4. Test payment flow
5. Verify admin dashboard

## 7. Monitoring

- Vercel provides built-in monitoring for web and admin.
- Fly.io provides logs and metrics for API.
- Use `./scripts/alerting.sh` for custom alerts.
