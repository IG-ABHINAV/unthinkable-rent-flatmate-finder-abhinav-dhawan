FROM node:22-alpine AS builder
RUN npm install -g pnpm
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile
COPY apps/api ./apps/api
RUN pnpm --filter @rent-finder/api prisma:generate
RUN pnpm --filter @rent-finder/api build

FROM node:22-alpine AS runner
RUN npm install -g pnpm
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

EXPOSE 4000
ENV NODE_ENV=production
CMD ["sh", "-c", "cd apps/api && npx prisma migrate deploy && cd ../.. && node apps/api/dist/server.js"]
