FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.29.3 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/
COPY packages/config/package.json ./packages/config/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile

COPY tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

RUN pnpm --filter @crucible/shared build
RUN pnpm --filter @crucible/api prisma:generate
RUN pnpm --filter @crucible/api build

FROM node:22-alpine AS runner

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.29.3 --activate

ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --prod --frozen-lockfile

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

EXPOSE 4000

CMD ["node", "apps/api/dist/main.js"]

