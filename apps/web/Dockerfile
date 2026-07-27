# syntax=docker/dockerfile:1
# Build multi-stage do @vero/web (Next.js 15, output standalone). Não-root,
# base mínima (§4 A02). Mesmo padrão turbo prune do apps/api/Dockerfile.

FROM node:20-alpine AS base
RUN corepack enable
RUN apk add --no-cache libc6-compat

# ---- 1) prune: monorepo reduzido só ao necessário p/ @vero/web ----
FROM base AS pruner
WORKDIR /app
COPY . .
# Versão FIXA — ver nota equivalente em apps/api/Dockerfile.
RUN npx turbo@2.9.16 prune @vero/web --docker

# ---- 2) build ----
FROM base AS builder
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml
RUN corepack prepare pnpm@8.15.6 --activate && pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
COPY turbo.json ./turbo.json
# API_BASE_URL só precisa existir em runtime (lib/session.ts lê em request
# time, não em build time) — nada de segredo entra na imagem aqui.
RUN npx turbo run build --filter=@vero/web

# ---- 3) runtime: output "standalone" do Next — sem instalar node_modules ----
FROM node:20-alpine AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 vero && adduser --system --uid 1001 vero
COPY --from=builder --chown=vero:vero /app/apps/web/.next/standalone ./
COPY --from=builder --chown=vero:vero /app/apps/web/.next/static ./apps/web/.next/static

USER vero
WORKDIR /app/apps/web
EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000
CMD ["node", "server.js"]
