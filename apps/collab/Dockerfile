# Multi-stage Dockerfile for @crucible/collab (Render Free Web Service)
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

FROM base AS dependencies
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/config/package.json ./packages/config/
COPY apps/collab/package.json ./apps/collab/

RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/packages ./packages
COPY --from=dependencies /app/apps/collab/node_modules ./apps/collab/node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ ./packages/
COPY apps/collab/ ./apps/collab/

RUN pnpm --filter @crucible/shared build
RUN pnpm --filter @crucible/collab build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/collab/package.json ./apps/collab/
COPY --from=builder /app/apps/collab/dist ./apps/collab/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/collab/node_modules ./apps/collab/node_modules

EXPOSE 10000
WORKDIR /app/apps/collab

CMD ["node", "dist/index.js"]

