# syntax=docker/dockerfile:1
# Build multi-stage do @vero/api (NestJS). Não-root, base mínima (§4 A02).
# Padrão oficial Turborepo+pnpm p/ monorepo: `turbo prune` reduz a árvore só
# ao que este app precisa antes de instalar/compilar.

FROM node:20-alpine AS base
RUN corepack enable
RUN apk add --no-cache libc6-compat openssl

# ---- 1) prune: monorepo reduzido só ao necessário p/ @vero/api ----
FROM base AS pruner
WORKDIR /app
COPY . .
# Versão FIXA (não "latest") — antes do pnpm install não há turbo local
# instalado ainda, então o npx buscaria a mais nova do registry; uma versão
# diferente da que o lockfile foi gerado gerou um pruned lockfile quebrado
# ("no entry for /@alloc/quick-lru/5.2.0") na primeira tentativa desta sessão.
RUN npx turbo@2.9.16 prune @vero/api --docker

# ---- 2) build: instala deps (dev incluso) e compila ----
FROM base AS builder
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml
RUN corepack prepare pnpm@8.15.6 --activate && pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
COPY turbo.json ./turbo.json
RUN pnpm --filter @vero/api exec prisma generate
RUN npx turbo run build --filter=@vero/api

# ---- 3) runtime: só dependências de PRODUÇÃO + dist compilado ----
FROM base AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 vero && adduser --system --uid 1001 vero
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml
# Instala COM devDependencies (o CLI "prisma" é devDep; só "@prisma/client" é
# dependency de produção) — precisa do CLI presente pra rodar `generate` aqui
# embaixo. Gera o client e SÓ DEPOIS remove as devDependencies (`prune --prod`
# preserva o output já gerado dentro do próprio pacote @prisma/client).
RUN corepack prepare pnpm@8.15.6 --activate && pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/apps/api/prisma ./apps/api/prisma
RUN pnpm --filter @vero/api exec prisma generate
RUN pnpm prune --prod
COPY --from=builder /app/apps/api/dist ./apps/api/dist
# @vero/types é um pacote do WORKSPACE (não vem de registry) — o pnpm install
# só linka o source, quem compila o dist/ dele é o turbo build (builder).
COPY --from=builder /app/packages/types/dist ./packages/types/dist

USER vero
WORKDIR /app/apps/api
EXPOSE 3333
ENV NODE_ENV=production
CMD ["node", "dist/main.js"]
