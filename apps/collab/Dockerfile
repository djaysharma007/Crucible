FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.29.3 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/config/package.json ./packages/config/
COPY apps/collab/package.json ./apps/collab/

RUN pnpm install --frozen-lockfile

COPY tsconfig.base.json ./
COPY packages/shared/ ./packages/shared/
COPY apps/collab/ ./apps/collab/

RUN pnpm --filter @crucible/shared build
RUN pnpm --filter @crucible/collab build

FROM node:22-alpine AS runner

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.29.3 --activate

ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/collab/package.json ./apps/collab/

RUN pnpm install --prod --frozen-lockfile

COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/collab/dist ./apps/collab/dist

EXPOSE 1234

CMD ["node", "apps/collab/dist/index.js"]

