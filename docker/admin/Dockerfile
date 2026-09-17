FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY apps/admin/package*.json ./apps/admin/
COPY packages/*/package*.json ./packages/

RUN npm ci --legacy-peer-deps

COPY . .
RUN npm run build --workspace=admin

FROM node:20-alpine AS runner
WORKDIR /app

COPY --from=builder /app/apps/admin/.next ./.next
COPY --from=builder /app/apps/admin/public ./public
COPY --from=builder /app/apps/admin/package.json ./
COPY --from=builder /app/apps/admin/next.config.js ./

RUN npm ci --legacy-peer-deps --omit=dev

EXPOSE 3001
CMD ["npm", "start"]
