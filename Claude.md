\# CLAUDE.md — Vero · App de gestão para clínicas odontológicas



> Memória e constituição do projeto. \*\*Toda sessão de Claude Code lê este arquivo primeiro\*\* e o atualiza ao final (§11). Não inicie sessão sem ler §1–§9.

>

> Princípio mestre: \*\*deny-by-default, fail-closed · thin client, fat server · 1 sessão = 1 feature = 3–5 arquivos.\*\*



\---



\## 0. MARCA



\*\*Nome:\*\* Vero — do latim/italiano "verdadeiro, genuíno". Posicionamento: \*a clínica em que o paciente confia e o dono tem controle de verdade.\* Tom: confiante, premium, gênero-neutro.



\*\*Apps e identificadores (sugestão — exigem domínio próprio correspondente):\*\*

\- App do Paciente → nome na loja \*\*"Vero"\*\* · bundle/package `br.com.vero.paciente`

\- App do Profissional → nome na loja \*\*"Vero Pro"\*\* · bundle/package `br.com.vero.pro`

\- Web de gestão → `app.vero.com.br` (sugerido) · API → `api.vero.com.br`



\*\*Taglines:\*\*

\- Marca: \*"Gestão de verdade pra sua clínica."\*

\- App do Paciente: \*"Sua clínica, sempre com você."\*

\- App Pro: \*"Sua clínica inteira, de verdade, num app."\*



\*\*Conceito de ícone:\*\* monograma \*\*"V"\*\* cuja diagonal direita termina como um \*\*check (✓)\*\* — funde \*verdade/confiança\* com a inicial da marca. Paleta confiante de saúde: índigo/teal profundo como base, com um acento fresco (verde-menta ou ciano) no traço do check. App do Paciente em variação mais clara/calorosa; App Pro em variação mais sólida/escura. Mesmo símbolo nos dois, diferenciando só o peso/cor — reforça que são a mesma marca.



> Pendência de marca antes do lançamento: confirmar os 3 portões (INPI classes 9/42/44; domínios vero.com.br / app.vero.com.br; reserva do nome "Vero" e "Vero Pro" no App Store Connect e Play Console). Registrar como ADR em /docs/adr ao decidir.



\---



\## 1. O QUE ESTAMOS CONSTRUINDO



SaaS de gestão para clínicas odontológicas e de estética, multi-tenant e multi-unidade. Cobre a jornada inteira: captar lead → agendar → atender → orçar → fechar tratamento → executar → cobrar → receber → analisar. Posicionamento: \*\*máquina de lucratividade\*\* (reduzir falta, reduzir inadimplência, aumentar conversão de orçamento).



Quatro superfícies sobre \*\*uma única API\*\*:



| Superfície | App | Tecnologia | Loja? |

|---|---|---|---|

| Gestão da clínica | `apps/web` | Next.js 14 (desktop/tablet) | Não |

| App do Paciente | `apps/mobile-patient` | Expo (React Native) | \*\*App Store + Play\*\* |

| App do Profissional | `apps/mobile-pro` | Expo (React Native) | \*\*App Store + Play\*\* |

| Backend único | `apps/api` | NestJS | — |



Prioridade: \*\*mobile (paciente + profissional) + web\*\*, com os dois apps mobile prontos para publicação \*\*desde a primeira sessão\*\*.



\---



\## 2. ARQUITETURA E ESTRUTURA DO MONOREPO



Monorepo \*\*Turborepo + pnpm workspaces\*\*. Regra de ouro: \*\*thin client, fat server\*\* — o frontend captura intenção e exibe resultado; o backend detém segredos, calcula tudo e é o proxy de toda integração externa.



```

vero/

├── apps/

│   ├── api/                # NestJS — única fonte de verdade e de segredos

│   ├── web/                # Next.js 14 — gestão da clínica (desktop/tablet)

│   ├── mobile-patient/     # Expo — App do Paciente (consumer, loja)

│   └── mobile-pro/         # Expo — App do Profissional (B2B, loja)

├── packages/

│   ├── types/              # tipos + schemas Zod compartilhados (front+back)

│   ├── api-client/         # client HTTP tipado do backend

│   ├── ui/                 # design tokens / componentes compartilhados

│   └── config/             # eslint, tsconfig, tailwind, prettier presets

├── infra/                  # Terraform (DigitalOcean) — infra como código

├── .github/workflows/      # CI/CD com gates

└── CLAUDE.md

```



Regras de arquitetura (não-negociáveis):

\- \*\*Separação de responsabilidades\*\*: um módulo NestJS por bounded context (§6); editar um não pode quebrar outro.

\- \*\*Validação em 3 camadas\*\*: Zod no form (UX) → class-validator no DTO (segurança, rejeita 400) → constraint no banco (integridade). Nunca confie no front como barreira.

\- \*\*Schemas Zod em `packages/types`\*\*, reusados nos 4 apps. Tipos derivam de Prisma + Zod, nunca duplicados à mão.

\- \*\*Multi-tenant\*\*: TODA tabela de negócio tem `tenantId` (e `unitId` quando aplicável). Guard injeta o tenant do JWT; nenhuma query roda sem filtro de tenant.



\---



\## 3. STACK E VERSÕES (alinhadas às lojas — jun/2026)



\- \*\*Backend\*\*: NestJS · Prisma · PostgreSQL · Redis · BullMQ.

\- \*\*Web\*\*: Next.js 14 (App Router) · TailwindCSS.

\- \*\*Mobile\*\*: Expo (SDK estável mais recente) · EAS Build/Submit/Update · Expo Router · Expo Notifications.

\- \*\*Infra\*\*: DigitalOcean (App Platform/Droplets + Managed Postgres + Managed Redis + Spaces) · Terraform.



\*\*Targets obrigatórios de loja (reconferir a cada release):\*\*

\- \*\*Android\*\*: `targetSdkVersion = 36` (Android 16) — exigido para apps novos/updates a partir de \*\*31/08/2026\*\*. Distribuir em \*\*AAB\*\*.

\- \*\*iOS\*\*: build com \*\*SDK do iOS 26+\*\* (exigência desde abr/2026). Universal iPhone/iPad, 64-bit.

\- Manter Expo SDK atualizado para satisfazer ambos.



\---



\## 4. SEGURANÇA — NÃO-NEGOCIÁVEL (OWASP Top 10:2025)



Aplicar em TODA sessão; prevalece sobre velocidade.



\*\*A01 — Controle de acesso (#1):\*\* deny-by-default; autorização SEMPRE no servidor antes da operação (`ForbiddenException`); \*\*anti-IDOR\*\* (`WHERE id=:id AND tenantId=:tenantId` e `ownerId` quando aplicável); CORS allowlist (nunca `\*` com credenciais); \*\*anti-SSRF\*\* em fetch de URL externa (allowlist de domínio, bloqueio de IP interno/metadados 169.254/10.x/127.x, timeout).



\*\*A02 — Config segura (#2):\*\* Helmet (CSP, HSTS, X-Content-Type-Options, X-Frame-Options); em produção Swagger/debug/logs verbosos OFF; sem defaults; cookies `httpOnly`+`secure`+`sameSite`; menor privilégio; containers não-root, base mínima, multi-stage.



\*\*Injeção/cripto/segredos:\*\* NUNCA segredo no código/front/comentário (vazou → rotacione já); Prisma parametrizado (nunca `$queryRawUnsafe` com input); sanitizar input; rate limit em endpoints públicos (login mais restrito); HTTPS sempre; dado sensível cifrado em repouso; senha com \*\*argon2/bcrypt\*\*; segredos via env/secrets manager, `.env` nunca commitado.



\*\*A07 — Auth/sessão:\*\* senha forte + anti-brute-force; MFA para admin; JWT access curto + \*\*refresh rotativo revogável no Redis\*\*; logout invalida; erro de login genérico.



\*\*Erro/resiliência:\*\* \*\*fail-closed\*\*; nunca expor stack trace (genérico fora, detalhe no log); tratar timeout/falha de dependência; BullMQ jobs \*\*idempotentes\*\* + retry/backoff + DLQ; graceful shutdown.



\*\*Observabilidade (A09):\*\* log JSON com trace id; registrar evento de segurança (login, authz negada, mudança de permissão, acesso a dado sensível); nunca logar segredo/PII; alertas para 5xx/falha de auth/indisponibilidade; healthcheck.



\*\*Supply chain (A06/A08):\*\* lockfile commitado; `pnpm audit`/SCA no pipeline; versões fixas em libs críticas.



\---



\## 5. REQUISITOS DE LOJA — EMBUTIR DESDE A SESSÃO 1



Parte do "Definition of Done" de qualquer feature mobile. Causa #1 de rejeição Apple = app incompleto (Guideline 2.1).



\- \*\*Exclusão de conta in-app\*\* (`DELETE /me` + URL web pública), respeitando guarda legal do prontuário (Apple 5.1.1 + Google).

\- \*\*Privacy Policy + Termos\*\* em URL pública, acessíveis no app, antes da 1ª submissão; linkados no App Store Connect e Play Console.

\- \*\*App Privacy Labels / Data Safety\*\* honestos: coletamos \*\*dado de saúde\*\* (sensível) e \*\*financeiro\*\*; consentimento explícito; nunca para tracking/ads.

\- \*\*Conta demo\*\* para revisor, documentada nas notas de revisão.

\- \*\*Permissões mínimas\*\*, justificadas; iOS usage strings claras; sem APIs privadas.

\- \*\*Push\*\* via Expo Notifications (APNs+FCM).

\- \*\*Sem segredos no bundle\*\* (thin client).

\- \*\*Crash reporting\*\* (Sentry); zero placeholder/link quebrado na submissão.

\- \*\*Disclosure de IA\*\* se a feature usa IA/automação.

\- Versionar `version` + `versionCode`/`buildNumber` a cada submissão; OTA (EAS Update) só p/ JS, nunca muda propósito do app.

\- Pipeline: EAS Build → trilha interna (TestFlight/Internal) → revisão → produção.



\---



\## 6. MODELO DE DOMÍNIO (referência para módulos e schema)



Tudo com `tenantId`. Bounded contexts:

\- \*\*Org/Acesso\*\*: `Tenant`→`Clinic`→`Unit`→`Room`; `User`↔`Role`↔`Permission`; `Professional`(CRO, especialidades, comissão).

\- \*\*Paciente/Clínico\*\*: `Patient`(origem, indicado\_por); `Anamnesis`/`AnamnesisTemplate`; `MedicalRecord`→`RecordEntry`,`Attachment`,`Odontogram`,`ToothCondition`; `SpecialtyForm`; `Consent/Signature`; `AlignerCase`→`AlignerStep`.

\- \*\*Agenda\*\*: `Appointment`(status, marcadores); `Availability`; `ConfirmationEvent`; `WaitList`; `ReturnAlert`.

\- \*\*Comercial/Financeiro\*\*: `Procedure`/`PriceTable`/`Plan`; `Budget`→`BudgetItem`; `Contract`; `TreatmentPlan`→`TreatmentItem`→`ExecutionLog`; `Charge`→`Installment`; `Invoice`(NFS-e),`Receipt`,`Boleto`,`PixCharge`,`CardTransaction`; `Payment`→`Reconciliation`; `CollectionRule`→`CollectionEvent`; `CreditCheck`(SPC).

\- \*\*Operacional/Gestão\*\*: `Account`(pagar/receber),`CashFlow`,`BankReconciliation`; `Inventory`→`Item`,`StockMovement`,`Batch`; `Commission`; `Goal`; `Royalty`; `CRMLead`→`LeadSource`,`Referral`,`CRCTask`; `Notification`,`MessageLog`; `AuditLog`.



\---



\## 7. INTEGRAÇÕES (todas via backend, nunca no client)



WhatsApp \*\*Evolution API\*\* · Pagamentos \*\*Asaas\*\* (PIX/boleto/cartão/recorrência/split p/ royalties) · NFS-e via \*\*integrador\*\* (PlugNotas/Focus/eNotas) · Crédito \*\*SPC/Serasa\*\* · Assinatura \*\*ICP-Brasil\*\* (Clicksign/D4Sign/BirdID, com trilha: IP+timestamp+hash) · Storage \*\*DO Spaces\*\* (URLs assinadas) · \*\*Sentry\*\*.



Filas BullMQ: `confirmation-sender`, `collection-ruler`, `payment-reconciler`, `nfse-emitter`, `return-alert-scheduler`, `report-builder`, `spc-query`, `push-sender`.



\---



\## 8. CONVENÇÕES DE CÓDIGO



TS estrito (sem `any` injustificado) · \*\*solução mais simples possível, nada além dos critérios de aceitação\*\* · antes de criar helper, "já existe algo similar?" e reusar de `packages/` · ler arquivo inteiro antes de editar · teste para toda feature · remover debug antes do commit · commits pequenos · migrations revisadas com rollback/backup (nunca destrutiva sem backup) · ADR curto em `/docs/adr`.



\---



\## 9. WORKFLOW DE SESSÃO



\- \*\*1 sessão = 1 feature = 1 módulo = máx. 3–5 arquivos.\*\* Mais que isso → quebre em sub-tarefas sequenciais.

\- Antes de implementar: pesquisar padrões/imports existentes e colar exemplos reais.

\- Especificar exatamente os arquivos a criar/modificar.

\- CLAUDE.md acumula contexto; nunca recomeça.



\*\*Definition of Done (ao fim de cada sessão):\*\* (1) aceite atendido; (2) testes passando; (3) sem debug/segredo, `.env` fora do git; (4) `pnpm audit` sem high/critical; (5) deny-by-default + anti-IDOR verificados; (6) fail-closed sem vazar stack trace; (7) nada anterior quebrou; (8) regras de loja (§5) se mobile; (9) migration com rollback/backup, pipeline verde; (10) \*\*§11 atualizado\*\* e `\[x]` marcado em §10.



\---



\## 10. BACKLOG DETALHADO DE SESSÕES



Cada sessão é uma mini-spec. As regras transversais de §4 e §5 valem sempre; abaixo só anoto o que é \*\*específico\*\* de cada sessão. `\[ ]` → marque `\[x]` ao concluir.



\### FASE 0 — Fundação



\#### \[x] S0 — Scaffold do monorepo

\*\*Depende de:\*\* —

\*\*Objetivo:\*\* Esqueleto Turborepo + pnpm que builda vazio, com presets compartilhados.

\*\*Arquivos:\*\*

\- `pnpm-workspace.yaml` — declara `apps/\*` e `packages/\*`.

\- `turbo.json` — pipelines `build`, `lint`, `test`, `dev` com cache.

\- `package.json` (raiz) — scripts orquestradores, engines (node/pnpm fixos).

\- `packages/config/` — presets `eslint`, `tsconfig.base.json`, `prettier`, `tailwind`.

\- `.gitignore` + `.env.example` (sem segredo real) + `README` curto.

\*\*Específico de segurança:\*\* `.env` no `.gitignore` desde já; nenhum segredo no `.env.example`.

\*\*Aceite:\*\* `pnpm install` resolve; `pnpm build` e `pnpm lint` passam com workspaces vazios; lockfile commitado.



\#### \[x] S1 — Base do backend (NestJS endurecido)

\*\*Depende de:\*\* S0

\*\*Objetivo:\*\* API que sobe com config validada, segura por padrão e observável.

\*\*Arquivos:\*\*

\- `apps/api/src/main.ts` — Helmet (CSP/HSTS), CORS allowlist via env, rate limit global, `enableShutdownHooks`, logger JSON.

\- `apps/api/src/app.module.ts` — ConfigModule global + ThrottlerModule + PrismaModule + HealthModule.

\- `apps/api/src/config/env.validation.ts` — schema Zod das envs (DATABASE\_URL, REDIS\_URL, JWT\_SECRET, CORS\_ORIGINS, NODE\_ENV); falha na inicialização se faltar.

\- `apps/api/src/prisma/prisma.service.ts` — conexão + shutdown hooks.

\- `apps/api/src/health/health.controller.ts` — `GET /health` (checa db/redis).

\*\*Específico de segurança:\*\* Swagger/debug só fora de produção; erro genérico ao cliente; trace id por request.

\*\*Aceite:\*\* `/health` 200 com status das dependências; subir sem uma env obrigatória aborta com mensagem clara; testes do health e da validação de env.



\#### \[ ] S2 — Schema núcleo multi-tenant + seed

\*\*Depende de:\*\* S1

\*\*Objetivo:\*\* Fundação de dados Org/Acesso com conta demo de revisor de loja.

\*\*Arquivos:\*\*

\- `apps/api/prisma/schema.prisma` — Tenant, Clinic, Unit, User, UserUnit, Role, Permission, RolePermission, AuditLog (ver schema.prisma já entregue).

\- `apps/api/prisma/seed.ts` — idempotente: 1 tenant demo, papéis de sistema (GESTOR/DENTISTA/RECEPCAO/FINANCEIRO), catálogo de permissions, \*\*conta demo de revisor\*\* (senha argon2).

\- `apps/api/package.json` — script `prisma:seed` + config.

\- `packages/types/src/\*` — exporta enums/tipos derivados.

\*\*Específico de segurança:\*\* senha do seed com argon2; nada de PII no AuditLog; email único por tenant (não global).

\*\*Aceite:\*\* `prisma migrate dev` aplica; `prisma:seed` cria tudo e roda 2x sem duplicar; teste de idempotência.



\#### \[ ] S3 — Autenticação

\*\*Depende de:\*\* S1, S2

\*\*Objetivo:\*\* Login/refresh/logout com JWT seguro e sessão revogável.

\*\*Arquivos:\*\*

\- `auth/auth.module.ts` — wiring (JWT, Redis, Throttler do login).

\- `auth/auth.service.ts` — verify argon2; access curto (\~15min); refresh rotativo com `jti` no Redis; logout revoga `jti`.

\- `auth/auth.controller.ts` — `POST /auth/login|refresh|logout`; rate limit reforçado no login (ex.: 5/min/IP).

\- `auth/strategies/jwt.strategy.ts` — valida access e popula `req.user` (userId, tenantId, roleId).

\- `auth/dto/\*` — class-validator.

\*\*Específico de segurança:\*\* erro de login genérico (não revela usuário vs senha); nunca logar senha/token; lockout/anti-brute-force.

\*\*Aceite:\*\* login válido → access+refresh; inválido → 401 genérico; refresh rotaciona (anterior para de funcionar); logout revoga; 4 testes.



\#### \[ ] S4 — RBAC + tenant guard + anti-IDOR

\*\*Depende de:\*\* S3

\*\*Objetivo:\*\* O controle de acesso que impede um tenant de ver dado de outro (risco #1).

\*\*Arquivos:\*\*

\- `common/guards/tenant.guard.ts` — injeta `tenantId` do JWT no contexto; sem tenant → 401.

\- `common/decorators/permissions.decorator.ts` + `permissions.guard.ts` — deny-by-default por permission key.

\- `common/repositories/tenant-scoped.helper.ts` — wrapper que força `where: { tenantId }` (e `ownerId` quando aplicável).

\- `common/audit/audit.service.ts` — registra `AUTHZ\_DENIED`, `SENSITIVE\_READ`, `PERMISSION\_CHANGED`.

\*\*Específico de segurança:\*\* É a sessão-âncora do anti-IDOR; toda query de registro do usuário passa pelo helper.

\*\*Aceite:\*\* teste prova que usuário do tenant A recebe 403 ao ler/alterar recurso do tenant B; toda negação gera AuditLog; rota sem permission decorator é negada por padrão.



\### FASE 1 — MVP de valor + apps nas lojas



\#### \[ ] S5 — Módulo Patient

\*\*Depende de:\*\* S4

\*\*Objetivo:\*\* Cadastro de paciente com origem de lead, tenant-scoped.

\*\*Arquivos:\*\* schema (+`Patient`: dados, `leadSource`, `referredById`), `patient/{module,service,controller}.ts`, `patient/dto/\*`.

\*\*Específico:\*\* cadastro rápido de 1ª consulta (só essencial); soft-delete preparado.

\*\*Aceite:\*\* CRUD tenant-scoped; teste anti-IDOR (tenant A não acessa paciente de B); validação de telefone/CPF.



\#### \[ ] S6 — Appointment + Availability (backend)

\*\*Depende de:\*\* S5

\*\*Objetivo:\*\* Núcleo da agenda com regras de horário e conflito.

\*\*Arquivos:\*\* schema (+`Appointment` status/marcadores, +`Availability`), `appointment/{module,service,controller}.ts`, `appointment/dto/\*`.

\*\*Específico:\*\* checagem de conflito de horário por profissional/sala; timezone da unidade.

\*\*Aceite:\*\* criar/mover/cancelar; tentar marcar em horário ocupado → 409; teste de conflito.



\#### \[ ] S7 — Web base + agenda

\*\*Depende de:\*\* S6

\*\*Objetivo:\*\* Primeira tela útil de gestão (desktop/tablet).

\*\*Arquivos:\*\* `apps/web` (App Router, login consumindo auth, layout, guard de rota), `packages/api-client` (client tipado + interceptor de refresh), tela de agenda (listar/criar).

\*\*Específico:\*\* token em cookie httpOnly/secure; nenhum segredo no front.

\*\*Aceite:\*\* logar no web, ver e criar agendamento; refresh transparente ao expirar access.



\#### \[ ] S8 — mobile-patient base + EAS

\*\*Depende de:\*\* S6

\*\*Objetivo:\*\* App do Paciente nativo, pronto para trilha de loja.

\*\*Arquivos:\*\* `apps/mobile-patient` (Expo Router, login, tela "minhas consultas"), `app.config.ts` (bundleId/package, ícone, splash, permissões mínimas + iOS usage strings), `eas.json` (perfis dev/preview/production), init Sentry.

\*\*Específico (loja, §5):\*\* targetSdk 36 / iOS SDK 26; sem segredo no bundle; permissões justificadas.

\*\*Aceite:\*\* build EAS (dev) roda em device físico; paciente loga e vê só as próprias consultas (anti-IDOR).



\#### \[ ] S9 — mobile-pro base + EAS

\*\*Depende de:\*\* S6

\*\*Objetivo:\*\* App do Profissional nativo, mesmo padrão de loja.

\*\*Arquivos:\*\* `apps/mobile-pro` (Expo Router, login, agenda do dia read-only), `app.config.ts` (bundleId próprio), `eas.json`, Sentry.

\*\*Específico (loja, §5):\*\* listagem B2B distinta; permissões mínimas próprias.

\*\*Aceite:\*\* build EAS roda em device; profissional vê a agenda do dia da sua unidade.



\#### \[ ] S10 — Exclusão de conta (requisito de loja)

\*\*Depende de:\*\* S3, S8, S9

\*\*Objetivo:\*\* Atender Apple 5.1.1 + Google: usuário apaga a própria conta.

\*\*Arquivos:\*\* `auth/account.controller.ts` (`DELETE /me` → soft-delete + anonimização, respeitando guarda legal do prontuário), tela de exclusão nos dois apps, página web pública de exclusão.

\*\*Específico (loja):\*\* confirma intenção; explica o que é apagado vs retido por lei; auditado.

\*\*Aceite:\*\* fluxo completo anonimiza dados pessoais e bloqueia login; URL pública responde; teste do soft-delete + retenção legal.



\#### \[ ] S11 — Confirmação de consulta

\*\*Depende de:\*\* S6, S8

\*\*Objetivo:\*\* Paciente confirma presença pelo app; status reflete na agenda.

\*\*Arquivos:\*\* schema (+`ConfirmationEvent`), `appointment/confirmation.service.ts`, endpoint de confirmação, telas mobile.

\*\*Específico:\*\* idempotência (confirmar 2x não duplica evento).

\*\*Aceite:\*\* confirmar no mobile muda status no web; histórico de eventos registrado.



\#### \[ ] S12 — WhatsApp (Evolution) — fila de confirmação

\*\*Depende de:\*\* S11

\*\*Objetivo:\*\* Disparo e recebimento de confirmação por WhatsApp.

\*\*Arquivos:\*\* `integrations/whatsapp/whatsapp.service.ts` (proxy backend, anti-SSRF), fila `confirmation-sender` (idempotente/backoff/DLQ), `whatsapp.webhook.controller.ts`, config/env.

\*\*Específico:\*\* segredos da Evolution só no backend; webhook valida assinatura/origem.

\*\*Aceite:\*\* job envia confirmação D-1; resposta do paciente via webhook atualiza status; reprocesso não duplica; falha vai para DLQ.



\#### \[ ] S13 — Push notifications

\*\*Depende de:\*\* S8, S9

\*\*Objetivo:\*\* Lembretes nativos nos dois apps.

\*\*Arquivos:\*\* schema (+`Notification`, token de device), `integrations/push/push.service.ts` (Expo Notifications), fila `push-sender`, registro de token nos apps.

\*\*Específico (loja):\*\* APNs+FCM; pedir permissão de push com contexto; opt-out respeitado.

\*\*Aceite:\*\* registrar device e receber push de lembrete em device real; opt-out interrompe envio.



\#### \[ ] S14 — Self check-in

\*\*Depende de:\*\* S6, S8

\*\*Objetivo:\*\* Paciente faz check-in pelo app ao chegar.

\*\*Arquivos:\*\* schema (+`WaitList`), `appointment/checkin.service.ts`, endpoint, tela no app do paciente, indicador na agenda web.

\*\*Específico:\*\* check-in só dentro de janela/raio configurável (opcional); idempotente.

\*\*Aceite:\*\* check-in pelo app coloca paciente na fila de espera visível no web em tempo real.



\#### \[ ] S15 — Agendamento online

\*\*Depende de:\*\* S6

\*\*Objetivo:\*\* Paciente marca sozinho dentro das regras da clínica.

\*\*Arquivos:\*\* `appointment/availability.service.ts` (regras), endpoint público de slots (rate limit), tela pública de booking (web) + fluxo no app.

\*\*Específico:\*\* endpoint público com rate limit forte; não vaza agenda interna além dos slots livres.

\*\*Aceite:\*\* paciente agenda em slot livre; respeita conflito, janela e antecedência mínima; slot some após marcado.



\### FASE 2 — Motor de lucratividade (comercial + financeiro + clínico)



\#### \[ ] S16 — Procedure / PriceTable / Plan

\*\*Depende de:\*\* S4

\*\*Objetivo:\*\* Catálogo de procedimentos, tabelas de preço e convênios.

\*\*Arquivos:\*\* schema (+`Procedure`,`PriceTable`,`Plan`), `catalog/{module,service,controller}.ts`, tela web de cadastro.

\*\*Aceite:\*\* cadastrar procedimento/tabela/convênio tenant-scoped; preço por convênio.



\#### \[ ] S17 — Orçamento (Budget)

\*\*Depende de:\*\* S16

\*\*Objetivo:\*\* Montar e acompanhar orçamentos.

\*\*Arquivos:\*\* schema (+`Budget`,`BudgetItem`, status), `budget/{module,service,controller}.ts`, tela web.

\*\*Específico:\*\* total calculado no backend (nunca confiar em total do front).

\*\*Aceite:\*\* gerar orçamento com itens e total correto; mudar status (aberto/aprovado/recusado); conversão registrada para relatório.



\#### \[ ] S18 — Contrato + Termos + assinatura eletrônica

\*\*Depende de:\*\* S17

\*\*Objetivo:\*\* Fechar o orçamento com documento assinado e válido.

\*\*Arquivos:\*\* schema (+`Contract`,`Consent`), `integrations/esign/esign.service.ts` (ICP, trilha IP+timestamp+hash), endpoint, tela de assinatura.

\*\*Específico:\*\* evidência jurídica completa; documento imutável após assinado (hash).

\*\*Aceite:\*\* gerar contrato a partir do orçamento aprovado; paciente assina; evidência registrada e verificável.



\#### \[ ] S19 — Charge/Installment + Asaas

\*\*Depende de:\*\* S17

\*\*Objetivo:\*\* Transformar venda em cobranças (PIX/boleto/cartão).

\*\*Arquivos:\*\* schema (+`Charge`,`Installment`,`PixCharge`,`Boleto`,`CardTransaction`), `integrations/asaas/asaas.service.ts` (proxy backend), `billing/{module,service,controller}.ts`.

\*\*Específico:\*\* segredos Asaas só no backend; valores conferidos no servidor.

\*\*Aceite:\*\* aprovar orçamento gera parcelas + cobrança PIX/boleto via Asaas (sandbox); status persistido.



\#### \[ ] S20 — Baixa automática (reconciler)

\*\*Depende de:\*\* S19

\*\*Objetivo:\*\* Conciliar pagamento recebido automaticamente.

\*\*Arquivos:\*\* `billing/asaas.webhook.controller.ts` (valida assinatura), fila `payment-reconciler` (idempotente), schema (+`Payment`,`Reconciliation`).

\*\*Específico:\*\* webhook idempotente por id de evento; fail-closed se assinatura inválida.

\*\*Aceite:\*\* webhook de pagamento dá baixa na parcela; reprocesso do mesmo evento não dá baixa dupla; teste.



\#### \[ ] S21 — App do Paciente: financeiro

\*\*Depende de:\*\* S19, S8

\*\*Objetivo:\*\* Paciente vê e paga a própria parcela pelo app.

\*\*Arquivos:\*\* endpoint "minhas parcelas" (tenant+owner scoped), telas mobile (ver parcela, copiar PIX copia-e-cola / código de barras do boleto).

\*\*Específico (anti-IDOR):\*\* paciente só enxerga as próprias cobranças.

\*\*Aceite:\*\* ver próxima parcela e copiar PIX/boleto; teste de que não acessa parcela de outro paciente.



\#### \[ ] S22 — Régua de cobrança

\*\*Depende de:\*\* S19, S12

\*\*Objetivo:\*\* Lembretes/cobranças automáticos escalonados.

\*\*Arquivos:\*\* schema (+`CollectionRule`,`CollectionEvent`), fila `collection-ruler` (cron diário), `collection/service.ts`.

\*\*Específico:\*\* jobs idempotentes por (parcela, etapa); respeitar opt-out.

\*\*Aceite:\*\* parcela vencendo dispara D-3/D0/D+X via WhatsApp; eventos logados; não reenvia etapa já enviada.



\#### \[ ] S23 — NFS-e

\*\*Depende de:\*\* S20

\*\*Objetivo:\*\* Emissão fiscal integrada ao pagamento.

\*\*Arquivos:\*\* `integrations/nfse/nfse.service.ts` (integrador), fila `nfse-emitter`, schema (+`Invoice`), endpoint.

\*\*Específico:\*\* retry com backoff (prefeituras instáveis); status e retorno persistidos.

\*\*Aceite:\*\* emitir NFS-e (homologação) a partir de um pagamento; status refletido; falha vai para DLQ com motivo.



\#### \[ ] S24 — Recibos

\*\*Depende de:\*\* S20

\*\*Objetivo:\*\* Comprovante PDF de pagamento.

\*\*Arquivos:\*\* `receipt/receipt.service.ts` (gera PDF), endpoint, upload p/ Spaces (URL assinada).

\*\*Aceite:\*\* gerar recibo PDF de um pagamento, acessível por URL assinada de expiração curta.



\#### \[ ] S25 — SPC consulta + inclusão

\*\*Depende de:\*\* S5, S19

\*\*Objetivo:\*\* Avaliar e cobrar inadimplência via bureau.

\*\*Arquivos:\*\* `integrations/spc/spc.service.ts` (anti-SSRF, fila `spc-query`), schema (+`CreditCheck`), endpoints de consulta e inclusão.

\*\*Específico:\*\* consentimento/base legal; tudo auditado; segredos no backend.

\*\*Aceite:\*\* consultar score (sandbox) antes de parcelar; inclusão de inadimplente registrada e auditada.



\#### \[ ] S26 — Prontuário (MedicalRecord) + anexos

\*\*Depende de:\*\* S5

\*\*Objetivo:\*\* Registro clínico seguro com imagens/exames.

\*\*Arquivos:\*\* schema (+`MedicalRecord`,`RecordEntry`,`Attachment`), `record/{module,service,controller}.ts`, upload p/ Spaces (URL assinada), cifra em repouso.

\*\*Específico:\*\* acesso a dado de saúde gera `SENSITIVE\_READ` no AuditLog; criptografia em repouso.

\*\*Aceite:\*\* criar entrada e anexar imagem; todo acesso auditado; anti-IDOR no acesso ao prontuário.



\#### \[ ] S27 — Odontograma

\*\*Depende de:\*\* S26

\*\*Objetivo:\*\* Mapa dental interativo vinculado ao prontuário.

\*\*Arquivos:\*\* schema (+`Odontogram`,`ToothCondition`), `odontogram/service.ts`, componente SVG interativo (web).

\*\*Aceite:\*\* marcar condição por dente/face e persistir vinculado ao prontuário; render correto ao reabrir.



\#### \[ ] S28 — Anamnese digital

\*\*Depende de:\*\* S26, S18

\*\*Objetivo:\*\* Anamnese personalizável preenchida e assinada remotamente.

\*\*Arquivos:\*\* schema (+`Anamnesis`,`AnamnesisTemplate`), `anamnesis/service.ts`, link de preenchimento + assinatura (reusa esign da S18), tela no app do paciente.

\*\*Específico:\*\* template por procedimento; link com token de uso único/expiração.

\*\*Aceite:\*\* enviar anamnese por link; paciente preenche/assina remoto; fica no prontuário com evidência.



\### FASE 3 — Execução, clínico avançado e fidelização



\#### \[ ] S29 — Fichas por especialidade

\*\*Depende de:\*\* S26

\*\*Objetivo:\*\* Ficha clínica específica por área (Orto, Implanto, Endo, HOF, Alinhadores, Estética).

\*\*Arquivos:\*\* schema (+`SpecialtyForm`, campos por tipo), `specialty/service.ts`, render dinâmico (web).

\*\*Aceite:\*\* cada profissional usa a ficha da sua especialidade; campos persistidos e versionados.



\#### \[ ] S30 — Plano de tratamento + execução

\*\*Depende de:\*\* S17, S26

\*\*Objetivo:\*\* Converter orçamento em plano executável por sessão.

\*\*Arquivos:\*\* schema (+`TreatmentPlan`,`TreatmentItem`,`ExecutionLog`), `treatment/{module,service,controller}.ts`, telas web.

\*\*Aceite:\*\* gerar plano a partir do orçamento; registrar execução por sessão com data/profissional.



\#### \[ ] S31 — Casos de alinhadores

\*\*Depende de:\*\* S30, S8

\*\*Objetivo:\*\* Acompanhamento por etapas, com visão no app do paciente.

\*\*Arquivos:\*\* schema (+`AlignerCase`,`AlignerStep`), `aligner/service.ts`, tela de acompanhamento no app do paciente.

\*\*Aceite:\*\* criar caso com N etapas; paciente vê etapa atual e próxima troca no app.



\#### \[ ] S32 — Atestados/Receituários + certificado digital

\*\*Depende de:\*\* S26

\*\*Objetivo:\*\* Documentos clínicos assinados digitalmente (ICP) com validade jurídica.

\*\*Arquivos:\*\* `document/document.service.ts` (gera PDF), assinatura digital ICP do profissional (reusa esign), endpoint, tela.

\*\*Específico:\*\* certificado do profissional nunca trafega/armazena no client.

\*\*Aceite:\*\* emitir receituário/atestado assinado digitalmente (homologação) com verificação de validade.



\#### \[ ] S33 — Alerta de retorno

\*\*Depende de:\*\* S6, S12

\*\*Objetivo:\*\* Gerar receita recorrente trazendo o paciente de volta.

\*\*Arquivos:\*\* schema (+`ReturnAlert`), fila `return-alert-scheduler`, `return/service.ts`.

\*\*Aceite:\*\* ao fim da consulta, agenda alerta; no prazo definido vira tarefa de reagendamento (e/ou mensagem).



\#### \[ ] S34 — CRC (Central de Relacionamento)

\*\*Depende de:\*\* S33

\*\*Objetivo:\*\* Fila de tarefas de relacionamento do dia.

\*\*Arquivos:\*\* schema (+`CRCTask`), `crc/{module,service,controller}.ts`, tela web (lista priorizada).

\*\*Aceite:\*\* lista de contatos do dia (retorno, pós-venda, reativação, aniversário) com marcar-como-feito e atribuição.



\#### \[ ] S35 — Controle protético

\*\*Depende de:\*\* S30

\*\*Objetivo:\*\* Rastrear envio/retorno de laboratório.

\*\*Arquivos:\*\* schema (+`ProstheticOrder`), `prosthetic/service.ts`, tela, vínculo ao tratamento.

\*\*Aceite:\*\* registrar envio ao laboratório e retorno com prazos e status; alerta de atraso.



\#### \[ ] S36 — Câmera intraoral / Image2Doc

\*\*Depende de:\*\* S26

\*\*Objetivo:\*\* Anexar imagem intraoral ao documento clínico.

\*\*Arquivos:\*\* `record/image.service.ts` (upload Spaces + URL assinada), integração de captura (web), anexo ao prontuário.

\*\*Aceite:\*\* anexar imagem intraoral ao registro do paciente; thumbnail e visualização com URL assinada.



\### FASE 4 — Financeiro da clínica + gestão estratégica



\#### \[ ] S37 — Contas a pagar/receber

\*\*Depende de:\*\* S20

\*\*Objetivo:\*\* Lançamentos financeiros da clínica.

\*\*Arquivos:\*\* schema (+`Account` tipo/vencimento/status), `finance/account.service.ts`, telas.

\*\*Aceite:\*\* lançar conta a pagar/receber com vencimento, categoria e status; baixa manual.



\#### \[ ] S38 — Fluxo de caixa + conciliação

\*\*Depende de:\*\* S37, S20

\*\*Objetivo:\*\* Visão de caixa e conciliação bancária.

\*\*Arquivos:\*\* schema (+`CashFlow`,`BankReconciliation`), `finance/cashflow.service.ts`, tela com entradas/saídas.

\*\*Aceite:\*\* visão diária/mensal de caixa; conciliar lançamento com pagamento (auto da S20 + manual).



\#### \[ ] S39 — Estoque

\*\*Depende de:\*\* S16

\*\*Objetivo:\*\* Controle de insumos com validade e custo.

\*\*Arquivos:\*\* schema (+`Inventory`,`Item`,`StockMovement`,`Batch`), `inventory/{module,service}.ts`, alertas.

\*\*Aceite:\*\* entrada/saída, baixa por procedimento, alerta de validade e de estoque mínimo.



\#### \[ ] S40 — Comissões

\*\*Depende de:\*\* S30, S20

\*\*Objetivo:\*\* Calcular comissão por profissional.

\*\*Arquivos:\*\* schema (+`Commission`), `commission/service.ts` (regra por procedimento/percentual), relatório.

\*\*Aceite:\*\* calcular comissão de procedimento executado/pago; relatório por profissional e período.



\#### \[ ] S41 — Metas

\*\*Depende de:\*\* S42 (ou paralelo)

\*\*Objetivo:\*\* Definir e acompanhar metas.

\*\*Arquivos:\*\* schema (+`Goal`), `goal/service.ts`, acompanhamento meta vs realizado.

\*\*Aceite:\*\* definir meta por clínica/profissional/período e ver progresso atualizado.



\#### \[ ] S42 — Dashboard analítico

\*\*Depende de:\*\* S6, S19

\*\*Objetivo:\*\* Indicadores-chave num só lugar.

\*\*Arquivos:\*\* `analytics/dashboard.service.ts` (agrega + cache Redis), tela web com gráficos (ocupação, receita, faturamento, conversão).

\*\*Específico:\*\* consultas agregadas otimizadas; cache invalidado por eventos.

\*\*Aceite:\*\* dashboard do tenant carrega indicadores em <2s via cache; números batem com relatórios.



\#### \[ ] S43 — Engine de relatórios

\*\*Depende de:\*\* S42

\*\*Objetivo:\*\* Catálogo de relatórios exportáveis.

\*\*Arquivos:\*\* `reports/report.service.ts`, fila `report-builder` (pesados em background), export CSV/PDF.

\*\*Aceite:\*\* gerar relatório de faturamento e de faltas/desmarcações com filtro de período; export funciona.



\#### \[ ] S44 — CRM: origem, indicação e demografia

\*\*Depende de:\*\* S5

\*\*Objetivo:\*\* Ligar marketing a faturamento.

\*\*Arquivos:\*\* schema (+`CRMLead`,`LeadSource`,`Referral`), `crm/service.ts`, relatórios (origem, faixa etária, localização).

\*\*Aceite:\*\* rastrear lead da origem ao agendamento/fechamento; relatório de ROI por canal; quem indicou quem.



\### FASE 5 — Rede/franquia + IA



\#### \[ ] S45 — Central de acessos multi-unidade

\*\*Depende de:\*\* S4

\*\*Objetivo:\*\* Um login navega entre unidades autorizadas.

\*\*Arquivos:\*\* contexto de unidade no JWT/sessão, `network/access.service.ts`, seletor de unidade (web).

\*\*Específico (anti-IDOR):\*\* troca de unidade revalida autorização no servidor.

\*\*Aceite:\*\* usuário navega só entre unidades autorizadas; toda query permanece tenant+unit scoped.



\#### \[ ] S46 — Gestão + ranking de unidades

\*\*Depende de:\*\* S42, S45

\*\*Objetivo:\*\* Comparar performance entre unidades (franqueador).

\*\*Arquivos:\*\* `network/units.service.ts`, dashboard consolidado, ranking.

\*\*Aceite:\*\* franqueador vê comparativo (faturamento/ocupação/conversão) e ranking entre unidades.



\#### \[ ] S47 — Royalties

\*\*Depende de:\*\* S20, S46

\*\*Objetivo:\*\* Calcular e cobrar royalties por unidade.

\*\*Arquivos:\*\* schema (+`Royalty`), `network/royalty.service.ts` (cálculo sobre faturamento), cobrança via split Asaas.

\*\*Aceite:\*\* calcular royalty do período por unidade e gerar cobrança; conciliação do recebimento.



\#### \[ ] S48 — Central de agendamentos

\*\*Depende de:\*\* S45, S6

\*\*Objetivo:\*\* Operar agenda de múltiplas unidades de um ponto.

\*\*Arquivos:\*\* `network/scheduling-center.service.ts`, visão consolidada, roteamento de marcação.

\*\*Aceite:\*\* operador agenda em qualquer unidade autorizada a partir de uma central.



\#### \[ ] S49 — API pública + white-label

\*\*Depende de:\*\* S4

\*\*Objetivo:\*\* Integração de terceiros e personalização por tenant.

\*\*Arquivos:\*\* `public-api/` (API key por tenant, escopos, rate limit), webhooks de saída, tema/branding por tenant.

\*\*Específico:\*\* chave escopada com menor privilégio; rate limit por chave; logs de uso.

\*\*Aceite:\*\* terceiro consome API com chave escopada; webhook de saída entrega evento; branding por tenant aplica no web/app.



\#### \[ ] S50 — IA: agente de agendamento (WhatsApp)

\*\*Depende de:\*\* S12, S15

\*\*Objetivo:\*\* Agendar/confirmar por conversa, com guardrails.

\*\*Arquivos:\*\* `ai/agent.service.ts`, orquestração com Evolution, validações de backend.

\*\*Específico (loja §5):\*\* disclosure de IA; agente nunca decide dado sensível sozinho — só propõe e o backend valida.

\*\*Aceite:\*\* agente agenda/confirma via conversa respeitando regras de disponibilidade; ação efetivada só após validação no backend.



\#### \[ ] S51 — IA: insights

\*\*Depende de:\*\* S42, S44

\*\*Objetivo:\*\* Sugestões acionáveis a partir dos dados do tenant.

\*\*Arquivos:\*\* `ai/insights.service.ts` (lê dados agregados), painel de sugestões (web).

\*\*Específico:\*\* opera sobre dados agregados/anonimizados quando possível; disclosure de IA.

\*\*Aceite:\*\* gerar insight de conversão/inadimplência/ocupação com explicação; nada de PII enviada a terceiros sem base legal.



\### FASE 6 — Produção, loja e hardening



\#### \[ ] S52 — CI/CD com gates

\*\*Depende de:\*\* features estáveis

\*\*Objetivo:\*\* Pipeline que impede merge ruim.

\*\*Arquivos:\*\* `.github/workflows/ci.yml` (lint+test+build+SCA), gitleaks (bloqueia segredo), branch protection.

\*\*Aceite:\*\* PR com segredo, lint quebrado ou teste falhando é bloqueado; pipeline verde obrigatório para merge.



\#### \[ ] S53 — Infra como código

\*\*Depende de:\*\* S52

\*\*Objetivo:\*\* Infra reproduzível na DigitalOcean.

\*\*Arquivos:\*\* `infra/\*.tf` (Managed Postgres/Redis, Spaces, App/Droplet, ambientes dev/staging/prod com segredos distintos).

\*\*Aceite:\*\* `terraform plan` reproduz a infra; ambientes separados; nada criado por clique manual.



\#### \[ ] S54 — Hardening de produção

\*\*Depende de:\*\* S53

\*\*Objetivo:\*\* Endurecer config e garantir recuperação.

\*\*Arquivos:\*\* config prod (Swagger/debug off, cookies seguros, HTTPS, cifra em repouso), rotina de backup testada.

\*\*Aceite:\*\* checklist de produção do guia (itens 24–26) verde; restore de backup testado de verdade.



\#### \[ ] S55 — Observabilidade + alertas

\*\*Depende de:\*\* S53

\*\*Objetivo:\*\* Saber quando algo quebra antes do cliente.

\*\*Arquivos:\*\* Sentry nos 4 apps, métricas + alertas (5xx, falha de auth, indisponibilidade), healthchecks liveness/readiness.

\*\*Aceite:\*\* erro em prod gera alerta acionável; painel de saúde ativo; logs estruturados sem PII.



\#### \[ ] S56 — Submissão Apple/Google (App do Paciente)

\*\*Depende de:\*\* S10, S13, fases 1–2 estáveis

\*\*Objetivo:\*\* Paciente em trilha de loja sem rejeição de completude.

\*\*Arquivos:\*\* metadados/descrição, screenshots, App Privacy (iOS) + Data Safety (Google) honestos (dado de saúde/financeiro), notas de revisão com \*\*conta demo\*\*, `eas submit`.

\*\*Aceite:\*\* app do paciente publicado em TestFlight/Internal sem rejeição de completude (Guideline 2.1); fluxo de exclusão de conta validado pelo revisor.



\#### \[ ] S57 — Submissão Apple/Google (Profissional) + produção

\*\*Depende de:\*\* S56

\*\*Objetivo:\*\* Profissional na loja e promoção dos dois apps a produção.

\*\*Arquivos:\*\* idem para `mobile-pro`, promoção trilha interna → produção dos dois apps, monitoramento pós-launch.

\*\*Aceite:\*\* ambos os apps aprovados/publicados; versão/buildNumber corretos; crash-free monitorado.



\---



\## 11. LOG DE SESSÕES (atualizar ao FIM de cada sessão)



> Formato por entrada: data · sessão · o que foi feito · arquivos tocados · decisões/ADR · pendências para a próxima.



\- \*\*2026-06-06 · S0 — Scaffold do monorepo\*\*

  \- \*O que foi feito:\* esqueleto Turborepo + pnpm workspaces que builda/linta vazio; presets compartilhados em `packages/config` (eslint, tsconfig.base, prettier, tailwind com paleta da marca §0). `pnpm install` resolve (lockfile gerado), `pnpm build` e `pnpm lint` passam, `pnpm audit` sem vulnerabilidades, `pnpm format:check` limpo.

  \- \*Arquivos tocados:\* `pnpm-workspace.yaml`, `turbo.json`, `package.json` (raiz), `.gitignore`, `.prettierignore`, `.env.example`, `README.md`, `packages/config/{package.json,tsconfig.base.json,eslint-preset.js,prettier-preset.js,tailwind-preset.js}`.

  \- \*Decisões:\* Node `>=20` + pnpm fixado em `8.15.6` via `packageManager` (corepack). Turbo 2.x → chave `tasks` (não mais `pipeline`). ESLint 8 (`.eslintrc`-style) para máxima compatibilidade dos presets. tsconfig estrito (noUncheckedIndexedAccess, exactOptionalPropertyTypes). `.env*` ignorado desde já; `.env.example` sem segredos.

  \- \*Pendências p/ próxima:\* repositório \*\*git ainda não inicializado\*\* (usuário optou por adiar) — antes da S1 rodar `git init` e commitar o lockfile (§4 exige lockfile commitado). Próxima sessão: \*\*S1 — Base do backend (NestJS endurecido)\*\*.

\- \*\*2026-06-06 · S1 — Base do backend (NestJS endurecido)\*\*

  \- \*O que foi feito:\* `apps/api` (NestJS 11) sobe com config validada por Zod (aborta com mensagem clara se faltar env), Helmet (CSP/HSTS), CORS por allowlist via env, rate limit global (Throttler 100/15min), logger JSON (nestjs-pino) com trace id por request e redact de authorization/cookie, `enableShutdownHooks`, ValidationPipe global (whitelist). `GET /health` checa Postgres + Redis e responde 503 fail-closed se algo cair. Filtro global de exceções: HttpException repassa payload seguro, erro inesperado vira 500 genérico (stack só no log). git inicializado e S0 commitada.

  \- \*Arquivos tocados:\* `apps/api/{package.json,tsconfig.json,tsconfig.build.json,nest-cli.json,jest.config.js,.eslintrc.cjs,.env.example}`, `apps/api/prisma/schema.prisma` (só generator+datasource), `src/main.ts`, `src/app.module.ts`, `src/config/env.validation.ts`, `src/prisma/{prisma.service,prisma.module}.ts`, `src/redis/{redis.service,redis.module}.ts`, `src/health/{health.controller,health.module}.ts`, `src/common/filters/all-exceptions.filter.ts`, testes `test/{env.validation,health.controller}.spec.ts`; raiz: `.gitattributes` (LF).

  \- \*Decisões:\* NestJS 11 + @nestjs/config 4 + throttler 6 + nestjs-pino 4 + ioredis 5 + Prisma 6. `tsconfig` da api sobrescreve base para CommonJS/Node + decorators. `exactOptionalPropertyTypes` exigiu omitir a chave `transport` do pino em prod (não setar `undefined`). ESLint preset referenciado via `require.resolve` (resolução de subpath do ESLint 8 falha sem isso). PrismaModule/RedisModule são `@Global`. Helmet com defaults (CSP/HSTS on).

  \- \*Verificação:\* `pnpm build`/`lint`/`test` (7 testes) verdes, `pnpm audit` sem vulnerabilidades, `format:check` limpo. \*\*Não\*\* validei `GET /health` 200 em runtime — exige Postgres+Redis de pé (sem docker-compose ainda); a lógica está coberta por testes unitários.

  \- \*Pendências p/ próxima:\* criar `docker-compose.yml` (Postgres+Redis) para subir a API localmente e validar `/health` 200 de verdade. Próxima sessão: \*\*S2 — Schema núcleo multi-tenant + seed\*\* (modelos entram em `schema.prisma`).



\---



\## 12. BIBLIOTECA DE INSTRUÇÕES PRONTAS (colar nos prompts de sessão)



\- "Valide com Zod no formulário para UX, mas nunca confie nesta validação."

\- "Use class-validator no DTO. Rejeite com 400 se inválido."

\- "Aplique deny-by-default e verifique posse do recurso (tenantId/ownerId) antes de qualquer operação. Lance ForbiddenException se falhar."

\- "Use Prisma parametrizado. Nunca $queryRawUnsafe com interpolação de input."

\- "Adicione rate limiting de 100 req/15min em todos os endpoints públicos."

\- "Configure Helmet com CSP e HSTS. Desabilite Swagger e debug em produção."

\- "Falhe fechado: se a checagem de segurança falhar ou der timeout, negue."

\- "Nunca exponha stack trace ao cliente. Erro genérico fora, detalhe no log."

\- "Para endpoint que faz fetch de URL externa, use allowlist e bloqueie IPs internos (anti-SSRF)."

\- "JWT com access curto + refresh rotativo revogável no Redis."

\- "Logging estruturado em JSON; nunca logue segredos ou PII."

\- "Use a solução mais simples possível, mesmo que menos elegante."

\- "Não adicione funcionalidades além das listadas nos critérios de aceitação."

\- "Já existe algo similar no projeto antes de criar isto?"



\---



\## 13. COMO USAR ESTE ARQUIVO PARA DISPARAR UMA SESSÃO



Modelo de prompt (preencha com a sessão alvo):



> "Leia o CLAUDE.md. Implemente a sessão \*\*Sxx\*\* (§10). Siga objetivo, arquivos e critérios de aceitação descritos. Aplique as regras de §4 (deny-by-default, anti-IDOR por tenantId, Prisma parametrizado, fail-closed) e, se for mobile, as de §5 (loja). Máximo 3–5 arquivos; se passar disso, pare e proponha sub-sessões. Antes de criar helper, verifique se já existe em packages/. Ao terminar, rode o Definition of Done (§9), atualize o §11 e marque a Sxx no §10."

