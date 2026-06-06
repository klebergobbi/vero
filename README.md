# Vero

App de gestão para clínicas odontológicas e de estética — SaaS multi-tenant.
Monorepo **Turborepo + pnpm**. Princípio mestre: _deny-by-default, fail-closed · thin client, fat server._

> A constituição completa do projeto está em [`CLAUDE.md`](./CLAUDE.md). Leia §1–§9 antes de iniciar qualquer sessão.

## Estrutura

```
vero/
├── apps/
│   ├── api/                # NestJS — única fonte de verdade e de segredos
│   ├── web/                # Next.js 14 — gestão da clínica
│   ├── mobile-patient/     # Expo — App do Paciente
│   └── mobile-pro/         # Expo — App do Profissional
├── packages/
│   ├── config/             # presets eslint, tsconfig, prettier, tailwind
│   ├── types/              # tipos + schemas Zod compartilhados
│   ├── api-client/         # client HTTP tipado do backend
│   └── ui/                 # design tokens / componentes
└── infra/                  # Terraform (DigitalOcean)
```

## Requisitos

- Node `>=20`
- pnpm `8.15.6` (via Corepack: `corepack enable`)

## Comandos

```bash
pnpm install      # instala dependências do workspace
pnpm dev          # sobe os apps em desenvolvimento
pnpm build        # build de todos os pacotes/apps
pnpm lint         # lint do workspace
pnpm test         # testes
pnpm format       # formata com Prettier
```

## Ambiente

Copie `.env.example` para `.env` e preencha. O `.env` **nunca** é commitado.
