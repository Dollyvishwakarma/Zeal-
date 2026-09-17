FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/
COPY packages/*/package*.json ./packages/

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy source
COPY . .

# Build web app
RUN npm run build --workspace=web

FROM node:20-alpine AS runner
WORKDIR /app

# Copy built assets
COPY --from=builder /app/apps/web/.next ./.next
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder /app/apps/web/package.json ./
COPY --from=builder /app/apps/web/next.config.js ./

# Install production dependencies
RUN npm ci --legacy-peer-deps --omit=dev

EXPOSE 3000
CMD ["npm", "start"]
