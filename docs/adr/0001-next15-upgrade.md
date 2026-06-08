# ADR 0001 — Web em Next.js 15 (em vez de Next.js 14)

- **Status:** Aceito
- **Data:** 2026-06-08
- **Sessão:** S7a (registrado na S7b)
- **Contexto §3 original:** o CLAUDE.md §3 fixava o web em **Next.js 14**.

## Contexto

Ao scaffoldar `apps/web` na S7a, o `pnpm audit` acusou **6 vulnerabilidades HIGH**
no Next.js 14 (DoS, SSRF e bypass de middleware) **sem patch disponível na linha
14.x** — só corrigidas a partir de `next@>=15.5.16`. Havia ainda 1 vulnerabilidade
moderate (XSS) em `postcss`.

## Decisão

Subir o web para **Next.js 15 + React 19** (`next@^15.5.16`) e forçar
`postcss@>=8.5.10` via `pnpm.overrides`. A §4 (segurança não-negociável) prevalece
sobre o pin de versão da §3; o §3 foi atualizado para refletir Next 15.

## Consequências

- **Positivo:** `pnpm audit` zera (6 high + 1 moderate resolvidos); base alinhada
  com App Router/Server Actions atuais.
- **Migração 14→15 exigida:**
  - `cookies()` / `headers()` passam a ser **assíncronos** (`await`) — ver
    `apps/web/lib/session.ts` e `middleware.ts`.
  - `useFormState` → `useActionState` (React 19) — ver telas client.
- **Risco:** superfície de API nova do Next 15; mitigado por manter a lógica de
  auth concentrada no middleware/Server Actions (BFF) e cobertura de build/lint.

## Alternativas consideradas

- **Permanecer no Next 14 e aceitar as HIGH:** rejeitado — viola §4 (fail-closed,
  deny-by-default; não rodar com vulnerabilidade conhecida sem patch).
- **Fixar versão menor do 15:** rejeitado — `>=15.5.16` é o piso que corrige as CVEs.
