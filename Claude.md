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

| Gestão da clínica | `apps/web` | Next.js 15 (desktop/tablet) | Não |

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

│   ├── web/                # Next.js 15 — gestão da clínica (desktop/tablet)

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

\- \*\*Web\*\*: Next.js 15 (App Router) · React 19 · TailwindCSS. \[atualizado na S7a: era Next 14; subiu p/ 15 por 6 CVEs HIGH sem patch no 14.x — §4 prevalece. ADR pendente.\]

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



\#### \[x] S2 — Schema núcleo multi-tenant + seed

\*\*Depende de:\*\* S1

\*\*Objetivo:\*\* Fundação de dados Org/Acesso com conta demo de revisor de loja.

\*\*Arquivos:\*\*

\- `apps/api/prisma/schema.prisma` — Tenant, Clinic, Unit, User, UserUnit, Role, Permission, RolePermission, AuditLog (ver schema.prisma já entregue).

\- `apps/api/prisma/seed.ts` — idempotente: 1 tenant demo, papéis de sistema (GESTOR/DENTISTA/RECEPCAO/FINANCEIRO), catálogo de permissions, \*\*conta demo de revisor\*\* (senha argon2).

\- `apps/api/package.json` — script `prisma:seed` + config.

\- `packages/types/src/\*` — exporta enums/tipos derivados.

\*\*Específico de segurança:\*\* senha do seed com argon2; nada de PII no AuditLog; email único por tenant (não global).

\*\*Aceite:\*\* `prisma migrate dev` aplica; `prisma:seed` cria tudo e roda 2x sem duplicar; teste de idempotência.



\#### \[x] S3 — Autenticação

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



\#### \[x] S4 — RBAC + tenant guard + anti-IDOR

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



\#### \[x] S5 — Módulo Patient

\*\*Depende de:\*\* S4

\*\*Objetivo:\*\* Cadastro de paciente com origem de lead, tenant-scoped.

\*\*Arquivos:\*\* schema (+`Patient`: dados, `leadSource`, `referredById`), `patient/{module,service,controller}.ts`, `patient/dto/\*`.

\*\*Específico:\*\* cadastro rápido de 1ª consulta (só essencial); soft-delete preparado.

\*\*Aceite:\*\* CRUD tenant-scoped; teste anti-IDOR (tenant A não acessa paciente de B); validação de telefone/CPF.



\#### \[x] S6 — Appointment + Availability (backend)

\*\*Depende de:\*\* S5

\*\*Objetivo:\*\* Núcleo da agenda com regras de horário e conflito.

\*\*Arquivos:\*\* schema (+`Appointment` status/marcadores, +`Availability`), `appointment/{module,service,controller}.ts`, `appointment/dto/\*`.

\*\*Específico:\*\* checagem de conflito de horário por profissional/sala; timezone da unidade.

\*\*Aceite:\*\* criar/mover/cancelar; tentar marcar em horário ocupado → 409; teste de conflito.



\#### \[x] S7 — Web base + agenda  ·  \*(S7a scaffold/auth + S7b tela de agenda)\*

\*\*Depende de:\*\* S6

\*\*Objetivo:\*\* Primeira tela útil de gestão (desktop/tablet).

\*\*Arquivos:\*\* `apps/web` (App Router, login consumindo auth, layout, guard de rota), `packages/api-client` (client tipado + interceptor de refresh), tela de agenda (listar/criar).

\*\*Específico:\*\* token em cookie httpOnly/secure; nenhum segredo no front.

\*\*Aceite:\*\* logar no web, ver e criar agendamento; refresh transparente ao expirar access.



\#### \[x] S8 — mobile-patient base + EAS  ·  \*DIVIDIDA: \[x] S8a (auth do paciente — backend) · \[x] S8b (/me/consultas + faixa de guard) · \[x] S8c (casca Expo+EAS) · \[x] S8d (login + minhas consultas)\*

\*\*Depende de:\*\* S6

\*\*Objetivo:\*\* App do Paciente nativo, pronto para trilha de loja.

\*\*Arquivos:\*\* `apps/mobile-patient` (Expo Router, login, tela "minhas consultas"), `app.config.ts` (bundleId/package, ícone, splash, permissões mínimas + iOS usage strings), `eas.json` (perfis dev/preview/production), init Sentry.

\*\*Específico (loja, §5):\*\* targetSdk 36 / iOS SDK 26; sem segredo no bundle; permissões justificadas.

\*\*Aceite:\*\* build EAS (dev) roda em device físico; paciente loga e vê só as próprias consultas (anti-IDOR).



\#### \[x] S9 — mobile-pro base + EAS  ·  \*DIVIDIDA: \[x] S9a (casca Expo+EAS+Sentry) · \[x] S9b (login de equipe + agenda do dia)\*

\*\*Depende de:\*\* S6

\*\*Objetivo:\*\* App do Profissional nativo, mesmo padrão de loja.

\*\*Arquivos:\*\* `apps/mobile-pro` (Expo Router, login, agenda do dia read-only), `app.config.ts` (bundleId próprio), `eas.json`, Sentry.

\*\*Específico (loja, §5):\*\* listagem B2B distinta; permissões mínimas próprias.

\*\*Aceite:\*\* build EAS roda em device; profissional vê a agenda do dia da sua unidade.



\#### \[x] S10 — Exclusão de conta (requisito de loja)  ·  \*DIVIDIDA: \[x] S10a (backend DELETE /me) · \[x] S10b (telas nos 2 apps + página web pública)\*

\*\*Depende de:\*\* S3, S8, S9

\*\*Objetivo:\*\* Atender Apple 5.1.1 + Google: usuário apaga a própria conta.

\*\*Arquivos:\*\* `auth/account.controller.ts` (`DELETE /me` → soft-delete + anonimização, respeitando guarda legal do prontuário), tela de exclusão nos dois apps, página web pública de exclusão.

\*\*Específico (loja):\*\* confirma intenção; explica o que é apagado vs retido por lei; auditado.

\*\*Aceite:\*\* fluxo completo anonimiza dados pessoais e bloqueia login; URL pública responde; teste do soft-delete + retenção legal.



\#### \[x] S11 — Confirmação de consulta

\*\*Depende de:\*\* S6, S8

\*\*Objetivo:\*\* Paciente confirma presença pelo app; status reflete na agenda.

\*\*Arquivos:\*\* schema (+`ConfirmationEvent`), `appointment/confirmation.service.ts`, endpoint de confirmação, telas mobile.

\*\*Específico:\*\* idempotência (confirmar 2x não duplica evento).

\*\*Aceite:\*\* confirmar no mobile muda status no web; histórico de eventos registrado.



\#### \[x] S12 — WhatsApp (Evolution) — fila de confirmação  ·  \*DIVIDIDA: \[x] S12a (infra BullMQ + proxy Evolution + fila de envio) · \[x] S12b (webhook de resposta → atualiza status)\*

\*\*Depende de:\*\* S11

\*\*Objetivo:\*\* Disparo e recebimento de confirmação por WhatsApp.

\*\*Arquivos:\*\* `integrations/whatsapp/whatsapp.service.ts` (proxy backend, anti-SSRF), fila `confirmation-sender` (idempotente/backoff/DLQ), `whatsapp.webhook.controller.ts`, config/env.

\*\*Específico:\*\* segredos da Evolution só no backend; webhook valida assinatura/origem.

\*\*Aceite:\*\* job envia confirmação D-1; resposta do paciente via webhook atualiza status; reprocesso não duplica; falha vai para DLQ.



\#### \[x] S13 — Push notifications  ·  \*DIVIDIDA: \[x] S13a (registro de device token — backend) · \[x] S13b (motor de push: Notification + PushService Expo + fila push-sender) · \[x] S13c (mobile: registro + permissão + opt-out nos 2 apps)\*

\*\*Depende de:\*\* S8, S9

\*\*Objetivo:\*\* Lembretes nativos nos dois apps.

\*\*Arquivos:\*\* schema (+`Notification`, token de device), `integrations/push/push.service.ts` (Expo Notifications), fila `push-sender`, registro de token nos apps.

\*\*Específico (loja):\*\* APNs+FCM; pedir permissão de push com contexto; opt-out respeitado.

\*\*Aceite:\*\* registrar device e receber push de lembrete em device real; opt-out interrompe envio.



\#### \[x] S14 — Self check-in  ·  \*DIVIDIDA: \[x] S14a (backend: WaitList + check-in idempotente + GET /waitlist) · \[x] S14b (mobile: botão de check-in + indicador de fila na agenda web)\*

\*\*Depende de:\*\* S6, S8

\*\*Objetivo:\*\* Paciente faz check-in pelo app ao chegar.

\*\*Arquivos:\*\* schema (+`WaitList`), `appointment/checkin.service.ts`, endpoint, tela no app do paciente, indicador na agenda web.

\*\*Específico:\*\* check-in só dentro de janela/raio configurável (opcional); idempotente.

\*\*Aceite:\*\* check-in pelo app coloca paciente na fila de espera visível no web em tempo real.



\#### \[x] S15 — Agendamento online  ·  \*DIVIDIDA: \[x] S15a (backend: engine de slots + endpoints públicos GET slots/POST book com rate limit) · \[x] S15b (tela pública de booking no web) · \[x] S15c (fluxo no app do paciente logado)\*

\*\*Depende de:\*\* S6

\*\*Objetivo:\*\* Paciente marca sozinho dentro das regras da clínica.

\*\*Arquivos:\*\* `appointment/availability.service.ts` (regras), endpoint público de slots (rate limit), tela pública de booking (web) + fluxo no app.

\*\*Específico:\*\* endpoint público com rate limit forte; não vaza agenda interna além dos slots livres.

\*\*Aceite:\*\* paciente agenda em slot livre; respeita conflito, janela e antecedência mínima; slot some após marcado.



\### FASE 2 — Motor de lucratividade (comercial + financeiro + clínico)



\#### \[x] S16 — Procedure / PriceTable / Plan  ·  \*DIVIDIDA: \[x] S16a (backend: schema + permissions catalog:* + módulo CRUD) · \[x] S16b (tela web de cadastro)\*

\*\*Depende de:\*\* S4

\*\*Objetivo:\*\* Catálogo de procedimentos, tabelas de preço e convênios.

\*\*Arquivos:\*\* schema (+`Procedure`,`PriceTable`,`Plan`), `catalog/{module,service,controller}.ts`, tela web de cadastro.

\*\*Aceite:\*\* cadastrar procedimento/tabela/convênio tenant-scoped; preço por convênio.



\#### \[x] S17 — Orçamento (Budget)  ·  \*DIVIDIDA: \[x] S17a (backend: schema Budget/BudgetItem + módulo, total server-side, status) · \[x] S17b (tela web)\*

\*\*Depende de:\*\* S16

\*\*Objetivo:\*\* Montar e acompanhar orçamentos.

\*\*Arquivos:\*\* schema (+`Budget`,`BudgetItem`, status), `budget/{module,service,controller}.ts`, tela web.

\*\*Específico:\*\* total calculado no backend (nunca confiar em total do front).

\*\*Aceite:\*\* gerar orçamento com itens e total correto; mudar status (aberto/aprovado/recusado); conversão registrada para relatório.



\#### \[x] S18 — Contrato + Termos + assinatura eletrônica  ·  \*DIVIDIDA: \[x] S18a (backend: schema + EsignService + gerar/assinar/verificar) · \[x] S18b (tela de assinatura: app do paciente + gerar no web)\*

\*\*Depende de:\*\* S17

\*\*Objetivo:\*\* Fechar o orçamento com documento assinado e válido.

\*\*Arquivos:\*\* schema (+`Contract`,`Consent`), `integrations/esign/esign.service.ts` (ICP, trilha IP+timestamp+hash), endpoint, tela de assinatura.

\*\*Específico:\*\* evidência jurídica completa; documento imutável após assinado (hash).

\*\*Aceite:\*\* gerar contrato a partir do orçamento aprovado; paciente assina; evidência registrada e verificável.



\#### \[x] S19 — Charge/Installment + Asaas  ·  \*DIVIDIDA: \[x] S19a (backend: schema + AsaasService + BillingService split server-side) · \[x] S19b (tela web)\*

\*\*Depende de:\*\* S17

\*\*Objetivo:\*\* Transformar venda em cobranças (PIX/boleto/cartão).

\*\*Arquivos:\*\* schema (+`Charge`,`Installment`,`PixCharge`,`Boleto`,`CardTransaction`), `integrations/asaas/asaas.service.ts` (proxy backend), `billing/{module,service,controller}.ts`.

\*\*Específico:\*\* segredos Asaas só no backend; valores conferidos no servidor.

\*\*Aceite:\*\* aprovar orçamento gera parcelas + cobrança PIX/boleto via Asaas (sandbox); status persistido.



\#### \[x] S20 — Baixa automática (reconciler)

\*\*Depende de:\*\* S19

\*\*Objetivo:\*\* Conciliar pagamento recebido automaticamente.

\*\*Arquivos:\*\* `billing/asaas.webhook.controller.ts` (valida assinatura), fila `payment-reconciler` (idempotente), schema (+`Payment`,`Reconciliation`).

\*\*Específico:\*\* webhook idempotente por id de evento; fail-closed se assinatura inválida.

\*\*Aceite:\*\* webhook de pagamento dá baixa na parcela; reprocesso do mesmo evento não dá baixa dupla; teste.



\#### \[x] S21 — App do Paciente: financeiro

\*\*Depende de:\*\* S19, S8

\*\*Objetivo:\*\* Paciente vê e paga a própria parcela pelo app.

\*\*Arquivos:\*\* endpoint "minhas parcelas" (tenant+owner scoped), telas mobile (ver parcela, copiar PIX copia-e-cola / código de barras do boleto).

\*\*Específico (anti-IDOR):\*\* paciente só enxerga as próprias cobranças.

\*\*Aceite:\*\* ver próxima parcela e copiar PIX/boleto; teste de que não acessa parcela de outro paciente.



\#### \[x] S22 — Régua de cobrança

\*\*Depende de:\*\* S19, S12

\*\*Objetivo:\*\* Lembretes/cobranças automáticos escalonados.

\*\*Arquivos:\*\* schema (+`CollectionRule`,`CollectionEvent`), fila `collection-ruler` (cron diário), `collection/service.ts`.

\*\*Específico:\*\* jobs idempotentes por (parcela, etapa); respeitar opt-out.

\*\*Aceite:\*\* parcela vencendo dispara D-3/D0/D+X via WhatsApp; eventos logados; não reenvia etapa já enviada.



\#### \[x] S23 — NFS-e

\*\*Depende de:\*\* S20

\*\*Objetivo:\*\* Emissão fiscal integrada ao pagamento.

\*\*Arquivos:\*\* `integrations/nfse/nfse.service.ts` (integrador), fila `nfse-emitter`, schema (+`Invoice`), endpoint.

\*\*Específico:\*\* retry com backoff (prefeituras instáveis); status e retorno persistidos.

\*\*Aceite:\*\* emitir NFS-e (homologação) a partir de um pagamento; status refletido; falha vai para DLQ com motivo.



\#### \[x] S24 — Recibos

\*\*Depende de:\*\* S20

\*\*Objetivo:\*\* Comprovante PDF de pagamento.

\*\*Arquivos:\*\* `receipt/receipt.service.ts` (gera PDF), endpoint, upload p/ Spaces (URL assinada).

\*\*Aceite:\*\* gerar recibo PDF de um pagamento, acessível por URL assinada de expiração curta.



\#### \[x] S25 — SPC consulta + inclusão

\*\*Depende de:\*\* S5, S19

\*\*Objetivo:\*\* Avaliar e cobrar inadimplência via bureau.

\*\*Arquivos:\*\* `integrations/spc/spc.service.ts` (anti-SSRF, fila `spc-query`), schema (+`CreditCheck`), endpoints de consulta e inclusão.

\*\*Específico:\*\* consentimento/base legal; tudo auditado; segredos no backend.

\*\*Aceite:\*\* consultar score (sandbox) antes de parcelar; inclusão de inadimplente registrada e auditada.



\#### \[x] S26 — Prontuário (MedicalRecord) + anexos

\*\*Depende de:\*\* S5

\*\*Objetivo:\*\* Registro clínico seguro com imagens/exames.

\*\*Arquivos:\*\* schema (+`MedicalRecord`,`RecordEntry`,`Attachment`), `record/{module,service,controller}.ts`, upload p/ Spaces (URL assinada), cifra em repouso.

\*\*Específico:\*\* acesso a dado de saúde gera `SENSITIVE\_READ` no AuditLog; criptografia em repouso.

\*\*Aceite:\*\* criar entrada e anexar imagem; todo acesso auditado; anti-IDOR no acesso ao prontuário.



\#### \[ ] S27 — Odontograma  ·  \*DIVIDIDA: \[x] S27a (backend: schema + serviço + @vero/types faces/condições) · \[ ] S27b (componente SVG interativo no web)\*

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

\- \*\*2026-06-07 · S2 — Schema núcleo multi-tenant + seed\*\*

  \- \*O que foi feito:\* schema Prisma do núcleo Org/Acesso com 9 modelos multi-tenant (`Tenant, Clinic, Unit, User, UserUnit, Role, Permission, RolePermission, AuditLog`) + enum `AuditAction`. Todos com `tenantId` (regra §2), exceto `Permission` (catálogo global de sistema — exceção documentada). Anti-IDOR de base: email único POR TENANT (`@@unique([tenantId,email])`), índices em `tenantId`. Novo pacote `@vero/types` (compila CommonJS p/ runtime NestJS/ts-node) como FONTE ÚNICA do catálogo de 18 permissions, dos 4 papéis de sistema com mapeamento papel→permission, e das ações de auditoria (const + Zod). Seed IDEMPOTENTE (upsert / ids determinísticos) cria tenant demo + clínica + unidade, papéis, permissions e a CONTA DEMO DE REVISOR de loja (§5) com senha argon2 (de `SEED_DEMO_PASSWORD`; default só fora de produção). Validado AO VIVO contra Postgres efêmero (docker): `migrate dev` aplicou (migration 100% aditiva, não-destrutiva), `prisma db seed` rodou 2x sem duplicar, e o teste de idempotência (2 casos: contagens estáveis + senha demo confere) passou.

  \- \*Arquivos tocados:\* `packages/types/{package.json,tsconfig.json,.eslintrc.cjs,src/index.ts,src/rbac.ts}` (novo pacote); `apps/api/prisma/schema.prisma` (9 modelos + enum), `apps/api/prisma/seed.ts` (novo), `apps/api/prisma/migrations/20260607084705_s2_core_multitenant/` (gerada); `apps/api/package.json` (deps `argon2`+`@vero/types`, config `prisma.seed`, scripts `prisma:seed`/`prisma:migrate`/`test:int`); `apps/api/test/seed.idempotency.spec.ts` (novo, gated por `RUN_DB_TESTS`); `apps/api/.env.example` (sem alteração nesta sessão). Lockfile atualizado.

  \- \*Decisões:\* `@vero/types` compila para CommonJS (`module: CommonJS`) — NestJS/ts-node consomem JS, não TS-source; `main`→`dist/index.js`, build via `tsc` (turbo `^build` garante ordem antes da api). `Role.key`/`Permission.key` como String (não enum Prisma) → permite papéis customizados sem migration de enum; `AuditAction` é enum Prisma (set fixo, integridade no banco) espelhado em `@vero/types` (Prisma exige o enum no DSL — única duplicação aceita, comentada nos dois lados). `UserUnit`/`RolePermission` carregam `tenantId` (consistência com o tenant-scoped helper da S4). Soft-delete (`deletedAt`) preparado em Tenant/Clinic/Unit/User. Teste de idempotência é INTEGRAÇÃO (exige Postgres), gated por `RUN_DB_TESTS=1` (`pnpm --filter @vero/api test:int`) p/ manter `pnpm test`/CI verdes sem banco — o CI ganha serviço Postgres na S52. Aviso do Prisma 6 sobre migrar `package.json#prisma`→`prisma.config.ts` (obrigatório só no Prisma 7) anotado, não migrado agora.

  \- \*Verificação:\* `pnpm lint`/`test`/`build`/`format:check`/`audit` todos verdes. AO VIVO (Postgres efêmero): `migrate dev` OK, seed 2x sem duplicar (18 permissions, 4 papéis, 1 tenant/clínica/unidade, 1 revisor), teste de idempotência 2/2 passou. Container efêmero derrubado ao fim (nada commitado de docker).

  \- \*Pendências p/ próxima:\* (1) ainda falta `docker-compose.yml` (Postgres+Redis) — herdado da S1, necessário p/ dev local sem docker manual e p/ validar `/health` 200. (2) Conta demo de revisor: `revisor.demo@vero.com.br` / senha `VeroDemo!2026` (dev) — documentar nas notas de revisão de loja e trocar via `SEED_DEMO_PASSWORD` em prod. Próxima sessão: \*\*S3 — Autenticação\*\* (login/refresh/logout, JWT + refresh rotativo no Redis).

\- \*\*2026-06-07 · S3 — Autenticação\*\*

  \- \*O que foi feito:\* módulo `auth` completo. `POST /auth/login` valida `tenantSlug`+`email`+`password` (argon2.verify) e emite par de tokens; `POST /auth/refresh` rotaciona (consome o `jti` antigo via Redis `GETDEL` — reuso do refresh antigo → 401); `POST /auth/logout` revoga o `jti` (204, idempotente). Access JWT curto (15min) + refresh longo (7d) revogável: a sessão só vale enquanto o `jti` existir no Redis (whitelist `auth:refresh:{jti}` com TTL). Erro de credencial SEMPRE genérico (`Credenciais inválidas`, 401) — não revela usuário vs senha. Rate limit reforçado anti-brute-force no login: 5/min/IP (`@Throttle` sobrepondo o throttler global só na rota). `JwtStrategy` (passport-jwt) valida access e popula `req.user` (userId/tenantId/roleId) — pronto para os guards da S4; rejeita token tipo `refresh` em rota protegida. DTOs com class-validator (rejeita 400). Validado AO VIVO (Postgres+Redis efêmeros, API real): login 200, login inválido 401 genérico, refresh 200 + reuso do antigo 401, logout 204 + refresh pós-logout 401. `GET /health` também respondeu 200 em runtime (fecha a verificação pendente da S1).

  \- \*Arquivos tocados:\* `apps/api/src/auth/{auth.module,auth.service,auth.controller}.ts`, `apps/api/src/auth/strategies/jwt.strategy.ts`, `apps/api/src/auth/dto/{login.dto,refresh.dto}.ts`, `apps/api/src/app.module.ts` (importa `AuthModule`), `apps/api/package.json` (deps `@nestjs/jwt`+`@nestjs/passport`+`passport`+`passport-jwt`+`class-validator`+`class-transformer`, dev `@types/passport-jwt`), teste `apps/api/test/auth.service.spec.ts` (4 casos). Lockfile atualizado.

  \- \*Decisões:\* login multi-tenant exige `tenantSlug` (email único só por tenant). Refresh ROTATIVO com whitelist no Redis (não blacklist): `GETDEL` consome o jti atomicamente → rotação e detecção de reuso num passo. Access e refresh assinados com o MESMO `JWT_SECRET`, diferenciados pelo claim `type` (`access`/`refresh`) + expiração; jti só no refresh. TTLs como constantes na `AuthService` (15m/7d) — não viraram env (simplicidade §8). `logout` é best-effort/silencioso em token inválido (não vaza). Anti-brute-force via throttler por IP (5/min); lockout por conta ficou fora de escopo (throttler cobre o aceite). 4 testes são UNITÁRIOS (mock de Prisma/Redis/JWT/argon2) → `pnpm test` verde sem DB; o fluxo real foi coberto pelo smoke test ao vivo.

  \- \*Verificação:\* `pnpm lint`/`test` (17 testes; 4 novos de auth)/`build`/`format:check`/`audit` verdes. AO VIVO: 6/6 casos do aceite (login ok/erro, refresh+reuso, logout+pós-logout) com status HTTP corretos; `/health` 200. Containers efêmeros derrubados ao fim (nada de docker commitado).

  \- \*Pendências p/ próxima:\* (1) `start` do `apps/api/package.json` aponta `node dist/main.js`, mas `nest build` emite em `dist/src/main.js` (rootDir `.` inclui src+test) — mismatch pré-existente da S1, corrigir ao mexer no build/Dockerfile. (2) `docker-compose.yml` (Postgres+Redis) ainda pendente. (3) Considerar lockout por conta além do rate limit por IP. Próxima sessão: \*\*S4 — RBAC + tenant guard + anti-IDOR\*\* (a `JwtStrategy` já entrega tenantId/roleId em `req.user`).

\- \*\*2026-06-07 · S4 — RBAC + tenant guard + anti-IDOR\*\*

  \- \*O que foi feito:\* cadeia de controle de acesso GLOBAL, deny-by-default (CLAUDE.md §4 A01 — risco #1). Ordem dos APP_GUARD: `ThrottlerGuard` → `JwtAuthGuard` (authn passport-jwt, respeita `@Public`) → `TenantGuard` (exige tenantId do JWT, injeta `req.tenantId`, 401 se faltar) → `PermissionsGuard` (deny-by-default: rota sem `@Permissions` e não `@Public` é NEGADA; checa se o papel tem TODAS as permissions exigidas; cacheia permissions do papel no Redis `rbac:perms:{roleId}` TTL 300s, carregando do DB tenant-scoped). Toda negação grava `AUTHZ_DENIED` no AuditLog (sem PII — só ids/ação/metadata). `@Public()` aplicado em `AuthController` e `HealthController`. `TenantScope` (helper anti-IDOR): `where()`/`ownerWhere()` forçam `tenantId` (+`ownerId`) no filtro Prisma; `ensureOwned()` lança Forbidden quando o registro não está no escopo (não vaza existência cross-tenant). `AuditService` (@Global) grava eventos de segurança fail-open no log (auditoria nunca derruba a request). Decorators `@Permissions(...keys)` type-safe (PermissionKey de @vero/types) e `@Public()`.

  \- \*Arquivos tocados:\* `apps/api/src/common/decorators/{public,permissions}.decorator.ts`, `apps/api/src/common/guards/{jwt-auth,tenant,permissions}.guard.ts`, `apps/api/src/common/repositories/tenant-scoped.helper.ts`, `apps/api/src/common/audit/{audit.service,audit.module}.ts`, `apps/api/src/app.module.ts` (importa AuditModule + registra os 3 guards globais), `apps/api/src/auth/auth.controller.ts` (+`@Public`), `apps/api/src/health/health.controller.ts` (+`@Public`), teste `apps/api/test/access-control.spec.ts` (9 casos).

  \- \*Decisões:\* cadeia GLOBAL (não por-controller) → API inteira nasce deny-by-default; rotas existentes marcadas `@Public`. Adicionados `JwtAuthGuard`+`@Public` (não listados na spec, mas necessários para a authn global respeitar rotas públicas sem quebrar S3/health). PermissionsGuard cacheia permissions por papel no Redis (evita hit no DB por request); invalidação em PERMISSION_CHANGED virá quando houver edição de papéis. `TenantScope.ensureOwned` lança Forbidden (403) por fidelidade ao aceite (vs 404). Sessão excedeu os 5 arquivos nominais porque o núcleo de acesso é atômico (deixar metade quebra a postura de segurança) — a própria spec da S4 agrupa estes componentes.

  \- \*Verificação:\* `pnpm lint`/`test` (29 testes; 9 novos)/`build`/`format:check`/`audit` verdes. Validado AO VIVO com rota-sonda TEMPORÁRIA (criada, testada e REMOVIDA antes do commit — sem resíduo): sem token→401, com token sem `@Permissions`→403 (deny-by-default), com token + permission do papel→200, públicas (/health, /auth/login)→200. Confirmado no Postgres que o 403 gravou linha `AUTHZ_DENIED` no AuditLog com actorId e `metadata.required`, sem PII. Containers efêmeros derrubados.

  \- \*Pendências p/ próxima:\* (1) invalidar cache `rbac:perms:{roleId}` ao alterar permissões de um papel (PERMISSION_CHANGED). (2) mismatch `start`→`dist/src/main.js` (S1) ainda aberto. (3) `docker-compose.yml` ainda pendente. (4) lockout por conta. Próxima sessão: \*\*S5 — Módulo Patient\*\* (1º recurso tenant-scoped real; usar `@Permissions('patient:*')` + `TenantScope` no service; teste anti-IDOR tenant A↔B).

\- \*\*2026-06-07 · S5 — Módulo Patient\*\*

  \- \*O que foi feito:\* 1º recurso de negócio tenant-scoped — CRUD de paciente usando a infra da S4. Modelo `Patient` (name/phone obrigatórios + leadSource; cpf/email/birthDate/referredById/notes opcionais — "cadastro rápido de 1ª consulta"), auto-relação `referredBy` (indicação), `@@unique([tenantId, cpf])`, soft-delete (`deletedAt`). Enum `LeadSource`. `PatientService` faz TODA query via `TenantScope` (anti-IDOR): `findOne/update/remove` chamam `ensureOwned` → 403 em recurso de outro tenant; `assertReferrer` valida que o indicador é do mesmo tenant. `remove` é soft-delete. Controller com `@Permissions('patient:read|write|delete')` por rota (deny-by-default herdado da S4) e novo param decorator `@TenantId()` (lê `req.tenantId` posto pelo TenantGuard). Validação de CPF (dígitos verificadores) e telefone BR (DDD + 10/11 díg.) como fonte única em `@vero/types`, reusada no DTO via custom validators class-validator (`@IsCpf`/`@IsBrazilianPhone`). `UpdatePatientDto` via `PartialType` (@nestjs/mapped-types). phone/cpf normalizados (só dígitos) ao persistir.

  \- \*Arquivos tocados:\* `packages/types/src/patient.ts` (+export no index — LeadSource, isValidCpf, isValidBrazilianPhone, normalizeDigits), `apps/api/prisma/schema.prisma` (+Patient +enum LeadSource +Tenant.patients), `apps/api/prisma/migrations/20260607172126_s5_patient/` (gerada, aditiva), `apps/api/src/patient/{patient.module,patient.service,patient.controller}.ts`, `apps/api/src/patient/dto/{create-patient.dto,update-patient.dto,validators}.ts`, `apps/api/src/common/decorators/tenant-id.decorator.ts`, `apps/api/src/app.module.ts` (+PatientModule), `apps/api/package.json` (+@nestjs/mapped-types), teste `apps/api/test/patient.service.spec.ts` (8 casos). Lockfile atualizado.

  \- \*Decisões:\* CPF/telefone validados em @vero/types (fonte única front+back, §2) e expostos ao DTO por custom decorators (class-validator no DTO = barreira real, §4). `ensureOwned` retorna 403 (não 404) por fidelidade ao aceite. `referredById` validado contra o mesmo tenant (anti-IDOR + integridade). CPF único por tenant (nullable → múltiplos nulls OK no Postgres). Busca simples (`q` por nome/telefone, take 50) — sem paginação avançada (§8, só o essencial). Lembrete: o Prisma Client precisa de `prisma generate` após mexer no schema (o `nest build` direto não roda o prebuild) — gerar antes de buildar.

  \- \*Verificação:\* `pnpm lint`/`test` (36 testes; 8 novos)/`build`/`format:check`/`audit` verdes. Validado AO VIVO (PG+Redis efêmeros + API real): CREATE 201 (phone/cpf normalizados), GET/LIST/PATCH 200, CPF inválido e telefone inválido → 400 com mensagem; \*\*anti-IDOR real\*\*: inserido paciente sob outro tenant via SQL → GET/PATCH como tenant demo → 403, listagem do demo não o vê; soft-delete → DELETE 204, GET pós-delete 403, linha preservada com `deletedAt`. Containers derrubados.

  \- \*Pendências p/ próxima:\* (1) invalidar cache `rbac:perms` no PERMISSION_CHANGED. (2) mismatch `start`→`dist/src/main.js` (S1). (3) `docker-compose.yml` pendente. (4) lockout por conta. Próxima sessão: \*\*S6 — Appointment + Availability\*\* (núcleo da agenda: checagem de conflito por profissional/sala, timezone da unidade; tentar marcar em horário ocupado → 409).

\- \*\*2026-06-07 · S6 — Appointment + Availability (backend)\*\*

  \- \*O que foi feito:\* núcleo da agenda. Modelo `Appointment` (FK profissional=User/paciente/unidade, `roomId?`, `startsAt`/`endsAt` como instantes UTC, enum `AppointmentStatus`, `markers String[]`, soft-delete) + `Availability` (janela por profissional/unidade/dia-da-semana, minutos do dia no fuso da unidade). `AppointmentService`: create/findOne/findAll/move/cancel + createAvailability/listAvailability, TODO via `TenantScope` (anti-IDOR 403). \*\*Conflito (409)\*\* por profissional E por sala (overlap de instantes `startsAt < :end AND endsAt > :start`, ignorando status CANCELLED/NO_SHOW); `move` exclui o próprio id do conflito. \*\*Disponibilidade\*\* enforce-if-defined: se há janela definida p/ o dia, o horário deve caber — convertendo o instante UTC p/ o fuso da unidade via `Intl` (util pura `localDayAndMinute`, sem dep nova). Controller com `@Permissions('appointment:read|write|cancel')` por rota, reusando `@TenantId()` (S5). Validações: `startsAt<endsAt`, profissional/paciente/unidade existem no tenant.

  \- \*Arquivos tocados:\* `packages/types/src/appointment.ts` (+export — APPOINTMENT_STATUSES, FREEING_STATUSES), `apps/api/prisma/schema.prisma` (+Appointment +AppointmentStatus +Availability +back-relations em Tenant/Unit/User/Patient), `apps/api/prisma/migrations/20260607192813_s6_appointment/` (aditiva), `apps/api/src/appointment/{appointment.module,appointment.service,appointment.controller,agenda.util}.ts`, `apps/api/src/appointment/dto/{create-appointment,move-appointment,create-availability,list-appointments}.dto.ts`, `apps/api/src/app.module.ts` (+AppointmentModule), teste `apps/api/test/appointment.service.spec.ts` (8 casos). \*\*Sem dep nova\*\* (timezone via Intl).

  \- \*Decisões:\* tempos como instantes UTC (conflito é tz-agnóstico — overlap de instantes); o fuso da unidade só rege a disponibilidade (Availability em minutos locais + dayOfWeek 0=dom). Profissional = `User` (sem modelo `Professional` dedicado ainda — §6 lista, fica p/ depois). `roomId` é string opcional (modelo `Room` não existe ainda) — conflito de sala já funciona. Disponibilidade enforce-if-defined (sem janela → não bloqueia) p/ não travar o fluxo básico nem os testes de conflito. `Intl.DateTimeFormat` p/ converter UTC→local sem luxon/dep.

  \- \*Verificação:\* `pnpm lint`/`test` (39 testes; 8 novos)/`build`/`format:check`/`audit` verdes. Validado AO VIVO (PG+Redis efêmeros + API real): criar 201, \*\*conflito de horário 409\*\* (no create e no move), agendamento adjacente 201, mover p/ slot livre 200, cancelar 200 + recriar no slot liberado 201, disponibilidade DENTRO 201 / FORA 400 (conversão de fuso SP correta: 16:00Z→13:00 local fora da janela 09–12), anti-IDOR cross-tenant 403. Bônus: o rate limit do login (5/min, S3) disparou de verdade durante a bateria. Containers efêmeros derrubados (Docker Desktop instável durante a sessão — reiniciado 1x; possíveis containers `vero-s6-*` órfãos a limpar quando o daemon voltar).

  \- \*Pendências p/ próxima:\* (1) modelo `Professional` e `Room` dedicados (hoje profissional=User, room=string). (2) invalidar cache `rbac:perms` no PERMISSION_CHANGED. (3) mismatch `start`→`dist/src/main.js` (S1). (4) `docker-compose.yml` pendente. (5) lockout por conta. Próxima sessão: \*\*S7 — Web base + agenda\*\* (1ª tela de gestão: `apps/web` Next.js 14 + `packages/api-client` tipado com refresh transparente; logar e ver/criar agendamento; token em cookie httpOnly).

\- \*\*2026-06-08 · S7a — Web base (scaffold + auth + guard)\*\*  ·  \*S7 dividida em S7a (esta) + S7b (tela de agenda, pendente)\*

  \- \*O que foi feito:\* 1ª superfície frontend. `packages/api-client` (client HTTP tipado, thin — recebe baseUrl/token, sem segredos). `apps/web` Next.js (App Router) com padrão \*\*BFF\*\*: o browser só fala com o Next; login via \*\*Server Action\*\* troca credenciais na API e grava tokens em \*\*cookie httpOnly\*\* (`vero_at`/`vero_rt`); `middleware.ts` faz guard deny-by-default (rota protegida sem sessão → /login) e \*\*refresh transparente\*\* (quando o cookie de access de 15min expira, renova no backend usando o refresh e regrava os cookies antes de renderizar). `lib/session.ts` centraliza os cookies (Next 15: `cookies()` async). Página `/login` (form client + `useActionState`, erro genérico) e `/agenda` mínima protegida (lista/criação são da S7b). Tailwind com a paleta da marca (preset compartilhado). CORS nem se aplica (chamadas server-side).

  \- \*Arquivos tocados:\* `packages/api-client/{package.json,tsconfig.json,.eslintrc.cjs,src/index.ts}`; `apps/web/{package.json,tsconfig.json,next.config.mjs,postcss.config.mjs,tailwind.config.ts,.eslintrc.cjs,.env.example}`, `apps/web/app/{layout.tsx,page.tsx,globals.css,login/{page.tsx,actions.ts},agenda/page.tsx}`, `apps/web/lib/session.ts`, `apps/web/middleware.ts`; raiz: `.gitignore`+`.prettierignore` (+`next-env.d.ts`), `package.json` (pnpm.overrides postcss).

  \- \*Decisões (IMPORTANTE):\* \*\*subimos para Next.js 15 + React 19\*\* (era Next 14 no §3). Motivo: o Next 14 tinha \*\*6 vulnerabilidades HIGH\*\* (DoS/SSRF/bypass de middleware) SEM patch no 14.x — só corrigidas no 15 (`>=15.5.16`). §4 (segurança) prevalece sobre o pin do §3; \*\*§3 atualizado p/ Next 15\*\*. \*\*ADR pendente\*\* em `/docs/adr` registrando o desvio. Também: `postcss>=8.5.10` via `pnpm.overrides` (corrige 1 moderate XSS). Migração 14→15: `cookies()`/`headers()` async, `useFormState`→`useActionState`. Auth via BFF/Server Actions (cookie httpOnly só pode ser setado em Action/Route Handler/middleware, nunca em render de Server Component) — por isso o refresh transparente vive no \*\*middleware\*\* (que pode setar cookie na response), e Server Components só LEEM.

  \- \*Verificação:\* `pnpm lint`/`build` (Next 15 buildou: /login estático, /agenda dinâmico, middleware ~35kB)/`test` (39)/`format:check`/`audit` \*\*zero vulnerabilidades\*\* (6 high + 1 moderate resolvidos). AO VIVO (`next start`, sem API/DB): guard de rota OK — `/agenda` e `/` sem cookie → \*\*307 → /login\*\*, `/login` → 200 e renderiza o form. O fluxo completo \*login→cookie→agenda\* (precisa da API+DB+Redis) NÃO foi exercido por browser nesta sessão (Docker Desktop instável + disco a 98%); coberto por: build type-checkando o BFF + auth da API já validada ao vivo na S3. Fica p/ a S7b (com Playwright/webapp-testing) ou verificação manual.

  \- \*Incidentes/ambiente:\* disco encheu (\*\*ENOSPC\*\*) e \*\*truncou `apps/web/package.json` para 0 bytes\*\* — reescrito; conferir integridade de arquivos após ENOSPC. Docker Desktop caiu várias vezes (daemon trava o pipe). Containers `vero-s6-*` podem estar órfãos.

  \- \*Pendências p/ próxima:\* (1) \*\*S7b — tela de agenda\*\* (listar/criar agendamento consumindo a API via BFF; e2e de login com Playwright). (2) criar o \*\*ADR do Next 15\*\* em `/docs/adr`. (3) liberar disco / limpar `.vhdx` do Docker. (4) demais pendências herdadas (Professional/Room, cache rbac, `start` path, docker-compose, lockout).

\- \*\*2026-06-08 · S7b — Tela de agenda (listar + criar via BFF)\*\*  ·  \*fecha a S7\*

  \- \*O que foi feito:\* 1ª tela de gestão útil. `packages/api-client` ganhou os métodos de negócio prometidos na S7a — `listPatients`, `listAppointments(params)`, `createAppointment(input)` — com tipos `Appointment`/`PatientSummary`/`CreateAppointmentInput` (status tipado via `@vero/types`). `apps/web/lib/api.ts` (`serverApi()`) monta o client autenticado a partir do cookie httpOnly de access (lido server-side; o middleware da S7a já o renovou de forma transparente). `app/agenda/page.tsx` virou Server Component que busca agendamentos + pacientes em paralelo (fail-soft: erro de dependência mostra aviso, não derruba a UI) e renderiza lista + form. `app/agenda/actions.ts` é a Server Action de criação: converte `datetime-local`→ISO, valida UX e traduz erros do backend em mensagens seguras (409→conflito, 400→inválido/fora da disponibilidade, 403→sem permissão), com `revalidatePath`. `app/agenda/appointment-form.tsx` é o form client (`useActionState`) com dropdown de paciente (da API) e IDs de unidade/profissional como texto (sem endpoint de listagem ainda). Criado o \*\*ADR 0001\*\* (`docs/adr/0001-next15-upgrade.md`) registrando o desvio §3 (Next 14→15) — pendência da S7a fechada.

  \- \*Arquivos tocados:\* `packages/api-client/src/index.ts` (tipos + 3 métodos), `apps/web/lib/api.ts` (novo), `apps/web/app/agenda/{page.tsx (reescrita),actions.ts (novo),appointment-form.tsx (novo)}`, `docs/adr/0001-next15-upgrade.md` (novo). Sem dep nova.

  \- \*Decisões:\* mantido o padrão BFF da S7a — toda chamada à API sai do servidor do Next com o token do cookie; nada de token/segredo no browser (§2/§5). Os métodos de negócio entraram no `api-client` (e não inline no web) porque é a fonte única de contrato HTTP (§8) e o próprio comentário da S7a já reservava o espaço. Unidade/profissional como input de texto (não dropdown) porque \*\*não há endpoint de listagem de Unit/User\*\* ainda — criar um expandiria o escopo para a API; fica para sessão futura (junto de Professional/Room dedicados). `page.tsx` é `force-dynamic` (dados por sessão). `next dev` no teste ao vivo (não `next start`) porque em produção o cookie vira `secure` e não trafega sobre http local.

  \- \*Verificação:\* `pnpm lint`/`test` (37, 2 skip de DB)/`build` (Next 15: /agenda dinâmico ~103kB)/`format:check`/`audit` \*\*zero vulnerabilidades\*\* — todos verdes. \*\*E2E AO VIVO\*\* (PG+Redis efêmeros nas portas 5455/6395 p/ não colidir com outros projetos, API + web reais): contrato exato do api-client batido por curl contra o backend (login → `listPatients` → `createAppointment` 201 → conflito \*\*409\*\* → `listAppointments` mostra). E pelo \*\*navegador (Playwright)\*\*: login no web grava cookie httpOnly e redireciona p/ /agenda, a lista renderiza o agendamento (busca server-side com o token do cookie), o form cria um 2º agendamento ("Agendamento criado.") que aparece como "Agendamentos (2)" — screenshot confirmou o render (paleta da marca, badge de status). Ambiente efêmero 100% derrubado ao fim (containers removidos, `.env` e temporários apagados; árvore limpa — só os 6 arquivos da sessão).

  \- \*Pendências p/ próxima:\* (1) endpoints de listagem de \*\*Unit\*\* e \*\*User/Professional\*\* p/ trocar os inputs de ID por seletores na agenda (+ modelos `Professional`/`Room` dedicados — §6). (2) editar/mover/cancelar agendamento pela UI (backend da S6 já expõe). (3) invalidar cache `rbac:perms` no PERMISSION_CHANGED. (4) mismatch `start`→`dist/src/main.js` (S1). (5) `docker-compose.yml` ainda pendente (subi containers manuais de novo). (6) lockout por conta. Próxima sessão: \*\*S8 — mobile-patient base + EAS\*\* (App do Paciente Expo; build EAS dev em device; paciente vê só as próprias consultas — anti-IDOR; regras de loja §5).

\- \*\*2026-06-08 · S8a — Autenticação do paciente (backend)\*\*  ·  \*S8 DIVIDIDA em S8a–S8d (ver §10)\*

  \- \*O que foi feito:\* destravou o App do Paciente — descoberta a lacuna de que a auth da S3 é \*\*só de equipe\*\* (`User`), sem nenhuma credencial/login de paciente. Decisão do usuário: \*\*auth por senha\*\* (CPF/e-mail + senha), reusando a infra da S3. Entregue `PatientAuthService` (espelha a `AuthService`): login por `tenantSlug` + `identifier` (CPF \*ou\* e-mail) + senha (argon2), access 15min + refresh rotativo 7d revogável no Redis, logout idempotente. Tokens com type \*\*PRÓPRIO\*\* (`patient-access`/`patient-refresh`) e namespace de refresh \*\*separado\*\* (`auth:patient-refresh:{jti}`). `PatientAuthController` em `POST /auth/patient/{login,refresh,logout}` (@Public, login com rate limit 5/min/IP). Schema: `Patient.passwordHash String?` (null = paciente ainda sem acesso ao app), migration aditiva. Seed ganhou \*\*paciente demo de loja\*\* (§5): `paciente.demo@vero.com.br` / CPF `390.533.447-05` / senha `VeroDemo!2026`.

  \- \*Arquivos tocados:\* `apps/api/prisma/schema.prisma` (+`passwordHash`), `apps/api/prisma/migrations/20260608232048_s8a_patient_password/` (aditiva), `apps/api/prisma/seed.ts` (+paciente demo), `apps/api/src/auth/{patient-auth.service,patient-auth.controller}.ts` (novos), `apps/api/src/auth/dto/patient-login.dto.ts` (novo), `apps/api/src/auth/auth.module.ts` (wiring), teste `apps/api/test/patient-auth.service.spec.ts` (5 casos). Reusou `RefreshDto` e `normalizeDigits` (@vero/types).

  \- \*Decisões (SEGURANÇA):\* a S8a \*\*não\*\* toca `JwtStrategy`/guards de propósito. Como a `JwtStrategy` de equipe rejeita qualquer type ≠ `access`, um token de paciente é \*\*barrado por padrão em toda rota protegida de equipe\*\* — provado ao vivo (401 em /appointments e /patients). \*\*Latente importante p/ a S8b:\*\* a `PermissionsGuard` faz `rolePermission.findMany({ where: { tenantId, roleId } })`; se um principal de paciente (sem `roleId`) algum dia passar pela strategy, `roleId: undefined` faz o Prisma \*\*omitir o filtro\*\* e retornar TODAS as permissions do tenant → a S8b DEVE adicionar uma faixa explícita (negar quando `kind !== 'staff'`/sem roleId) ANTES de fazer a `JwtStrategy` aceitar `patient-access`. Identificador: CPF é único por tenant (`@@unique([tenantId,cpf])`); \*\*e-mail não é único\*\* → login por e-mail só autentica se casar com EXATAMENTE 1 paciente (senão erro genérico, sem vazar). `tenantSlug` exigido no login (identificador só é único dentro do tenant) — UX a melhorar (seleção de clínica/white-label) no futuro.

  \- \*Verificação:\* `pnpm lint`/`test` (44; 5 novos, 2 skip de DB)/`build`/`format:check`/`audit` \*\*zero vulns\*\* — verdes. \*\*AO VIVO\*\* (PG+Redis efêmeros 5455/6395, API real): 8/8 — login por CPF 200, por e-mail 200, senha errada 401 genérico, \*\*token de paciente barrado (401) em /appointments e /patients\*\*, refresh rotaciona 200, reuso do antigo 401, logout 204, refresh pós-logout 401. Ambiente efêmero derrubado; `.env`/temporários removidos; árvore limpa.

  \- \*Pendências p/ próxima (S8b):\* (1) \*\*`GET /me/appointments`\*\* owner+tenant-scoped (anti-IDOR: paciente só vê as próprias consultas) + faixa de guard do paciente: `@Patient` decorator, `JwtStrategy` aceitando `patient-access` (com `kind:'patient'`), e o \*\*endurecimento da `PermissionsGuard`\*\* descrito acima. (2) depois: \*\*S8c\*\* (scaffold Expo + EAS + app.config + Sentry, §5) e \*\*S8d\*\* (telas login + "minhas consultas"). Herdadas: Unit/Professional listagem, editar/mover/cancelar na UI, cache `rbac:perms`, `start` path, docker-compose, lockout. Conta demo do app do paciente documentar nas notas de revisão de loja (§5).

\- \*\*2026-06-08 · S8b — `/me/appointments` (anti-IDOR) + faixa de guard do paciente\*\*

  \- \*O que foi feito:\* o paciente autenticado passa a enxergar SÓ as próprias consultas, sem abrir brecha no RBAC de equipe. `JwtStrategy` agora discrimina por `type` e devolve um \*\*principal tipado\*\* (`Principal = AuthenticatedUser{kind:'staff'} | AuthenticatedPatient{kind:'patient'}`): `access`→equipe, `patient-access`→paciente, qualquer outro→401. Novo `@Patient()` (marca rota do app do paciente) + `@PatientId()` (injeta o patientId do principal, fail-closed). `PermissionsGuard` ganhou \*\*duas faixas\*\*: rota `@Patient` exige principal de paciente (sem checar papel); rota de equipe agora \*\*nega explicitamente\*\* quando `!user || kind==='patient' || !roleId` ANTES de qualquer query — \*\*fecha o latente da S8a\*\* (roleId ausente faria o Prisma omitir o filtro e vazar todas as permissions do tenant). `recordDenial` lida com o union (actorId = patientId|userId; metadata sem PII). Módulo `me`: `MeController` (`@Patient`, `GET /me/appointments`) + `MeService` (query via `TenantScope.ownerWhere(patientId, …, 'patientId')` — tenant+owner).

  \- \*Arquivos tocados:\* `apps/api/src/common/decorators/patient.decorator.ts` (novo: `@Patient`+`@PatientId`), `apps/api/src/auth/strategies/jwt.strategy.ts` (principal discriminado), `apps/api/src/common/guards/permissions.guard.ts` (2 faixas + endurecimento + recordDenial union), `apps/api/src/common/guards/tenant.guard.ts` (tipo→`Principal`), `apps/api/src/me/{me.controller,me.service,me.module}.ts` (novos), `apps/api/src/app.module.ts` (+MeModule), teste `apps/api/test/access-control.spec.ts` (+4 casos da faixa do paciente). \*\*Sem migration\*\* (S8a já criou `passwordHash`).

  \- \*Decisões:\* o endurecimento testa `!roleId`/`kind==='patient'` (não exige `kind==='staff'` literal) → os mocks legados de staff (sem `kind`, com `roleId`) seguem passando. `MeService` usa o helper anti-IDOR da S4 (não duplica lógica). `tenantId` continua vindo do `TenantGuard` (paciente também tem `tenantId` no JWT, então a cadeia global vale sem exceção). Mantida a ordem dos guards (Throttler→Jwt→Tenant→Permissions).

  \- \*Verificação:\* `pnpm lint`/`test` (46; 4 novos, 2 skip)/`build`/`format:check`/`audit` \*\*zero vulns\*\* — verdes. \*\*AO VIVO\*\* (PG+Redis efêmeros 5455/6395): cenário com paciente demo + paciente B, cada um com 1 consulta. (6) `GET /me/appointments` como paciente demo → \*\*count=1, só `demo-patient`\*\* (NÃO vê a de B) — anti-IDOR provado. (7) token de equipe em `/me/appointments` → \*\*403\*\*. (8) token de paciente em `/appointments` e `/patients` → \*\*403\*\* (endurecimento; antes vazaria). AuditLog conferido no Postgres: negações gravaram `AUTHZ_DENIED` corretas (paciente→actorId=patientId+`kind:patient`; staff→actorId=userId+roleId), sem PII. Ambiente efêmero derrubado; `.env`/temporários removidos; árvore limpa.

  \- \*Pendências p/ próxima:\* \*\*S8c\*\* — scaffold `apps/mobile-patient` (Expo Router) + `app.config.ts` (bundle `br.com.vero.paciente`, ícone/splash, permissões mínimas + iOS usage strings, targetSdk 36/iOS 26) + `eas.json` (dev/preview/production) + Sentry (§5). Depois \*\*S8d\*\* (telas login + "minhas consultas" consumindo `/auth/patient/login` e `/me/appointments`). \*Nota:\* `eas build` exige conta Expo/EAS + device — verificação do build em device é do usuário (não tenho como rodar). Herdadas: Unit/Professional listagem + seletores na agenda, editar/mover/cancelar na UI, cache `rbac:perms` no PERMISSION_CHANGED, `start`→`dist/src/main.js`, `docker-compose.yml`, lockout por conta.

\- \*\*2026-06-08 · S8c — mobile-patient base (scaffold Expo + EAS + Sentry)\*\*

  \- \*O que foi feito:\* nasceu o \*\*App do Paciente\*\* (`apps/mobile-patient`), 4ª superfície. Scaffold via `create-expo-app` (registry como fonte de verdade das versões → \*\*Expo SDK 56\*\*: react 19.2.3, react-native 0.85.3, expo-router 56.2.9, @sentry/react-native 7.11), convertido para \*\*Expo Router\*\* (`app/_layout.tsx` com `Sentry.init`+`Sentry.wrap`+`Stack`; `app/index.tsx` tela base da marca). `app.config.ts` (config dinâmica, FONTE ÚNICA — removido o `app.json` redundante): name \*\*Vero\*\*, scheme `vero`, bundle/package \*\*`br.com.vero.paciente`\*\* (§0), ícone/splash (assets reais do template), plugins expo-router/expo-splash-screen/expo-build-properties/@sentry, e \*\*targets de loja (§3)\*\* via expo-build-properties: Android `targetSdkVersion/compileSdkVersion 36` + iOS `deploymentTarget 16.4` (mínimo do SDK 56; o SDK do iOS 26 é da imagem de build do EAS). `eas.json` com perfis dev(APK/internal)/preview/production(AAB, autoIncrement) + submit. Sentry: DSN é chave PÚBLICA de cliente via `EXPO_PUBLIC_SENTRY_DSN` (não segredo, §5 "sem segredo no bundle" respeitado). `metro.config.js` para monorepo (watchFolders + nodeModulesPaths). `.env.example` só com `EXPO_PUBLIC_*` não-secretos. Permissões mínimas: o app base não pede câmera/localização/push (push é S13), sem usage strings desnecessárias.

  \- \*Arquivos tocados:\* `apps/mobile-patient/{package.json,app.config.ts,eas.json,babel.config.js,metro.config.js,tsconfig.json,.env.example,.gitignore,app/_layout.tsx,app/index.tsx,assets/*}` (novos); raiz `package.json` (override `uuid@<11.1.1`→`>=11.1.1` p/ zerar 1 moderate transitiva do Expo) + `pnpm-lock.yaml`.

  \- \*Decisões (IMPORTANTE — monorepo/pnpm):\* tentei `node-linker=hoisted` (recomendação oficial Expo p/ RN) MAS isso, somado a forçar `react`/`react-dom` 19.2.3 no workspace todo, \*\*quebrou o build do web\*\* (Next 15.5.19 com React 19.2.3 → `useContext` null no prerender de /404). \*\*Revertido:\* mantido o linker pnpm \*\*isolado\*\* (web/api intactos, já provados) + \*\*sem\*\* override de react — no modo isolado o mobile recebe seu próprio React 19.2.3 aninhado, sem colidir com o ^19.0.0 do web.\* TypeScript do mobile \*\*pinado em `^5.6.3`\*\* (não o ~6.0.3 que o SDK sugere) p/ o monorepo ficar num único TS major; o desvio está declarado em `expo.install.exclude:["typescript"]` (expo-doctor não reclama). \*Nota de device-build:\* peer warning `react-native-worklets@0.9.1` vs `^0.7.4||^0.8.0` (esperado por `expo-modules-core`) — não-fatal, expo-doctor 21/21; verificar no 1º build em device.

  \- \*Verificação:\* `pnpm lint` (inclui `tsc --noEmit` do mobile)/`test` (46)/`build` (web+api)/`format:check`/`audit` \*\*zero vulns\*\* — todos verdes. `npx expo config --json` avalia limpo (name Vero, bundle correto, 4 plugins, apiBaseUrl). \*\*`expo-doctor` 21/21\*\*. \*\*NÃO\*\* há como eu rodar `eas build`/abrir em device aqui (exige conta Expo/EAS + aparelho) — \*\*verificação do build em device físico é do usuário\*\* (aceite original da S8). Nada efêmero a derrubar nesta sessão (só install).

  \- \*Pendências p/ próxima:\* \*\*S8d\*\* — telas de \*\*login\*\* (consumindo `POST /auth/patient/login`, guardar tokens com `expo-secure-store`) e \*\*"minhas consultas"\*\* (`GET /me/appointments`, anti-IDOR já garantido no backend). Sugiro um `lib/api` no app reusando os contratos (ou um client leve). Para testar ao vivo em device, a API precisa do IP da máquina (não `localhost`). \*\*S8 fecha na S8d.\*\* Herdadas: device-build (usuário), worklets peer, Unit/Professional listagem, cache `rbac:perms`, `start` path, docker-compose, lockout.

\- \*\*2026-06-08 · S8d — App do Paciente: login + "minhas consultas" (FECHA a S8)\*\*

  \- \*O que foi feito:\* completou o aceite da S8 — o paciente loga e vê só as próprias consultas. `lib/api.ts` (client fetch self-contained — NÃO importa pacote do workspace, p/ evitar resolução de symlink no Metro): `login`/`refresh`/`logout` (`/auth/patient/*`) + `myAppointments` (`/me/appointments`); baseUrl de `EXPO_PUBLIC_API_URL`. `lib/auth.tsx` (AuthProvider/`useAuth`): tokens em \*\*`expo-secure-store`\*\* (Keychain/Keystore — §5), `signIn/signOut/refresh`; refresh rotativo, e em falha de refresh faz signOut (fail-closed). `app/_layout.tsx`: AuthProvider + \*\*AuthGate\*\* (deny-by-default: sem sessão→/login; logado em /login→/) + Sentry. `app/login.tsx` (tenantSlug + CPF/e-mail + senha; erro genérico espelhando o backend §4). `app/index.tsx` ("minhas consultas": lista de `/me/appointments`, refresh-on-401 com retry único, botão Sair, estados loading/erro/vazio).

  \- \*Arquivos tocados:\* `apps/mobile-patient/lib/{api.ts,auth.tsx}` (novos), `apps/mobile-patient/app/{_layout.tsx,login.tsx,index.tsx}` (login novo; _layout/index reescritos), `apps/mobile-patient/app.config.ts` (+plugin `expo-secure-store`), `apps/mobile-patient/package.json` (+`expo-secure-store`) + `pnpm-lock.yaml`.

  \- \*Decisões:\* client HTTP \*\*self-contained\*\* no app (não reusa `@vero/api-client`) — de propósito, p/ não arrastar resolução de pacote do workspace pelo Metro (área frágil no pnpm isolado) e porque o api-client não tem o fluxo de paciente. `expo-secure-store` (não AsyncStorage) p/ os tokens (§5). Padrão de auth-gate do Expo Router via `useSegments`+`useRouter`. Refresh-on-401 simples (1 retry) — sem interceptor global (§8 simplicidade).

  \- \*Verificação:\* `pnpm lint` (inclui `tsc --noEmit` do mobile)/`test` (46)/`build` (web+api)/`format:check`/`audit` \*\*zero vulns\*\* — verdes. \*\*`expo-doctor` 21/21\*\*. \*\*Verificação forte sem device:\* `npx expo export --platform android` EMPACOTOU o app inteiro pelo Metro (bundle 5.1MB) — prova que TODOS os imports resolvem no pnpm isolado e que o app compila (telas + lib/api + lib/auth + secure-store + sentry + router).\* Os endpoints consumidos (`/auth/patient/login`, `/me/appointments`) já tinham sido validados AO VIVO nas S8a/S8b. \*\*Falta só (do usuário):\* abrir em device/simulador via `expo start`/EAS e logar contra a API (precisa do IP da máquina, não `localhost`) — não tenho device/conta Expo p/ isso.\*

  \- \*Pendências p/ próxima:\* \*\*S8 COMPLETA.\*\* Próxima no backlog: \*\*S9 — mobile-pro base + EAS\*\* (App do Profissional; mesmo padrão de loja; agenda do dia read-only da unidade). Considerar extrair o que é comum (client/auth/secure-store, tema) p/ um pacote compartilhável quando o mobile-pro chegar. Herdadas: device-build do paciente (usuário), worklets peer, exclusão de conta (S10, é requisito de loja antes de submeter), Unit/Professional listagem + seletores na agenda web, cache `rbac:perms`, `start`→`dist/src/main.js`, `docker-compose.yml`, lockout.

\- \*\*2026-06-09 · S9a — mobile-pro base (scaffold Expo + EAS + Sentry)\*\*  ·  \*S9 DIVIDIDA em S9a (esta) + S9b (login + agenda do dia)\*

  \- \*O que foi feito:\* nasceu o \*\*App do Profissional\*\* (`apps/mobile-pro`), 5ª superfície, no MESMO padrão da casca do paciente (S8c). Scaffold via `create-expo-app` (Expo SDK 56) convertido p/ Expo Router. `app.config.ts` (fonte única, sem app.json): name \*\*"Vero Pro"\*\*, scheme `vero-pro`, bundle/package \*\*`br.com.vero.pro`\*\* (§0), variação escura da marca (`#0d1b2a`), plugins router/secure-store/splash/build-properties/sentry, targets de loja (Android targetSdk/compileSdk 36 + iOS deploymentTarget 16.4). `eas.json` dev(APK)/preview/production(AAB). Sentry init no `_layout` via `EXPO_PUBLIC_SENTRY_DSN` (chave pública, sem segredo no bundle, §5). `metro.config.js` p/ monorepo. `app/index.tsx` tela base da marca (App Pro). \*\*Sem backend novo:\* o profissional é um `User` de equipe → na S9b reusa `/auth/login` (S3) + `GET /appointments` (S6, tenant-scoped).\*

  \- \*Arquivos tocados:\* `apps/mobile-pro/{package.json,app.config.ts,eas.json,babel.config.js,metro.config.js,tsconfig.json,.env.example,.gitignore,app/_layout.tsx,app/index.tsx,assets/*}` (novos) + `pnpm-lock.yaml`. \*\*Sem mudança em api/web/mobile-patient nem nos overrides da raiz\*\* (o conjunto de deps SDK 56 já estava estabilizado pela S8; reusei as mesmas versões, então `pnpm install` não mexeu em mais nada).

  \- \*Decisões:\* `package.json` autorado direto com o conjunto SDK 56 já validado na S8 (evita o vai-e-vem do `expo install`). `expo-secure-store` já incluído agora (a S9b vai precisar p/ os tokens de equipe) → 1 só install. Mantido o pnpm \*\*isolado\*\* (mobile-pro recebe React próprio aninhado, sem colidir com web) e TS pinado `^5.6.3` (`expo.install.exclude`). App Pro em variação ESCURA/sólida da marca (§0). \*Decisão deixada p/ S9b:\* manter o app \*\*self-contained\*\* (duplicar o `lib/api`+`lib/auth` adaptados p/ auth de equipe) OU extrair um pacote compartilhável `@vero/mobile-shared` — duplicar é mais seguro p/ o Metro (resolução de pacote do workspace é a área frágil no pnpm isolado); pacote compartilhável fica como melhoria futura.

  \- \*Verificação:\* `pnpm lint` (inclui `tsc --noEmit` do mobile-pro)/`test` (46)/`build` (web+api)/`format:check`/`audit` \*\*zero vulns\*\* — verdes. `expo config` avalia limpo (Vero Pro, `br.com.vero.pro`, 5 plugins). \*\*`expo-doctor` 21/21.\*\* \*\*`npx expo export --platform android` empacotou o app (bundle 5.1MB)\*\* — imports resolvem no pnpm isolado. \*Device-build via EAS = verificação do usuário (sem conta Expo/aparelho aqui).\* Mesmo peer warning não-fatal `react-native-worklets@0.9.1` da S8c.

  \- \*Pendências p/ próxima:\* \*\*S9b\*\* — telas de \*\*login de equipe\*\* (`POST /auth/login` com tenantSlug+email+senha; tokens em `expo-secure-store`) e \*\*"agenda do dia"\*\* read-only (`GET /appointments?from=hoje&to=amanhã`, filtrando pela unidade quando houver endpoint de unidades do usuário — hoje o JWT não traz unitId; mostrar o dia do tenant e anotar a limitação, como na S7b). Reusar o padrão de auth-gate/secure-store da S8d. Herdadas: device-build (usuário), worklets peer, endpoint de unidades do profissional, Unit/Professional listagem na web, cache `rbac:perms`, `start` path, docker-compose, lockout.

\- \*\*2026-06-09 · S9b — mobile-pro: login de equipe + agenda do dia (FECHA a S9)\*\*

  \- \*O que foi feito:\* completou o aceite da S9 — o profissional loga e vê a agenda do dia. \*\*Sem backend novo\*\*, reusando o que já existia: `lib/api.ts` (client fetch self-contained) chama `/auth/login` (S3, equipe), `/auth/refresh`, `/auth/logout` e `GET /appointments?from&to` (S6). `lib/auth.tsx` espelha a S8d (AuthProvider, tokens em `expo-secure-store` com chaves próprias `vero_pro_*`, refresh rotativo + signOut fail-closed). `app/_layout.tsx`: AuthProvider + AuthGate deny-by-default (sem sessão→/login). `app/login.tsx` (tenantSlug+email+senha; erro genérico §4). `app/index.tsx` ("agenda do dia" READ-ONLY: calcula a janela do dia LOCAL como instantes UTC e busca `/appointments` nela; lista hora-início–fim + status; refresh-on-401; Sair; estados loading/erro/vazio).

  \- \*Arquivos tocados:\* `apps/mobile-pro/lib/{api.ts,auth.tsx}` (novos), `apps/mobile-pro/app/{_layout.tsx,login.tsx,index.tsx}` (login novo; _layout/index reescritos). \*\*Sem deps novas\*\* (secure-store já entrou na S9a), sem mudança no lockfile/raiz.

  \- \*Decisões:\* client/auth \*\*self-contained\*\* (duplica o padrão da S8d adaptado p/ auth de EQUIPE: `/auth/login` em vez de `/auth/patient/login`) — confirmada a decisão da S9a de não extrair pacote compartilhável agora (resolução de pacote do workspace é frágil no Metro/pnpm isolado). Agenda \*\*read-only\*\* (aceite da S9; criar/mover não é escopo). \*\*Limitação anotada (como na S7b):\* mostra a agenda do dia do TENANT, não filtrada por unidade — o JWT de equipe traz tenantId/roleId mas NÃO unitId, e não há endpoint das unidades do usuário ainda; quando existir, filtrar por `unitId`.\* Itens mostram hora+status (o `GET /appointments` não retorna nome do paciente; nome dependeria de endpoint mais rico).

  \- \*Verificação:\* `pnpm lint` (inclui `tsc --noEmit` do mobile-pro)/`test` (46)/`build` (web+api)/`format:check`/`audit` \*\*zero vulns\*\* — verdes. \*\*`expo-doctor` 21/21.\*\* \*\*`npx expo export --platform android` empacotou o app inteiro pelo Metro\*\* (imports resolvem no pnpm isolado: telas + lib/api + lib/auth + secure-store + sentry + router). Endpoints consumidos (`/auth/login`, `/auth/refresh|logout`, `GET /appointments` com from/to) já validados AO VIVO em S3/S6/S7b. \*\*Falta só (do usuário):\* abrir em device/simulador e logar contra a API (IP da máquina, não `localhost`).\*

  \- \*Pendências p/ próxima:\* \*\*S9 COMPLETA\*\* (e com isso as 4 superfícies — api/web/mobile-patient/mobile-pro — têm base funcional). Próxima no backlog: \*\*S10 — Exclusão de conta\*\* (requisito de loja Apple 5.1.1 + Google: `DELETE /me` soft-delete+anonimização respeitando guarda legal do prontuário; tela nos 2 apps; página web pública). Herdadas: device-build dos 2 apps (usuário), worklets peer, endpoint de unidades do profissional + filtro por unidade no mobile-pro, nome do paciente na agenda, Unit/Professional listagem na web, cache `rbac:perms`, `start`→`dist/src/main.js`, `docker-compose.yml`, lockout. \*Oportunidade:\* agora que há 2 apps Expo quase idênticos, extrair `@vero/mobile-shared` (api/auth/secure-store/tema) passa a valer o custo.

\- \*\*2026-06-09 · S10a — Exclusão de conta: backend `DELETE /me` (requisito de loja)\*\*  ·  \*S10 DIVIDIDA em S10a (esta) + S10b (telas 2 apps + página web pública)\*

  \- \*O que foi feito:\* `DELETE /me` que o paciente E a equipe usam p/ apagar a PRÓPRIA conta (Apple 5.1.1 + Google, §5). Nova faixa de guard \*\*`@SelfAccount`\*\*: libera qualquer principal autenticado (paciente OU equipe) sem checar permission de papel — mas o handler age só sobre o id do próprio JWT (`@CurrentPrincipal`), nunca um id vindo do cliente (anti-IDOR). `AccountService`: \*\*anonimiza PII + bloqueia login (soft-delete)\*\* — Paciente → name "Paciente removido", cpf/email/birthDate/notes nulos, `passwordHash=null`, `deletedAt`; User → name "Usuário removido", email `removido+{id}@vero.invalid` (mantém único por tenant), `passwordHash` sentinela, `isActive=false`, `deletedAt`. \*\*Guarda anti-lockout:\* recusa (409) excluir o ÚLTIMO gestor ativo do tenant.\* Login/refresh já filtram `deletedAt:null`/`passwordHash`/`isActive` → sessão bloqueada após exclusão. Auditoria \*\*`ACCOUNT_DELETED`\*\* (novo valor no enum `AuditAction`, espelhado em @vero/types; metadata só `{kind}`, sem PII). Agendamentos são mantidos (registro operacional); a guarda legal do prontuário (MedicalRecord, S26) será respeitada quando existir.

  \- \*Arquivos tocados:\* `packages/types/src/rbac.ts` (+`ACCOUNT_DELETED`), `apps/api/prisma/schema.prisma` (+enum) + migration `20260609..._s10_audit_account_deleted` (aditiva, `ALTER TYPE ADD VALUE`), `apps/api/src/common/decorators/self-account.decorator.ts` (novo: `@SelfAccount`+`@CurrentPrincipal`), `apps/api/src/common/guards/permissions.guard.ts` (+faixa self-account), `apps/api/src/auth/{account.service,account.controller}.ts` (novos), `apps/api/src/auth/auth.module.ts` (wiring), teste `apps/api/test/account.service.spec.ts` (5 casos) + `access-control.spec.ts` (+2 da faixa self-account).

  \- \*Decisões:\* `DELETE /me` (não `/account`) num `AccountController` separado do `MeController` (que é `@Patient`) porque o self-delete serve aos DOIS tipos de principal. Ordem das faixas na guard: public → \*\*self-account\*\* → patient → staff. `phone` do paciente vira "" (campo é obrigatório, não pode null). `passwordHash` do User vira sentinela "REMOVED" (nunca verificado — login filtra isActive/deletedAt antes). \*\*Access token (15min) segue válido até expirar\*\* após a exclusão — aceitável (curto); o refresh já é bloqueado. Guarda do último GESTOR evita travar o tenant (decisão de produto além do aceite, mas previne desastre).

  \- \*Verificação:\* `pnpm lint`/`test` (55; +7, 2 skip)/`build`/`format:check`/`audit` \*\*zero vulns\*\* — verdes. \*\*AO VIVO\*\* (PG+Redis efêmeros 5455/6395): \*\*Paciente:\* DELETE /me 200 → re-login 401 → DB anonimizado (name "Paciente removido", cpf/email/senha vazios, soft-deleted) → AuditLog ACCOUNT_DELETED.\* \*\*Equipe:\* revisor é o único GESTOR → 409 (anti-lockout); inserido 2º GESTOR via SQL → DELETE /me 200 → re-login 401 → DB anonimizado+desativado → AuditLog.\* Ambiente efêmero derrubado; `.env`/temporários removidos; árvore limpa.

  \- \*Pendências p/ próxima:\* \*\*S10b\*\* — \*\*tela de exclusão de conta\*\* no mobile-patient e no mobile-pro (confirmar intenção; explicar o que é apagado vs retido por lei; chamar `DELETE /me`; depois `signOut`) + \*\*página web pública de exclusão\*\* (Apple/Google exigem URL pública explicando o processo; pode ser estática no `apps/web`, sem login, linkando o passo a passo). Herdadas: device-build (usuário), prontuário/retenção legal real quando S26 existir, extrair `@vero/mobile-shared`, demais herdadas.

\- \*\*2026-06-09 · S10b — Exclusão de conta: telas nos 2 apps + página web pública (FECHA a S10)\*\*

  \- \*O que foi feito:\* fechou o requisito de loja com a UI nas 3 superfícies de cliente. \*\*mobile-patient\*\* e \*\*mobile-pro\*\*: `lib/api.ts` +`deleteAccount` (DELETE /me); nova tela `app/delete-account.tsx` (explica o que é apagado vs retido por lei, confirma via `Alert` nativo, chama `DELETE /me` com refresh-on-401, depois `signOut`); link "Excluir minha conta" no rodapé da tela inicial (`Link` do expo-router). O app pro trata o \*\*409 do último gestor\*\* com mensagem específica ("transfira a gestão antes"). \*\*apps/web\*\*: página PÚBLICA `app/exclusao-de-conta/page.tsx` (estática, sem login) com o passo a passo + o que é apagado/retido + contato; `middleware.ts` libera a rota (added a `PUBLIC_PATHS`) e ajustado p/ só redirecionar logado→/agenda no `/login` (a página de exclusão fica acessível logado ou não).

  \- \*Arquivos tocados:\* `apps/mobile-patient/{lib/api.ts,app/index.tsx,app/delete-account.tsx}`, `apps/mobile-pro/{lib/api.ts,app/index.tsx,app/delete-account.tsx}`, `apps/web/{app/exclusao-de-conta/page.tsx,middleware.ts}`. \*\*Sem backend novo\*\* (consome o `DELETE /me` da S10a) e sem deps novas.

  \- \*Decisões:\* confirmação via `Alert` destrutivo nativo (padrão das lojas, sem digitar nada — simples). Após sucesso, `signOut()` local (a sessão já foi bloqueada no backend). A página web é o \*\*método in-app documentado\*\* (a exclusão acontece no app; a URL pública explica o processo e dá um e-mail de fallback) — atende Apple 5.1.1 + Google sem precisar de fluxo de exclusão self-service no web (que exigiria login). Link de exclusão no rodapé da home dos apps (visível/acessível, exigência Apple).

  \- \*Verificação:\* `pnpm lint`/`test` (55)/`build`/`format:check`/`audit` \*\*zero vulns\*\* — verdes. Typecheck dos 2 apps OK; \*\*`expo export` empacotou os DOIS apps\*\* (telas de exclusão + Link resolvem no Metro). \*\*AO VIVO (web):\* `/exclusao-de-conta` responde \*\*200 sem login\*\* (com o conteúdo certo) e `/agenda` segue protegida (\*\*307→/login\*\*) — o guard continua deny-by-default.\* O `DELETE /me` em si já foi validado ao vivo na S10a. \*Falta só (do usuário):\* exercer o fluxo de exclusão em device.

  \- \*Pendências p/ próxima:\* \*\*S10 COMPLETA.\*\* Próxima no backlog: \*\*S11 — Confirmação de consulta\*\* (paciente confirma presença pelo app; `ConfirmationEvent` idempotente; status reflete na agenda web). Herdadas: device-build dos apps (usuário), prontuário/retenção legal real (S26), extrair `@vero/mobile-shared` (agora MUITO duplicado entre os 2 apps), endpoint de unidades + filtro no mobile-pro, nome do paciente na agenda, Unit/Professional listagem na web, cache `rbac:perms`, `start` path, docker-compose, lockout.

\- \*\*2026-06-10 · S11 — Confirmação de consulta (FECHA a S11)\*\*

  \- \*O que foi feito:\* o paciente confirma presença pelo app e o status reflete na agenda (que a web já lê desde a S7b). Modelo `ConfirmationEvent` (§6: id, tenantId, appointmentId, patientId, `source`, createdAt — histórico por agendamento; relações p/ Tenant e Appointment com `onDelete: Cascade`; índices em tenantId/appointmentId). Endpoint \*\*`POST /me/appointments/:id/confirm`\*\* no `MeController` (`@Patient`, `@HttpCode(200)`). `MeService.confirmAppointment` é \*\*OWNER-scoped\*\* (anti-IDOR via `TenantScope.ownerWhere(patientId, …, 'patientId')` + `ensureOwned`→403) e \*\*IDEMPOTENTE\*\*: já `CONFIRMED`→no-op (`alreadyConfirmed:true`, sem novo evento); status terminal (`CANCELLED`/`NO_SHOW`/`COMPLETED`)→409; senão, \*\*$transaction\*\* atômica muda o status p/ `CONFIRMED` E cria o `ConfirmationEvent` (`source: PATIENT_APP`). No app do paciente: `lib/api.ts` +`confirmAppointment`; `app/index.tsx` mostra botão \*\*"Confirmar presença"\*\* só em cards `SCHEDULED` (loading por item, refresh-on-401, `Alert` em falha) e atualiza o status localmente ao confirmar.

  \- \*Arquivos tocados:\* `apps/api/prisma/schema.prisma` (+`ConfirmationEvent` +back-relations), `apps/api/prisma/migrations/20260609183405_s11_confirmation_event/` (aditiva), `apps/api/src/me/{me.controller,me.service}.ts`, `apps/api/test/me.service.spec.ts` (4 casos: happy/idempotente/409/403), `apps/mobile-patient/{lib/api.ts,app/index.tsx}`. \*\*Sem dep nova.\*\* (Parte do backend já vinha esboçada não-commitada desta sessão; completei + telas mobile + verificação ao vivo.)

  \- \*Decisões:\* a lógica de confirmação ficou no \*\*`me` module\*\* (que já é `@Patient`/owner-scoped), não num `appointment/confirmation.service.ts` à parte como a spec sugeria — o ponto de entrada é a ação do PACIENTE sobre a PRÓPRIA consulta, então mora junto de `/me/appointments` (reusa `@PatientId`/`TenantScope`, sem duplicar guarda). Botão de confirmar só em `SCHEDULED` (os demais status não fazem sentido p/ o paciente confirmar). Atualização \*otimista-leve\*: aplica o status retornado pelo backend (não chuta), mantendo a UI consistente sem refetch. Idempotência por \*estado\* (status `CONFIRMED`), não por unique constraint — o histórico de eventos é append-only mas a 2ª confirmação não cria evento (no-op antes da transação).

  \- \*Verificação:\* `pnpm lint` (inclui `tsc --noEmit` do mobile)/`test` (57 pass, 2 skip)/`build` (web+api)/`format:check`/`audit` \*\*zero vulns\*\* — verdes. \*\*AO VIVO\*\* (PG+Redis efêmeros 5455/6395 + API real, agendamento `SCHEDULED` semeado via SQL): login do paciente demo → confirm #1 \*\*200 CONFIRMED\*\* (`alreadyConfirmed:false`) → confirm #2 \*\*idempotente\*\* (`alreadyConfirmed:true`) → `GET /me/appointments` mostra \*\*CONFIRMED\*\* → no banco \*\*1 só `ConfirmationEvent`\*\* (source `PATIENT_APP`) apesar das 2 chamadas → \*\*anti-IDOR\*\*: paciente B tentando confirmar a consulta de A → \*\*403\*\*, sem criar evento (count segue 1). Ambiente efêmero derrubado; SQLs/logs temporários removidos; árvore limpa (só os 7 arquivos da sessão). \*Falta só (do usuário):\* exercer o botão em device.

  \- \*Pendências p/ próxima:\* \*\*S11 COMPLETA.\*\* Próxima no backlog: \*\*S12 — WhatsApp (Evolution) — fila de confirmação\*\* (proxy backend anti-SSRF, fila `confirmation-sender` idempotente/backoff/DLQ, webhook que valida assinatura; o `ConfirmationEvent.source` já prevê `WHATSAPP`). Herdadas: device-build dos apps (usuário), prontuário/retenção legal (S26), extrair `@vero/mobile-shared`, endpoint de unidades + filtro no mobile-pro, nome do paciente na agenda, Unit/Professional listagem na web, cache `rbac:perms` no PERMISSION_CHANGED, `start`→`dist/src/main.js`, `docker-compose.yml`, lockout por conta.

\- \*\*2026-06-10 · S12a — WhatsApp (Evolution): infra BullMQ + proxy + fila de envio\*\*  ·  \*S12 DIVIDIDA em S12a (esta) + S12b (webhook de resposta)\*

  \- \*O que foi feito:\* \*\*primeira fila BullMQ do projeto\*\* + proxy backend da Evolution API. `BullModule.forRootAsync` no `app.module` (conexão própria ao Redis via helper `bullConnection(REDIS_URL)` — passa OPÇÕES, não instância ioredis, p/ evitar clash de tipos entre versões de ioredis na árvore; `maxRetriesPerRequest:null` exigido pelo BullMQ; `defaultJobOptions` impõe `attempts:5` + backoff exponencial 30s + `removeOnFail:false`). `WhatsAppService` (proxy §7): `sendText(phone,text)` chama `${EVOLUTION_API_URL}/message/sendText/{instance}` com header `apikey`, número normalizado (só dígitos) no corpo, timeout 10s (AbortController); \*\*fail-closed\*\* se não configurado (ServiceUnavailable); \*\*anti-SSRF\*\* — URL construída SÓ da base configurada (nunca de input), valida que o path não escapa a origem, e em produção recusa base apontando p/ host interno/loopback/`169.254`/RFC1918/IPv6 local. Fila `confirmation-sender`: `ConfirmationSender.scheduleD1(data, startsAt)` agenda o envio p/ \*\*D-1\*\* (delay = startsAt−24h−agora) com \*\*`jobId` determinístico `confirm-{appointmentId}`\*\* (idempotência: 2º enfileiramento do mesmo agendamento é ignorado). `ConfirmationSenderProcessor` (WorkerHost) envia via proxy; `@OnWorkerEvent('failed')` move p/ \*\*DLQ\*\* `confirmation-sender-dlq` só quando esgota as tentativas (mensagem nunca some). Envs Evolution opcionais no schema Zod (API sobe sem elas; falha fechado no uso).

  \- \*Arquivos tocados:\* `apps/api/package.json` (+`@nestjs/bullmq`+`bullmq`), `apps/api/src/config/env.validation.ts` (+EVOLUTION\_API\_URL/KEY/INSTANCE opcionais), `apps/api/src/integrations/whatsapp/{whatsapp.service,confirmation-sender,whatsapp.module}.ts` (novos), `apps/api/src/app.module.ts` (BullModule.forRootAsync + helper `bullConnection` + WhatsAppModule), `apps/api/.env.example` (doc das envs), teste `apps/api/test/whatsapp.spec.ts` (7 casos) + lockfile.

  \- \*Decisões:\* (1) \*\*D-1 via `delay` do próprio job\*\* (não um cron/scheduler) — `scheduleD1` calcula o atraso até 24h antes do início; quem chama (cron diário de varredura de agendamentos, ou a S12b) só precisa invocar. (2) \*\*Idempotência por `jobId`\*\* (não por unique constraint no banco) — o BullMQ deduplica enquanto o job existir; \*\*bug pego ao vivo:\* `jobId` não pode conter `:` (reservado pelo BullMQ) → usei `confirm-{id}`.\* (3) Conexão BullMQ por \*\*opções parseadas\*\* da URL, não instância ioredis (clash `exactOptionalPropertyTypes` entre ioredis 5.10/5.11 na árvore). (4) Envs Evolution \*\*opcionais\*\* (não required) p/ a API subir em deploys sem WhatsApp; o fail-closed acontece no `sendText`. (5) \*\*Sem `MessageLog` no banco ainda\*\* (§6 prevê, fica p/ depois) — o envio não persiste log próprio nesta sessão; a DLQ guarda o que falhou.

  \- \*Verificação:\* `pnpm` lint/test (64; +7, 2 skip)/build/format:check/audit \*\*zero vulns\*\* — verdes. \*\*AO VIVO\*\* (Redis+PG efêmeros 6396/5456, \*\*contexto Nest real\*\* via `createApplicationContext`, Evolution trocada por um stub HTTP local): \*\*(A) idempotência+envio\*\* — 2× `scheduleD1` do mesmo agendamento ⇒ \*\*1 job\*\* na fila e o stub recebeu \*\*1 chamada\*\* (destino `/message/sendText/vero`, header apikey e número `11999998888` corretos). \*\*(B) DLQ\*\* — stub retornando 500 ⇒ \*\*2 tentativas\*\* (attempts) ⇒ \*\*1 job na DLQ\*\* com `{appointmentId, error:"Evolution respondeu HTTP 500"}`. Script de verificação descartável criado, rodado e \*\*removido\*\*; containers efêmeros derrubados; árvore limpa (só os arquivos da S12a + lockfile). \*Sem credenciais Evolution reais (decisão do usuário) — a integração real fica p/ quando houver instância; a mecânica da fila/proxy foi provada com stub.\*

  \- \*Pendências p/ próxima:\* \*\*S12b\*\* — `whatsapp.webhook.controller.ts` (rota pública que \*\*valida assinatura/origem\*\* do webhook da Evolution, anti-replay), mapeia a resposta do paciente (ex.: "SIM"/"1") p/ confirmar a consulta \*\*reusando a lógica idempotente da S11\*\* (gera `ConfirmationEvent` com `source: WHATSAPP` + muda status), idempotente por id de evento. Considerar também o \*\*cron diário\*\* que varre agendamentos de amanhã e chama `scheduleD1` (pode ser S12b ou junto da régua S22). Herdadas: `MessageLog` no banco, device-build, prontuário/retenção (S26), extrair `@vero/mobile-shared`, endpoint de unidades + filtro no mobile-pro, nome do paciente na agenda, Unit/Professional na web, cache `rbac:perms`, `start`→`dist/src/main.js`, `docker-compose.yml`, lockout.

\- \*\*2026-06-10 · S12b — WhatsApp: webhook de resposta → confirma a consulta (FECHA a S12)\*\*

  \- \*O que foi feito:\* o paciente responde a confirmação pelo WhatsApp e a consulta passa a `CONFIRMED`. `WhatsAppWebhookController` em \*\*`POST /integrations/whatsapp/webhook`\*\* — rota `@Public` (sem JWT) protegida por \*\*segredo compartilhado\*\* (`EVOLUTION_WEBHOOK_SECRET` via header `x-webhook-token` ou query `?token=`), comparado em \*\*tempo constante\*\* (`timingSafeEqual` sobre hash sha256); \*\*fail-closed\*\* se o segredo não estiver configurado; responde \*\*200 sempre nos casos de negócio\*\* (evita retempestade de retries da Evolution) e \*\*401\*\* só em credencial inválida. `WhatsAppWebhookService.handleInbound`: \*\*idempotente por id de evento\*\* (Redis `SET NX` em `wa:webhook:{id}` TTL 7d → reprocesso vira `duplicate`, não reconfirma); detecta intenção afirmativa (SIM/S/1/OK/confirmar…); \*\*resolve a consulta pelo TELEFONE do remetente\*\* (nunca um id vindo do payload → sem IDOR), casando por candidatos de DDI (com/sem `55`, últimos 11/10 dígitos, pois o telefone do paciente é guardado sem DDI e o JID vem com `55`); e \*\*reusa `MeService.confirmAppointment(..., 'WHATSAPP')`\*\* — a S11 ganhou um parâmetro `source` (default `PATIENT_APP`), `MeModule` agora exporta `MeService`.

  \- \*Arquivos tocados:\* `apps/api/src/integrations/whatsapp/{whatsapp-webhook.controller,whatsapp-webhook.service}.ts` (novos), `apps/api/src/integrations/whatsapp/whatsapp.module.ts` (+controller/service +import MeModule), `apps/api/src/me/me.service.ts` (param `source` em `confirmAppointment`), `apps/api/src/me/me.module.ts` (exporta `MeService`), `apps/api/src/config/env.validation.ts` (+`EVOLUTION_WEBHOOK_SECRET` opcional), `apps/api/.env.example` (doc), teste `apps/api/test/whatsapp-webhook.service.spec.ts` (6 casos). \*\*Sem migration\*\* (reusa `ConfirmationEvent` da S11) e sem dep nova.

  \- \*Decisões:\* (1) \*\*Validação de origem por segredo compartilhado\*\* (header/query), não assinatura HMAC — a Evolution não assina por padrão; o segredo + comparação em tempo constante atende "valida assinatura/origem" sem acoplar a um formato específico. (2) \*\*Resolução por telefone\*\* (não por id no payload) preserva o anti-IDOR e é o que a Evolution entrega; \*limitação anotada:\* casa a próxima consulta SCHEDULED de QUALQUER tenant cujo paciente tenha aquele telefone — multi-tenant real exigirá mapear `instance`→tenant (cada clínica com sua instância Evolution), futuro. (3) \*\*Reuso da S11\*\* via `source` em `confirmAppointment` (acoplamento WhatsApp→MeService aceito; extrair um `ConfirmationService` compartilhado fica como limpeza futura, já anotada na S11). (4) \*\*200 sempre nos casos de negócio\*\* (confirmed/duplicate/ignored/no-match) p/ a Evolution não reenfileirar; só 401 em segredo inválido.

  \- \*Verificação:\* `pnpm` lint/test (70; +6, 2 skip)/build/format:check/audit \*\*zero vulns\*\* — verdes. \*\*AO VIVO\*\* (PG+Redis efêmeros 5457/6397, \*\*API HTTP real\*\* com `EVOLUTION_WEBHOOK_SECRET`, agendamento SCHEDULED do paciente demo semeado): sem token → \*\*401\*\*; token errado → \*\*401\*\*; token ok + "Sim" do JID `5511999990000@…` → \*\*200 `confirmed`\*\*; \*\*replay do mesmo id de evento\*\* → \*\*200 `duplicate`\*\*; texto não-afirmativo → \*\*200 `ignored`\*\*. No banco: consulta virou \*\*`CONFIRMED`\*\* e há \*\*1 só `ConfirmationEvent` com `source: WHATSAPP`\*\* (replay não duplicou). Ambiente efêmero derrubado; SQLs/logs temporários removidos; árvore limpa (só os arquivos da S12b).

  \- \*Pendências p/ próxima:\* \*\*S12 COMPLETA.\*\* Próxima no backlog: \*\*S13 — Push notifications\*\* (schema +`Notification`+token de device; `integrations/push/push.service.ts` Expo Notifications; fila `push-sender`; registro de token nos 2 apps; opt-out). \*Específico da S12 que ficou p/ depois:\* o \*\*cron diário\*\* que varre agendamentos de amanhã e chama `scheduleD1` (gancho de envio existe, falta o disparador — provável na régua S22 ou num scheduler dedicado); \*\*mapa `instance`→tenant\*\* p/ multi-tenant real do WhatsApp; `MessageLog` no banco. Herdadas: device-build, prontuário/retenção (S26), extrair `@vero/mobile-shared`, endpoint de unidades + filtro no mobile-pro, nome do paciente na agenda, Unit/Professional na web, cache `rbac:perms`, `start`→`dist/src/main.js`, `docker-compose.yml`, lockout.

\- \*\*2026-06-11 · S13a — Push: registro de device token (backend)\*\*  ·  \*S13 DIVIDIDA em S13a (esta) + S13b (motor de push) + S13c (mobile)\*

  \- \*O que foi feito:\* base do push — onde os tokens de device vivem. Modelo `DeviceToken` (dono = `patientId?` OU `userId?` — exatamente um; `token` ExpoPushToken \*\*único globalmente\*\* (1 device = 1 linha); `platform` enum `DevicePlatform` IOS/ANDROID; `optedOut` p/ o opt-out de push da loja §5; `lastSeenAt`; back-relations em Tenant/Patient/User com `onDelete: Cascade`). `DeviceController` em \*\*`/me/devices`\*\* na faixa \*\*`@SelfAccount`\*\* (S10a): QUALQUER principal autenticado (paciente OU equipe) registra o PRÓPRIO device — `@CurrentPrincipal` dá o dono, nunca um id/token de alvo do cliente. Rotas: `POST /me/devices` (registra/atualiza — \*\*upsert por token único\*\*, `optedOut:false`), `POST /me/devices/opt-out` (liga/desliga), `POST /me/devices/unregister` (remove, 204). \*\*Token no corpo\*\* (não na URL) porque contém colchetes. `DeviceService` é \*\*dona-escopado\*\* (anti-IDOR §4): opt-out/unregister usam `updateMany`/`deleteMany` com `where` incluindo `tenantId`+`patientId|userId` → `count===0` ⇒ \*\*Forbidden\*\* (não revela existência cross-owner). DTOs com class-validator (regex do Expo token).

  \- \*Arquivos tocados:\* `apps/api/prisma/schema.prisma` (+`DeviceToken` +enum `DevicePlatform` +back-relations), `apps/api/prisma/migrations/20260611042840_s13_device_token/` (aditiva), `apps/api/src/push/{device.controller,device.service,push.module}.ts` + `push/dto/device.dto.ts` (novos), `apps/api/src/app.module.ts` (+PushModule), teste `apps/api/test/device.service.spec.ts` (6 casos). Sem dep nova.

  \- \*Decisões:\* (1) \*\*`@SelfAccount`\*\* (não `@Patient`) porque OS DOIS apps registram token (paciente + equipe) — reusa a faixa que já libera qualquer principal e age só sobre o próprio id. (2) \*\*Upsert por `token` único\*\* + reassociação do dono no update (device pode trocar de login) — re-registrar \*\*reativa\*\* (`optedOut:false`), comportamento provado ao vivo. (3) Token \*\*no corpo\*\* (não path param) por causa dos colchetes do ExpoPushToken. (4) `Notification` (histórico de envio) \*\*fica p/ a S13b\*\* (motor de push) — a S13a é só o registro. (5) \*\*Sem `@vero/types` p/ o enum\*\* desta vez (DEVICE_PLATFORMS local no DTO) — pequeno, não compartilhado com front ainda; mover p/ types se o mobile precisar na S13c.

  \- \*Verificação:\* `pnpm` lint/test (78; +6, 2 skip)/build/format:check/audit \*\*zero vulns\*\* — verdes. \*\*AO VIVO\*\* (PG+Redis efêmeros 5458/6398, API HTTP real, paciente demo + revisor demo): (1) paciente registra → `optedOut:false`; (2) equipe registra outro token (dono=userId); (3) token inválido → \*\*400\*\*; (4) \*\*anti-IDOR\*\*: equipe tenta opt-out do token do PACIENTE → \*\*403\*\*; (5) paciente opt-out do próprio → `optedOut:true`; (6) \*\*re-registro reativa\*\* → `optedOut:false`; (7) paciente unregister → \*\*204\*\*. No banco: sobrou só o token da equipe (`userId` setado, `patientId` null) — relação de dono correta. Ambiente efêmero derrubado; logs temporários removidos; árvore limpa.

  \- \*Pendências p/ próxima:\* \*\*S13b\*\* — motor de envio: schema `Notification` (histórico/idempotência), `PushService` (proxy Expo `https://exp.host/--/api/v2/push/send`, timeout, trata receipts/erros `DeviceNotRegistered`→limpar token), fila \*\*`push-sender`\*\* (idempotente por notificationId/backoff/DLQ) que carrega os `DeviceToken` do destinatário \*\*respeitando `optedOut`\*\*. Depois \*\*S13c\*\* (mobile: `expo-notifications`, pedir permissão COM contexto, mandar token p/ `POST /me/devices`, toggle de opt-out, nos 2 apps). Herdadas: cron diário da confirmação (S12), `MessageLog`, device-build, prontuário/retenção (S26), extrair `@vero/mobile-shared`, endpoint de unidades + filtro no mobile-pro, nome do paciente na agenda, Unit/Professional na web, cache `rbac:perms`, `start`→`dist/src/main.js`, `docker-compose.yml`, lockout.

\- \*\*2026-06-11 · S13b — Push: motor de envio (Notification + PushService Expo + fila push-sender)\*\*

  \- \*O que foi feito:\* o backend agora ENVIA push. Modelo `Notification` (dono paciente OU equipe; `type`/`title`/`body`/`data` Json; enum `NotificationStatus` PENDING/SENT/FAILED/SKIPPED; `sentAt`/`error`; histórico + idempotência do envio; back-relations Cascade em Tenant/Patient/User). `PushService` (proxy Expo §7): `send(messages)` → `POST https://exp.host/--/api/v2/push/send` (endpoint FIXO → sem SSRF), timeout 10s, `Authorization: Bearer` se `EXPO_ACCESS_TOKEN` presente (opcional), lança em falha de transporte; devolve os tickets. Fila \*\*`push-sender`\*\* (reusa o BullModule.forRoot da S12a — retry/backoff/DLQ): `PushSender.notify({recipient, type, title, body, data})` \*\*persiste a Notification (PENDING) e enfileira\*\* com `jobId push-{notificationId}` (idempotência). `PushSenderProcessor` (WorkerHost): já `SENT` → no-op; carrega os `DeviceToken` do destinatário \*\*com `optedOut:false`\*\* (opt-out respeitado §5); \*\*sem token → `SKIPPED`\*\*; envia via `PushService`; \*\*remove tokens `DeviceNotRegistered`\*\* (limpeza); marca `SENT` (qualquer ticket ok) ou `FAILED`; `@OnWorkerEvent('failed')` ao esgotar tentativas → \*\*DLQ\*\* `push-sender-dlq` + Notification `FAILED`.

  \- \*Arquivos tocados:\* `apps/api/prisma/schema.prisma` (+`Notification` +enum `NotificationStatus` +back-relations), `apps/api/prisma/migrations/20260611134145_s13b_notification/` (aditiva), `apps/api/src/push/{push.service,push-sender}.ts` (novos), `apps/api/src/push/push.module.ts` (+filas +PushService/PushSender/Processor; exporta `PushSender`/`PushService`), `apps/api/src/config/env.validation.ts` (+`EXPO_ACCESS_TOKEN` opcional), `apps/api/.env.example` (doc), teste `apps/api/test/push.spec.ts` (8 casos). Sem dep nova (BullMQ já entrou na S12a).

  \- \*Decisões:\* (1) \*\*`PushSender.notify` cria a Notification E enfileira\*\* (produtor único) — quem dispara lembrete/confirmação só chama `notify(...)`; a Notification é o registro de idempotência + histórico. (2) \*\*Idempotência por `jobId push-{id}` + status `SENT`\*\* (não reenvia o mesmo). (3) \*\*Endpoint Expo fixo\*\* (sem env de URL) — não há input de URL, logo sem SSRF; `EXPO_ACCESS_TOKEN` opcional (Expo aceita envio sem token). (4) \*\*`DeviceNotRegistered`→delete do token\*\* (auto-limpeza de devices mortos, evita lixo e reenvio inútil). (5) Sem etapa de \*\*receipts\*\* (consulta posterior de entrega ao Expo) — fica p/ depois; tratamos só os tickets do envio. (6) \*\*Verificação com `global.fetch` stub in-process\*\* (não criei env de URL só p/ teste) — intercepta `exp.host` no contexto Nest real.

  \- \*Verificação:\* `pnpm` lint/test (84; +8, 2 skip)/build/format:check/audit \*\*zero vulns\*\* — verdes. \*\*AO VIVO\*\* (PG+Redis efêmeros 5459/6399, \*\*contexto Nest real\*\* via `createApplicationContext`, Expo interceptado por `global.fetch`): paciente demo com 3 tokens (ok / dead / opted-out). \*\*(A)\*\* `PushSender.notify` → Notification \*\*`SENT`\*\*; enviados \*\*só `ok-1` + `dead-1`\*\* (o \*\*`optout-1` NÃO recebeu\*\* — opt-out respeitado); \*\*`dead-1` removido\*\* do DB (DeviceNotRegistered); `ok-1`+`optout-1` permanecem. \*\*(B)\*\* `global.fetch` retornando 502 ⇒ após 2 tentativas \*\*1 job na DLQ\*\* + Notification \*\*`FAILED`\*\*. Ambiente efêmero derrubado; script descartável removido; árvore limpa.

  \- \*Pendências p/ próxima:\* \*\*S13c\*\* — mobile: `expo-notifications` nos 2 apps (paciente + pro), \*\*pedir permissão COM contexto\*\* (§5), obter o ExpoPushToken e mandar p/ `POST /me/devices` (reusa o `lib/api`+auth de cada app), \*\*toggle de opt-out\*\* (`POST /me/devices/opt-out`) e `unregister` no logout. \*Nota:\* receber push real exige device físico (do usuário). Herdadas: cron diário da confirmação (S12), `MessageLog`, receipts do Expo, device-build, prontuário/retenção (S26), extrair `@vero/mobile-shared`, endpoint de unidades + filtro no mobile-pro, nome do paciente na agenda, Unit/Professional na web, cache `rbac:perms`, `start`→`dist/src/main.js`, `docker-compose.yml`, lockout.

\- \*\*2026-06-21 · S13c — Push no mobile: permissão + registro de token + opt-out nos 2 apps (FECHA a S13)\*\*

  \- \*O que foi feito:\* completou o aceite da S13 — os DOIS apps registram device de push e respeitam opt-out. `lib/push.ts` (novo em cada app, idêntico salvo a chave do SecureStore `vero_patient_push_token`/`vero_pro_push_token`): `enablePush(accessToken)` checa `Device.isDevice` (emulador→`unsupported`), pede permissão via `Notifications.requestPermissionsAsync` \*\*só a partir da ação do usuário, com contexto\*\* (§5 loja), obtém o `ExpoPushToken` (`getExpoPushTokenAsync` com `projectId` do `expo-constants` quando houver) e registra no backend (`POST /me/devices` da S13a — upsert idempotente), guardando o token no `expo-secure-store`; `setPushOptOut` (liga/desliga via `POST /me/devices/opt-out`), `disablePush` (no logout: `unregister` best-effort + limpa o token local), `hasPushToken` (reflete o estado na UI). `lib/api.ts` (+`registerDevice`/`optOutDevice`/`unregisterDevice` — thin client, token no corpo por causa dos colchetes). `app/index.tsx` (ambos): card \*\*"Lembretes"\*\* com botão \*\*Ativar\*\* (quando sem token) ou \*\*Switch\*\* de opt-out (quando registrado), estados de loading, `Alert` em permissão negada/erro, atualização otimista do opt-out com reversão em falha; o \*\*Sair\*\* agora chama `disablePush` antes do `signOut`. `app.config.ts` (ambos): +plugin `"expo-notifications"`. \*\*Sem backend novo\*\* (consome S13a/S13b).

  \- \*Arquivos tocados:\* `apps/mobile-patient/{lib/push.ts (novo),lib/api.ts,app/index.tsx,app.config.ts,package.json}`, `apps/mobile-pro/{lib/push.ts (novo),lib/api.ts,app/index.tsx,app.config.ts,package.json}`, raiz `package.json` (+override `multer@<2.2.0`→`>=2.2.0`) + `pnpm-lock.yaml`.

  \- \*Decisões:\* (1) `push.ts` \*\*duplicado\*\* nos 2 apps (não extraído p/ `@vero/mobile-shared`) — mantida a postura das S8d/S9b de evitar resolução de pacote do workspace no Metro; a extração segue como pendência (agora MUITO duplicado). (2) Permissão pedida \*\*on-demand\*\* (botão Ativar), nunca no boot — exigência de loja §5. (3) Token no `expo-secure-store` (não AsyncStorage). (4) \*\*opt-out por estado local + backend\*\*; em app restart o `hasPushToken` só sabe que há token (não o estado `optedOut` do servidor) → o Switch assume "recebendo" até a próxima ação — limitação menor anotada (poderia ler o estado do backend num GET futuro). (5) \*\*Segurança (fora do escopo nominal, mas a DoD §9 é gate):\* advisory NOVO de `multer` (HIGH DoS, `<2.2.0`) em dep transitiva do `@nestjs/platform-express` → override p/ `>=2.2.0` (bump minor seguro, resolveu o HIGH + 1 moderate). Restou \*\*1 moderate dev-only\*\* (`js-yaml@3.14.2` via `jest→babel-plugin-istanbul→@istanbuljs/load-nyc-config`; GHSA-h67p-54hq-rp68) — NÃO override-ável com segurança (3.x→4.x quebra a API `safeLoad`), sem input YAML não-confiável, nunca no runtime/bundle → aceito; satisfaz "§9 sem high/critical".\*

  \- \*Verificação:\* `pnpm lint` (inclui `tsc --noEmit` dos 2 apps)/`test` (84 pass, 2 skip)/`build` (web+api)/`format:check` \*\*verdes\*\*; `pnpm audit` \*\*0 high/critical\*\* (1 moderate dev-only aceito). \*\*`expo-doctor` 21/21\*\* nos 2 apps (alinhei patches do SDK 56 que driftaram — `expo install --fix`). \*\*`npx expo export --platform android` empacotou os DOIS apps\*\* (bundle 5.2MB) — `push.ts` + `expo-notifications`/`expo-device` + UI resolvem no Metro. Os endpoints consumidos (`/me/devices*`) já foram validados AO VIVO na S13a. \*\*Falta só (do usuário):\* abrir em device físico, ativar lembretes e receber um push real (push não funciona em emulador; e o envio em si — S13b — foi provado com Expo interceptado).\*

  \- \*Pendências p/ próxima:\* \*\*S13 COMPLETA\*\* (todas as 5 superfícies com push de ponta a ponta no backend; falta só o teste em device do usuário). Próxima no backlog: \*\*S14 — Self check-in\*\* (paciente faz check-in pelo app ao chegar; +`WaitList`; indicador na agenda web em tempo real). Herdadas: device-build dos apps (usuário), \*\*ler estado de opt-out do backend\*\* p/ refletir o Switch no restart, cron diário da confirmação (S12), `MessageLog`, receipts do Expo, prontuário/retenção (S26), \*\*extrair `@vero/mobile-shared`\*\* (api/auth/push/secure-store/tema — agora muito duplicado), filtro por unidade no mobile-pro, nome do paciente na agenda, cache `rbac:perms` no PERMISSION_CHANGED, `start`→`dist/src/main.js`, `docker-compose.yml`, lockout por conta.

\- \*\*2026-06-21 · EXTRA — Seletores de Unidade/Profissional na agenda web\*\*  ·  \*fora do backlog; surgiu na validação ao vivo da S13c (usuário não conseguia agendar sem saber IDs)\*

  \- \*O que foi feito:\* removida a aspereza nº 1 do web — a tela de agenda (S7b) pedia \*\*Unidade (ID)\*\* e \*\*Profissional (ID)\*\* como texto cru. Agora são \*\*dropdowns\*\* carregados da API. Novo módulo `org` no backend: `GET /units` e `GET /professionals` (tenant-scoped via `TenantScope`, gated por `appointment:read` — recepção/dentista também escolhem ao agendar e têm essa permission; retornam só `id`+`name`, sem PII). `@vero/api-client` ganhou `listUnits()`/`listProfessionals()` + tipos `UnitSummary`/`ProfessionalSummary`. No web, `page.tsx` busca units+professionals no mesmo `Promise.all` e o `appointment-form.tsx` troca os 2 inputs de texto por `<select>` (componente `SelectField` reutilizável, reusado também no seletor de paciente). \*Profissional = `User` ativo do tenant (§6: modelo `Professional` dedicado fica p/ depois).\*

  \- \*Arquivos tocados:\* `apps/api/src/org/{org.module,org.controller,org.service}.ts` (novos), `apps/api/src/app.module.ts` (+OrgModule), `packages/api-client/src/index.ts` (tipos + 2 métodos), `apps/web/app/agenda/{page.tsx,appointment-form.tsx}`. Sem migration, sem dep nova.

  \- \*Verificação:\* `pnpm lint` (8/8)/`test` (84 pass, 2 skip)/`build` (4/4)/`format:check` \*\*verdes\*\*. \*\*AO VIVO\*\* (stack local: PG+Redis efêmeros 5455/6395, API 3333, web 3001): `GET /units`→`[{Matriz}]`, `GET /professionals`→`[{Revisor Demo}]`; \*\*Playwright\*\* logou no web e \*\*criou 2 agendamentos pelos dropdowns\*\* (Agendamentos (2), persistidos no banco). \*Aprendizado:\* a `/agenda` tem 2 `button[type=submit]` (Sair=logout + Agendar); um seletor ambíguo no teste clicava Sair e voltava ao login — o app estava correto (create 201). Também esbarrei no rate-limit de login 5/min da S3.

  \- \*Pendência resolvida:\* "endpoint de listagem de Unit/Professional + seletores na agenda" (herdada desde a S7b) — \*\*FECHADA\*\*. Continua aberto: modelos `Professional`/`Room` dedicados; editar/mover/cancelar pela UI.

\- \*\*2026-06-21 · S14a — Self check-in: backend (WaitList + check-in idempotente + fila)\*\*  ·  \*S14 DIVIDIDA em S14a (esta) + S14b (mobile + indicador web)\*

  \- \*O que foi feito:\* base do self check-in. Modelo `WaitList` (§6: id, tenantId, `appointmentId @unique`, patientId, unitId, `status` enum `WaitListStatus` WAITING/CALLED/DONE, `arrivedAt`; relações Cascade p/ Tenant e Appointment — 1:1 com Appointment via unique) + migration aditiva. \*\*Check-in no `me` module\*\* (mesmo padrão da S11 — ação do paciente sobre a PRÓPRIA consulta): `MeService.checkIn` é OWNER-scoped (anti-IDOR via `TenantScope.ownerWhere` + `ensureOwned`→403) e \*\*IDEMPOTENTE\*\* — já `CHECKED_IN` → no-op (`alreadyCheckedIn:true`, sem tocar a fila); status não-checkável (≠ SCHEDULED/CONFIRMED) → 409; senão `$transaction` muda o agendamento p/ `CHECKED_IN` E faz \*\*upsert\*\* da WaitList (WAITING) por `appointmentId` (blinda corrida, nunca duplica). Endpoint `POST /me/appointments/:id/checkin` (`@Patient`, `@HttpCode(200)`). \*\*Leitura p/ a recepção:\* `AppointmentService.listWaitList` (tenant-scoped, status WAITING, opcional por unidade) + `GET /waitlist` (`appointment:read`) — a web vai consumir na S14b.\* \*Janela/raio de check-in (§S14 "opcional") não imposto por ora — anotado.\*

  \- \*Arquivos tocados:\* `apps/api/prisma/schema.prisma` (+`WaitList` +enum +back-relations em Tenant/Appointment), `apps/api/prisma/migrations/*_s14_waitlist/` (aditiva), `apps/api/src/me/{me.service,me.controller}.ts` (checkIn + rota), `apps/api/src/appointment/{appointment.service,appointment.controller}.ts` (listWaitList + GET /waitlist), teste `apps/api/test/me.service.spec.ts` (+4 casos do check-in). Sem dep nova.

  \- \*Decisões:\* check-in no `me` module (não num `appointment/checkin.service.ts` à parte como a spec sugeria) — o ponto de entrada é a ação do PACIENTE sobre a PRÓPRIA consulta, então mora junto de `/me/*` reusando `@Patient`/`@PatientId`/`TenantScope` (mesma escolha registrada na S11). Idempotência por \*\*estado\*\* (status CHECKED_IN) + \*\*`@unique` em appointmentId\*\* (upsert) — dupla barreira. WaitList 1:1 com Appointment (uma fila por consulta). `GET /waitlist` retorna campos crus (patientId/arrivedAt/…); a web mapeia patientId→nome como já faz na agenda (S7b).

  \- \*Verificação:\* `pnpm lint` (8/8)/`test` (88 pass, 2 skip; +4)/`build`/`format:check`/`audit` (0 high/critical; 1 moderate dev-only) \*\*verdes\*\*. \*\*AO VIVO\*\* (stack local PG 5455/Redis 6395, API 3333): check-in de consulta SCHEDULED → \*\*200 CHECKED_IN\*\*; 2ª vez → \*\*idempotente\*\* (`alreadyCheckedIn:true`); `GET /waitlist` (recepção) → \*\*1 entrada WAITING\*\* (não duplicou); staff na rota de paciente → \*\*403\*\* (faixa @Patient). \*Lembrete:\* parar a API antes de `prisma generate` (a DLL do query engine fica travada pelo processo node — deu EPERM).

  \- \*Pendências p/ próxima:\* \*\*S14b\*\* — mobile-patient: botão \*\*"Fazer check-in"\*\* nos cards de consulta (chama `POST /me/appointments/:id/checkin`, reusa o `lib/api`+refresh-on-401, idealmente só quando `CONFIRMED`/perto do horário); web: \*\*indicador de fila\*\* na agenda (consome `GET /waitlist` via api-client `listWaitList()`, mostra quem chegou em tempo real). Herdadas: device-build, janela/raio de check-in opcional, extrair `@vero/mobile-shared`, modelos Professional/Room, editar/mover/cancelar na UI, `docker-compose.yml`, cache `rbac:perms`, `start`→`dist/src/main.js`, lockout.

\- \*\*2026-06-21 · S14b — Self check-in: botão no app + indicador de fila na web (FECHA a S14)\*\*

  \- \*O que foi feito:\* completou o aceite da S14 — o paciente faz check-in pelo app e a recepção vê na agenda web. \*\*mobile-patient\*\*: `lib/api.ts` +`checkIn` (+tipo `CheckInResult`); `app/index.tsx` ganhou o handler `checkIn` (espelha o `confirm` da S11 — atualização otimista do status + refresh-on-401 + `Alert` em falha) e o botão \*\*"Fazer check-in"\*\* (outline) nos cards `SCHEDULED`/`CONFIRMED` (o backend aceita ambos; no `SCHEDULED` aparece junto do "Confirmar presença", no `CONFIRMED` sozinho). \*\*web\*\*: `@vero/api-client` +`listWaitList()` (+tipo `WaitListEntry`); `app/agenda/page.tsx` busca a fila no `Promise.all` e renderiza a seção \*\*"Na recepção (N)"\*\* (cartão verde com nome do paciente — mapeado de `patientId` como o resto da agenda — e "chegou às HH:MM"); só aparece quando há alguém na fila. Sem backend novo (consome S14a).

  \- \*Arquivos tocados:\* `apps/mobile-patient/{lib/api.ts,app/index.tsx}`, `packages/api-client/src/index.ts` (tipo + método), `apps/web/app/agenda/page.tsx`. Sem dep nova, sem migration.

  \- \*Decisões:\* botão de check-in em \*\*SCHEDULED e CONFIRMED\*\* (não só CONFIRMED) — o backend permite os dois (CHECKABLE), então um paciente que chega sem ter confirmado também consegue; estilo \*outline\* p/ distinguir do "Confirmar presença" (sólido). Indicador da fila \*\*condicional\*\* (`waitList.length > 0`) p/ não poluir a agenda vazia. Web mapeia `patientId`→nome reusando o `patientName` já montado (S7b) — sem endpoint mais rico.

  \- \*Verificação:\* `pnpm lint` (8/8, inclui `tsc --noEmit` do mobile)/`test` (88 pass, 2 skip)/`format:check`/`audit` (0 high/critical) \*\*verdes\*\*. \*\*`npx expo export --platform android`\*\* empacotou o paciente (check-in resolve no Metro). \*\*AO VIVO (web, Playwright):\* após check-in (S14a) a agenda mostra \*\*"Na recepção (1)" — Paciente Demo chegou às 15:01\*\* (cartão verde) e o agendamento aparece com status \*\*"Check-in"\*\*.\* \*Falta só (do usuário):\* tocar o botão em device.

  \- \*Pendências p/ próxima:\* \*\*S14 COMPLETA.\*\* Próxima no backlog: \*\*S15 — Agendamento online\*\* (paciente marca sozinho dentro das regras; endpoint público de slots com rate limit forte; tela pública de booking + fluxo no app). Herdadas: device-build dos apps (usuário), janela/raio de check-in opcional, ler opt-out do backend no restart, extrair `@vero/mobile-shared` (api/auth/push muito duplicado), modelos `Professional`/`Room` dedicados, editar/mover/cancelar pela UI, filtro por unidade no mobile-pro, cron diário da confirmação (S12), `MessageLog`, receipts do Expo, cache `rbac:perms` no PERMISSION_CHANGED, `start`→`dist/src/main.js`, `docker-compose.yml`, lockout.

\- \*\*2026-06-21 · S15a — Agendamento online: backend (engine de slots + endpoints públicos)\*\*  ·  \*S15 DIVIDIDA em S15a (esta) + S15b (web público) + S15c (app)\*

  \- \*O que foi feito:\* núcleo do agendamento online. \*\*Engine de slots\*\* puro/testável em `agenda.util.ts`: `wallTimeToUtc` (inverso do `localDayAndMinute` — converte wall-clock local da unidade → instante UTC via `tzOffsetMinutes`/Intl, sem dep; ex.: 14:00 SP → 17:00Z) e `computeOpenSlots` (fatia janelas de `Availability` em blocos de 30min, descarta os anteriores a `now+antecedência` e os que colidem com agendamentos existentes). \*\*Módulo `public`\*\* (rotas \*\*`@Public`\*\* — sem JWT; tenant resolvido pelo `slug` na URL): `GET /public/clinics/:slug/slots?unitId&professionalId&date` (só SLOTS LIVRES — nunca vaza a agenda interna) e `POST /public/clinics/:slug/book` (cria/reusa o paciente como \*\*lead `SITE`\*\* pelo telefone e cria a consulta). \*\*Rate limit FORTE\*\* via `@Throttle` sobre o global: slots 20/min, book 5/min. `PublicService.book` \*\*re-valida no servidor\*\* (o slot tem que estar entre os livres do dia: disponibilidade + antecedência + sem conflito) e \*\*reusa `AppointmentService.create`\*\* (re-checa conflito → 409, cobre corrida entre listar e reservar). Antecedência mínima 1h, slot 30min (constantes).

  \- \*Arquivos tocados:\* `apps/api/src/appointment/agenda.util.ts` (+`tzOffsetMinutes`/`wallTimeToUtc`/`computeOpenSlots`), `apps/api/src/public/{public.module,public.controller,public.service}.ts` + `public/dto/{slots-query,book}.dto.ts` (novos), `apps/api/src/app.module.ts` (+PublicModule), teste `apps/api/test/slots.spec.ts` (5 casos do engine). Sem migration (reusa Availability/Appointment/Patient), sem dep nova. \*Reuso:\* validators `@IsBrazilianPhone`/`@IsCpf` do módulo patient; `FREEING_STATUSES`/`normalizeDigits` de @vero/types.

  \- \*Decisões:\* engine \*\*puro\*\* em util (testável sem DB; o service só carrega janelas+agendamentos e chama). Tenant por \*\*slug na URL\*\* (rota pública, white-label-friendly); unidade/profissional de outro tenant → lista vazia (não vaza existência). Booking reusa o `AppointmentService` (não duplica conflito/disponibilidade) — dupla barreira (slot livre + assertNoConflict). Lead por \*\*telefone\*\* (reusa paciente existente no tenant; senão cria `SITE`). Conversão de fuso por Intl (sem luxon) — OK p/ SP (sem DST); anotado p/ fusos com horário de verão.

  \- \*Verificação:\* `pnpm lint` (8/8)/`test` (93 pass, 2 skip; +5)/`build`/`format:check`/`audit` (0 high/critical; 1 moderate dev-only) \*\*verdes\*\*. \*\*AO VIVO\*\* (stack local; availability 09–11 criada p/ o profissional demo num domingo): `GET /slots` \*\*sem login\*\* → 4 slots (12:00–14:00Z); `POST /book` → \*\*201\*\* (lead "Joana Online"/SITE + consulta SCHEDULED); \*\*re-book do mesmo slot → 409\*\*; `GET /slots` de novo → 13:00 \*\*sumiu\*\*; tenant inexistente → \*\*404\*\*; telefone inválido → \*\*400\*\*; slot fora da janela → \*\*409\*\*.

  \- \*Pendências p/ próxima:\* \*\*S15b\*\* — tela PÚBLICA de booking no web (sem login: escolher unidade/profissional/data → `GET /slots` → escolher horário → nome+telefone → `POST /book`); precisa de um endpoint público p/ listar unidades/profissionais da clínica (hoje `GET /units`/`/professionals` exigem `appointment:read` — criar variante pública por slug, ou embutir no fluxo). \*\*S15c\*\* — fluxo no app do paciente logado (reusa `/public/.../book` ou um `/me/book`). Herdadas: as de sempre.

\- \*\*2026-06-21 · S15b — Agendamento online: tela pública de booking no web\*\*

  \- \*O que foi feito:\* página PÚBLICA de booking (sem login). \*\*Backend (pequenas adições):\* endpoints públicos `GET /public/clinics/:slug/units` e `/professionals` (rate limit 20/min) reusando `OrgService` (OrgModule passou a exportá-lo; PublicModule o importa) — assim a tela pública lista a clínica sem exigir `appointment:read`.\* \*\*api-client:\* +`listClinicUnits`/`listClinicProfessionals`/`listClinicSlots`/`bookClinic` (sem token) + tipos `OpenSlot`/`PublicBookInput`/`PublicBookResult`.\* \*\*Web:\* rota `app/agendar/[slug]/` liberada no `middleware` (PUBLIC_PATHS +`/agendar`). `page.tsx` (Server Component) busca units+professionals server-side (BFF, sem expor URL da API ao browser) e em clínica inexistente → `notFound()` (404). `actions.ts` (Server Actions `getSlotsAction`/`bookAction` com cliente público sem token; traduz 409/400/404 em msg segura). `booking-form.tsx` (client): máquina de estados — escolher unidade/profissional/data → "Ver horários" (chama getSlotsAction) → grade de slots clicáveis → nome+telefone → "Confirmar" (bookAction) → tela de sucesso. `useTransition` p/ os estados de carregando.\*

  \- \*Arquivos tocados:\* `apps/api/src/org/org.module.ts` (exporta OrgService), `apps/api/src/public/{public.module,public.service,public.controller}.ts` (+listagens), `packages/api-client/src/index.ts` (4 métodos públicos + tipos), `apps/web/middleware.ts` (+/agendar público), `apps/web/app/agendar/[slug]/{page.tsx,actions.ts,booking-form.tsx}` (novos). Sem migration, sem dep nova.

  \- \*Decisões:\* booking público via \*\*BFF\*\* (Server Actions chamam a API server-side; URL da API não vaza ao browser, §2/§5) — cliente público é `createApiClient({baseUrl})` SEM token. Slot exibido em hora local (`toLocaleTimeString` pt-BR — para clínica/usuário BR no mesmo fuso). Listagem pública de unidade/profissional reusa `OrgService` (nomes de profissionais são info pública de um site de clínica). Página em `/agendar/[slug]` (white-label por slug).

  \- \*Verificação:\* `pnpm lint` (8/8)/`test` (93 pass)/`format:check`/`audit` (0 high/critical) \*\*verdes\*\*. \*\*AO VIVO (web, Playwright):\* `/agendar/vero-demo` carrega ("Agendar consulta"); escolher Matriz/Revisor Demo + data → grade de slots (09:00/09:30/10:30 — o 10:00 já ocupado não aparece) → escolher 09:00 + nome/telefone → \*\*"Agendamento confirmado! Até breve."\*\*; no banco: lead \*\*"Carlos Booking Web" (SITE)\*\* + consulta 12:00Z SCHEDULED.\* \*Incidente:\* cache `.next` corrompeu (`Cannot find module vendor-chunks/@swc+helpers`) após adicionar a rota via hot-reload — resolvido com `rm -rf apps/web/.next` + restart.

  \- \*Pendências p/ próxima:\* \*\*S15c\*\* — fluxo de agendamento online no \*\*app do paciente logado\*\* (escolher profissional/data → slots → marcar). Pode reusar `/public/.../slots` p/ listar e, para reservar como paciente conhecido, um `POST /me/book` (cria a consulta com o `patientId` do JWT, sem virar lead) — ou reusar o book público. Herdadas: as de sempre.

\- \*\*2026-06-21 · S15c — Agendamento online: fluxo no app do paciente logado (FECHA a S15)\*\*

  \- \*O que foi feito:\* o paciente logado agenda pelo app, com a PRÓPRIA identidade (não vira lead). \*\*Refactor:\* extraí `SlotService` (`appointment/slot.service.ts`) como FONTE ÚNICA do cálculo de slots — `openSlots(tenantId,unitId,professionalId,dateYmd)` + `dateYmdInUnitTz`; o `PublicService` foi reescrito p/ usá-lo (removida a duplicação de slotsForDate/civilDate); `AppointmentModule` passa a prover/exportar `SlotService`.\* \*\*`/me` (app):\* `MeService` ganhou `mySlots`/`book`/`myUnits`/`myProfessionals` (injeta SlotService + AppointmentService + OrgService); rotas `GET /me/units`, `GET /me/professionals`, `GET /me/slots`, `POST /me/book` (`@Patient` — token de equipe negado 403). `book` re-valida o slot (disponibilidade+antecedência+conflito) e reusa `AppointmentService.create` com o `patientId` do JWT (conflito race-safe → 409). DTOs `MeBookDto`/`MeSlotsQueryDto`.\* \*\*Mobile (paciente):\* `lib/api.ts` +`meUnits`/`meProfessionals`/`meSlots`/`meBook` (+tipos `NamedRef`/`OpenSlot`); nova tela `app/book.tsx` (escolher profissional/unidade via chips + data → "Ver horários" → grade de slots → "Confirmar" → Alert de sucesso → volta p/ home; refresh-on-401); botão "+ Agendar consulta" na home (`Link href="/book"`).\*

  \- \*Arquivos tocados:\* `apps/api/src/appointment/{slot.service.ts (novo),appointment.module.ts}`, `apps/api/src/public/public.service.ts` (refactor → SlotService), `apps/api/src/me/{me.module,me.service,me.controller}.ts` + `me/dto/{book,slots-query}.dto.ts` (novos), `apps/api/test/me.service.spec.ts` (mocks p/ novos ctor args), `apps/mobile-patient/{lib/api.ts,app/book.tsx (novo),app/index.tsx}`. Sem migration, sem dep nova.

  \- \*Decisões:\* `SlotService` compartilhado (público + `/me` + futuros) — não duplica regra de slots. `/me/units`/`/me/professionals` (tenant do JWT) em vez de exigir slug no app (reusa OrgService). `POST /me/book` NÃO cria lead (usa o `patientId` autenticado) — diferença-chave do book público. Tela mobile com \*\*chips\*\* p/ selecionar (RN não tem `<select>` nativo) e \*\*data por texto AAAA-MM-DD\*\* (sem dep de date-picker, §8 simplicidade) — date-picker nativo fica como melhoria.

  \- \*Verificação:\* `pnpm lint` (8/8, inclui `tsc` do mobile)/`test` (93 pass, 2 skip)/`build`/`format:check`/`audit` (0 high/critical; 1 moderate dev-only) \*\*verdes\*\*. \*\*`npx expo export`\*\* empacotou o paciente (tela `book` + novos imports resolvem no Metro). \*\*AO VIVO\*\* (stack local): `GET /me/units`/`/me/professionals` → Matriz/Revisor Demo; `GET /me/slots` → horários livres; `POST /me/book` → \*\*200\*\* (consulta com o patientId do paciente demo, SEM lead); re-book mesmo slot → \*\*409\*\*; token de equipe em `/me/book` → \*\*403\*\*. \*Falta só (do usuário):\* exercer a tela em device.

  \- \*Pendências p/ próxima:\* \*\*S15 COMPLETA\*\* (online booking nas 3 superfícies: público web, app do paciente, backend). Próxima no backlog: \*\*FASE 2 — S16 (Procedure/PriceTable/Plan)\*\* — começa o motor comercial/financeiro. Herdadas: date-picker nativo no app de booking, janela/raio de check-in opcional, device-build, extrair `@vero/mobile-shared`, modelos `Professional`/`Room`, editar/mover/cancelar na UI, cron diário da confirmação (S12), `MessageLog`, cache `rbac:perms`, `start`→`dist/src/main.js`, `docker-compose.yml`, lockout.

\- \*\*2026-06-21 · S16a — Catálogo comercial: backend (Procedure/Plan/PriceTable + permissions)\*\*  ·  \*INÍCIO DA FASE 2; S16 DIVIDIDA em S16a (esta) + S16b (tela web)\*

  \- \*O que foi feito:\* fundação do catálogo comercial (§6). \*\*Permissions novas\*\* em @vero/types: `catalog:read`/`catalog:write` (GESTOR herda via ALL; concedidas a DENTISTA/RECEPCAO=read, FINANCEIRO=read+write) — \*\*seed agora cria 20 permissions\*\* (era 18). Schema: \*\*`Procedure`\*\* (name, code?, durationMinutes?, active, soft-delete), \*\*`Plan`\*\* (convênio; "Particular" é um Plan; name, active, soft-delete), \*\*`PriceTable`\*\* (preço POR convênio: `procedureId`×`planId`×`priceCents`, `@@unique([tenantId,procedureId,planId])`) — \*\*dinheiro em centavos `Int`\*\* (evita float). Módulo `catalog`: `CatalogService` (CRUD dos 3, TODO tenant-scoped via `TenantScope`; `ensureProcedure/Plan/Price`→403 anti-IDOR; `createPrice` valida que procedimento E convênio são do mesmo tenant e mapeia P2002→400 amigável; Procedure/Plan soft-delete, Price hard-delete) + `CatalogController` (12 rotas REST: procedures/plans/prices × CRUD, gated `catalog:read|write`).

  \- \*Arquivos tocados:\* `packages/types/src/rbac.ts` (+2 permissions +grants), `apps/api/prisma/schema.prisma` (+3 modelos +back-relations no Tenant), `apps/api/prisma/migrations/*_s16_catalog/` (aditiva), `apps/api/src/catalog/{catalog.module,catalog.service,catalog.controller}.ts` + `catalog/dto/catalog.dto.ts` (novos), `apps/api/src/app.module.ts` (+CatalogModule), teste `apps/api/test/catalog.service.spec.ts` (4 casos). Sem dep nova.

  \- \*Decisões:\* `priceCents Int` (não Decimal) — dinheiro inteiro, simples e exato; o front divide por 100. `PriceTable` = uma linha por (procedimento × convênio) com unique — interpretação prática de "preço por convênio" do §6 (sem modelar tabelas nomeadas ainda). DTOs agrupados num só `catalog.dto.ts` (6 classes) p/ não explodir arquivos. Procedure/Plan com soft-delete (`deletedAt`); PriceTable hard-delete (entrada de preço, sem histórico por ora). \*\*Re-seed + flush do cache `rbac:perms` no Redis\*\* foi necessário p/ o GESTOR enxergar as novas permissions ao vivo (a invalidação automática no PERMISSION_CHANGED segue pendente).

  \- \*Verificação:\* `pnpm lint` (8/8)/`test` (97 pass, 2 skip; +4)/`build`/`format:check`/`audit` (0 high/critical; 1 moderate dev-only) \*\*verdes\*\*. \*\*AO VIVO\*\* (stack local, re-seed 20 perms + cache limpo): login GESTOR → criar convênio "Particular" + procedimento "Limpeza" (30min) + \*\*preço Limpeza×Particular = R$120,00\*\* (`priceCents:12000`); preço \*\*duplicado → 400\*\*; `GET /prices` devolve com nomes ("Limpeza / Particular = 120.00"); \*\*token de paciente em /procedures → 403\*\* (rota de equipe). Anti-IDOR coberto por unit test.

  \- \*Pendências p/ próxima:\* \*\*S16b\*\* — tela web de cadastro do catálogo (procedimentos, convênios, preços por convênio) consumindo as 12 rotas; api-client +métodos. Considerar gatear a UI por `catalog:write`. Herdadas: as de sempre + invalidar cache `rbac:perms` no PERMISSION_CHANGED (agora mais relevante com novas permissions).

\- \*\*2026-06-21 · S16b — Catálogo: tela web de cadastro (FECHA a S16)\*\*

  \- \*O que foi feito:\* tela de gestão do catálogo no web (`/catalogo`, protegida pelo middleware). \*\*api-client:\* +`listProcedures`/`createProcedure`/`listPlans`/`createPlan`/`listPrices`/`createPrice` + tipos `ProcedureItem`/`PlanItem`/`PriceItem`.\* `page.tsx` (Server Component, BFF) busca os 3 catálogos em paralelo (fail-soft) e renderiza 3 seções: \*\*Procedimentos\*\* e \*\*Convênios\*\* lado a lado (lista + form), \*\*Preços por convênio\*\* embaixo (form com selects de procedimento/convênio + preço em R$, lista com valor formatado `Intl` BRL). `actions.ts` (Server Actions `createProcedure/Plan/Price` + `revalidatePath`; \*\*preço digitado em reais → convertido p/ centavos\*\* `Math.round(reais*100)`; traduz 400/403 em msg segura). `catalog-forms.tsx` (client: 3 forms com `useActionState`+`useFormStatus`, feedback "Salvo."/erro).

  \- \*Arquivos tocados:\* `packages/api-client/src/index.ts` (6 métodos + 3 tipos), `apps/web/app/catalogo/{page.tsx,actions.ts,catalog-forms.tsx}` (novos). Sem backend novo (consome S16a), sem migration, sem dep nova.

  \- \*Decisões:\* preço em \*\*reais no input → centavos no backend\*\* (UX em R$, storage em Int). UI consome as rotas gated por `catalog:read|write` (o backend é a barreira; a UI não re-checa permission — o GESTOR/FINANCEIRO veem tudo, demais papéis tomariam 403 do backend, fail-soft). Listas simples (criar + listar); editar/desativar/remover pela UI fica como melhoria (backend já expõe PATCH/DELETE). Sem link de navegação entre /agenda e /catalogo ainda (navegação/layout comum é melhoria futura).

  \- \*Verificação:\* `pnpm lint` (8/8)/`test` (97 pass)/`format:check`/`audit` (0 high/critical; 1 moderate dev-only) \*\*verdes\*\*. \*\*AO VIVO (web, Playwright):\* login GESTOR → `/catalogo` mostra \*\*Procedimentos (1)/Convênios (1)/Preços (1)\*\* com Limpeza/Particular/\*\*R$ 120,00\*\* (dados da S16a); criar "Clareamento" pelo form → aparece na lista ("Procedimentos (2)").\* \*Incidente recorrente:\* nova rota exigiu `rm -rf apps/web/.next` + restart (cache de dev quebra ao adicionar rota); rate limit de login 5/min também esbarrado.

  \- \*Pendências p/ próxima:\* \*\*S16 COMPLETA.\*\* Próxima no backlog: \*\*S17 — Orçamento (Budget)\*\* (montar/acompanhar orçamentos; `Budget`+`BudgetItem`+status; total calculado no backend; depende de S16). Herdadas: editar/remover catálogo pela UI, navegação comum web (menu /agenda↔/catalogo), gatear UI por permission, invalidar cache `rbac:perms` no PERMISSION_CHANGED, date-picker no app de booking, extrair `@vero/mobile-shared`, modelos Professional/Room, `docker-compose.yml`, `start`→`dist/src/main.js`, lockout.

\- \*\*2026-06-21 · S17a — Orçamento: backend (Budget/BudgetItem + total server-side + status)\*\*  ·  \*S17 DIVIDIDA em S17a (esta) + S17b (tela web)\*

  \- \*O que foi feito:\* núcleo de orçamentos. Schema: \*\*`Budget`\*\* (patientId, planId? = convênio, `status` enum `BudgetStatus` OPEN/APPROVED/REJECTED, `totalCents` Int, `decidedAt` p/ relatório de conversão, soft-delete) + \*\*`BudgetItem`\*\* (procedureId + `description`/`unitPriceCents` \*\*SNAPSHOT\*\* do momento + quantity) + migration aditiva. Módulo `budget`: `BudgetService` tenant-scoped (anti-IDOR `ensureOwned`→403) — \*\*`totalCents` SEMPRE recalculado no backend\*\* (`recomputeTotal` soma `quantity*unitPriceCents` dentro de `$transaction` ao add/remove item; o front NUNCA envia total); preço do item vem do \*\*catálogo\*\* (`PriceTable` do convênio do orçamento) ou explícito no DTO (senão 400); só orçamento \*\*OPEN\*\* aceita alteração (add/remove item em decidido → 409); `setStatus` OPEN→APPROVED/REJECTED grava `decidedAt` (re-decidir → 409). `BudgetController` (7 rotas: CRUD + items + status, gated `budget:read|write` — já existiam desde S16). \*Permissions `budget:*` já existiam → sem mudança em @vero/types/seed.\*

  \- \*Arquivos tocados:\* `apps/api/prisma/schema.prisma` (+Budget +BudgetItem +enum +back-relations Tenant/Patient/Plan/Procedure), `apps/api/prisma/migrations/*_s17_budget/` (aditiva), `apps/api/src/budget/{budget.module,budget.service,budget.controller}.ts` + `budget/dto/budget.dto.ts` (novos), `apps/api/src/app.module.ts` (+BudgetModule), teste `apps/api/test/budget.service.spec.ts` (5 casos). Sem dep nova.

  \- \*Decisões:\* total \*\*recalculado em `$transaction`\*\* a cada mudança de item (não confia em soma do front, §4) — `aggregate` do Prisma não multiplica colunas, então somo `quantity*unitPriceCents` em JS dentro da transação. Item guarda \*\*snapshot\*\* (description+preço) → orçamento imutável se o catálogo mudar depois. Preço do item: catálogo (PriceTable do convênio) com fallback p/ valor explícito (avulso). Imutabilidade por estado: só OPEN edita. `decidedAt` é o gancho de "conversão registrada p/ relatório" (S43 fará o relatório).

  \- \*Verificação:\* `pnpm lint` (8/8)/`test` (102 pass, 2 skip; +5)/`build`/`format:check`/`audit` (0 high/critical; 1 moderate dev-only) \*\*verdes\*\*. \*\*AO VIVO\*\* (stack local, catálogo da S16): criar orçamento p/ paciente demo (convênio Particular) → add Limpeza×2 → \*\*total 24000 (preço 12000 puxado do catálogo)\*\* → add item avulso 5000 → \*\*total 29000\*\* (recalculado) → aprovar → \*\*APPROVED + decidedAt set\*\* → add item em aprovado → \*\*409\*\*. Anti-IDOR/guards cobertos por unit test.

  \- \*Pendências p/ próxima:\* \*\*S17b\*\* — tela web de orçamento (criar p/ paciente, adicionar itens do catálogo, ver total, mudar status); api-client +métodos; precisa de seletor de paciente (já há `listPatients`) + procedimentos (`listProcedures` da S16). Herdadas: as de sempre.

\- \*\*2026-06-21 · S17b — Orçamento: tela web (FECHA a S17)\*\*

  \- \*O que foi feito:\* UI de orçamentos no web. \*\*api-client:\* +`listBudgets`/`createBudget`/`getBudget`/`addBudgetItem`/`removeBudgetItem`/`setBudgetStatus` + tipos `BudgetSummary`/`BudgetItemDetail`/`BudgetDetail`.\* \*\*Web (2 telas):\* `/orcamentos` (lista: paciente/total/status + form de criação com seletor de paciente e convênio → `redirect` p/ o detalhe ao criar) e `/orcamentos/[id]` (detalhe: cabeçalho com total grande, lista de itens com subtotal e botão remover, form de adicionar item — procedimento + qtd + preço opcional —, botões Aprovar/Recusar). Só mostra edição/ações se status OPEN; decidido mostra aviso de imutabilidade. Server Actions (`createBudgetAction` com `redirect`; `addItemAction` via `useActionState` com `.bind(budgetId)`; `removeItemAction`/`setStatusAction` via `useTransition` fail-soft).\*

  \- \*Arquivos tocados:\* `packages/api-client/src/index.ts` (6 métodos + 3 tipos), `apps/web/app/orcamentos/{page.tsx,actions.ts,create-form.tsx}` + `orcamentos/[id]/{page.tsx,budget-detail.tsx}` (novos). Sem backend novo (consome S17a), sem migration.

  \- \*Decisões:\* total e subtotais SEMPRE vêm do backend; o front só exibe (e mostra `qty*unitPrice` por item p/ leitura). Preço do item em R$→centavos (como no catálogo). Edição condicionada a OPEN (espelha a regra do backend). `createBudget` redireciona ao detalhe (fluxo natural: criar → adicionar itens). Sem seletor de "preço do catálogo vs avulso" explícito — se o convênio tem preço cadastrado e o campo preço fica vazio, o backend usa o do catálogo; senão exige o valor.

  \- \*Verificação:\* `pnpm lint` (8/8)/`test` (102 pass)/`format:check`/`audit` (0 high/critical; 1 moderate dev-only) \*\*verdes\*\*. \*\*AO VIVO (web, Playwright):\* login GESTOR → `/orcamentos` → criar orçamento p/ paciente → detalhe → adicionar \*\*2× Clareamento R$80 → total R$ 160,00\*\* (calculado no backend) → \*\*Aprovar → "Status: Aprovado · não pode mais ser alterado"\*\* (form some).\* \*Incidentes recorrentes:\* `rm -rf apps/web/.next` ao adicionar rotas; rate limit de login 5/min.

  \- \*Pendências p/ próxima:\* \*\*S17 COMPLETA.\*\* Próxima no backlog: \*\*S18 — Contrato + Termos + assinatura eletrônica\*\* (fechar orçamento aprovado com documento assinado ICP; `Contract`+`Consent`; `integrations/esign`; evidência IP+timestamp+hash; depende de S17). Herdadas: navegação comum web (menu agenda/catalogo/orcamentos), editar/remover catálogo pela UI, gatear UI por permission, invalidar cache `rbac:perms`, date-picker no app, extrair `@vero/mobile-shared`, modelos Professional/Room, `docker-compose.yml`, `start`→`dist/src/main.js`, lockout.

\- \*\*2026-06-21 · S18a — Contrato + assinatura eletrônica: backend (FECHA o backend da S18)\*\*  ·  \*S18 DIVIDIDA em S18a (esta) + S18b (tela de assinatura)\*

  \- \*O que foi feito:\* motor de contrato + assinatura eletrônica com trilha de evidência. Schema: \*\*`Contract`\*\* (budgetId `@unique` = 1 por orçamento, patientId, `body` snapshot imutável, `contentHash` sha256, `status` enum `ContractStatus` DRAFT/SIGNED/CANCELLED, `signedAt`, soft-delete) + \*\*`Signature`\*\* (§6 Consent/Signature; §7 trilha: `signerName`, `signedHash`, `ip`, `userAgent?`, `method` CLICK/ICP, `signedAt`) + migration aditiva. \*\*`EsignService`\*\* (integrations/esign, puro/testável): `buildContractBody` (texto determinístico do orçamento), `contentHash` (sha256 hex), `buildEvidence` (signedHash=contentHash no momento), `verify` (re-hash do body == contentHash E assinaturas == contentHash → tamper-evident). Módulo `contract`: `ContractService` tenant-scoped (anti-IDOR `ensureOwned`→403) — `generate` (de orçamento \*\*APPROVED\*\*; senão 400; 1 por orçamento senão 409), `sign` (paciente owner-scoped; só DRAFT senão 409; `$transaction` cria Signature + marca SIGNED+signedAt), `verify`. \*\*2 controllers:\* `ContractController` (EQUIPE, gated `budget:write/read`: POST /contracts, GET /contracts/:id, GET /contracts/:id/verify) + `MeContractController` (\*\*`@Patient`\*\*: GET /me/contracts, GET /me/contracts/:id, POST /me/contracts/:id/sign — captura IP via `@Ip()` + user-agent via `@Headers`).\*

  \- \*Arquivos tocados:\* `apps/api/prisma/schema.prisma` (+Contract +Signature +enum +back-relations Tenant/Budget/Patient), `apps/api/prisma/migrations/*_s18_contract/` (aditiva), `apps/api/src/integrations/esign/esign.service.ts` (novo), `apps/api/src/contract/{contract.service,contract.controller,me-contract.controller,contract.module}.ts` + `contract/dto/contract.dto.ts` (novos), `apps/api/src/app.module.ts` (+ContractModule), teste `apps/api/test/esign.service.spec.ts` (5 casos). Sem dep nova (`crypto` é nativo). \*Permissions: reusei `budget:*` (contrato fecha o orçamento) — sem novas permissions/re-seed.\*

  \- \*Decisões:\* \*\*assinatura eletrônica simples\*\* (trilha IP+timestamp+hash) como mecanismo base — já é juridicamente válida e atende "evidência verificável + documento imutável (hash)"; o proxy p/ \*\*ICP qualificada\*\* (Clicksign/D4Sign/BirdID) é o gancho `method:ICP`/futuro no EsignService (como o stub da Evolution na S12, sem credenciais reais agora). Contrato gerado pela EQUIPE (budget:write), assinado pelo \*\*PACIENTE\*\* (@Patient owner-scoped). `body` é snapshot imutável; `signedHash` no ato prova que o assinado == atual. Reusei `budget:*` em vez de criar `contract:*` (evita re-seed/flush de cache).

  \- \*Verificação:\* `pnpm lint` (8/8)/`test` (107 pass, 2 skip; +5)/`build`/`format:check`/`audit` (0 high/critical; 1 moderate dev-only) \*\*verdes\*\*. \*\*AO VIVO\*\* (orçamento aprovado da S17): gerar contrato → verify \*\*não-assinado `valid:false`\*\* (integrityOk true, signaturesOk false) → gerar de novo → \*\*409\*\* → paciente vê (DRAFT) → \*\*assinar → SIGNED + 1 assinatura com IP\*\* → verify pós-assinatura \*\*`valid:true`\*\* → re-assinar → \*\*409\*\*. Imutabilidade/adulteração coberta por unit test (body alterado → integrityOk false).

  \- \*Pendências p/ próxima:\* \*\*S18b\*\* — tela de assinatura: o paciente abre o contrato (`GET /me/contracts/:id` mostra `body`+status), lê e toca "Assinar" (`POST /me/contracts/:id/sign`) — no app do paciente (mobile) e/ou web; a equipe vê o contrato + verify na web. api-client/lib +métodos. Herdadas: as de sempre + integração ICP real quando houver credenciais.

\- \*\*2026-06-21 · S18b — Assinatura: tela no app do paciente + gerar contrato no web (FECHA a S18)\*\*

  \- \*O que foi feito:\* fechou o fluxo de contrato nas superfícies de cliente. \*\*Mobile (paciente):\* `lib/api.ts` +`myContracts`/`getContract`/`signContract` (+tipos `ContractSummary`/`ContractDetail`); tela `app/contracts.tsx` (lista com badge DRAFT="Aguardando assinatura"/SIGNED) → `app/contract/[id].tsx` (mostra o `body` em monospace + botão \*\*"Assinar contrato"\*\* só se DRAFT, com `Alert` de confirmação avisando que registra data/hora/IP → `POST /me/contracts/:id/sign` → mostra "✓ Assinado por … em …"); link "Meus contratos" na home (ao lado de "Agendar consulta").\* \*\*Web (equipe):\* `getBudget` passou a incluir `contract {id,status}`; api-client +`generateContract` + `BudgetDetail.contract`; no detalhe do orçamento (`budget-detail.tsx`), quando \*\*APPROVED\*\*, seção "Contrato": botão \*\*"Gerar contrato"\*\* (se não há) ou status ("Aguardando assinatura do paciente"/"Assinado pelo paciente"); Server Action `generateContractAction`.\*

  \- \*Arquivos tocados:\* `apps/mobile-patient/{lib/api.ts,app/contracts.tsx (novo),app/contract/[id].tsx (novo),app/index.tsx}`, `apps/api/src/budget/budget.service.ts` (getBudget +contract), `packages/api-client/src/index.ts` (+generateContract +tipo), `apps/web/app/orcamentos/{actions.ts,[id]/budget-detail.tsx}`. Sem migration, sem dep nova.

  \- \*Decisões:\* assinatura no app do paciente (logado, owner-scoped) — o `@Ip()` do backend captura o IP real na trilha. `Alert` de confirmação deixa explícito o registro de data/hora/IP (transparência). No web a equipe \*\*gera\*\* e vê o status (não assina pelo paciente). Sem página web dedicada de visualização/verify do contrato p/ a equipe ainda (o backend `GET /contracts/:id` + `/verify` existem; UI fica como melhoria) — o status na tela do orçamento já fecha o loop do aceite.

  \- \*Verificação:\* `pnpm lint` (8/8, inclui `tsc` do mobile)/`test` (107 pass)/`format:check`/`audit` (0 high/critical; 1 moderate dev-only) \*\*verdes\*\*. \*\*`npx expo export`\*\* empacotou o paciente (telas `contracts` + `contract/[id]` resolvem no Metro). \*\*AO VIVO (web, Playwright):\* detalhe do orçamento APROVADO → \*\*"Gerar contrato" → "Aguardando assinatura do paciente"\*\* (contrato DRAFT criado).\* Assinatura em si (`/me/contracts/:id/sign`) validada AO VIVO na S18a; \*falta só (do usuário):\* assinar pela tela em device.

  \- \*Pendências p/ próxima:\* \*\*S18 COMPLETA.\*\* Próxima no backlog: \*\*S19 — Charge/Installment + Asaas\*\* (transformar venda em cobranças PIX/boleto/cartão; `Charge`+`Installment`+`PixCharge`+`Boleto`+`CardTransaction`; `integrations/asaas` proxy backend; aprovar orçamento gera parcelas + cobrança via Asaas sandbox). Herdadas: integração ICP real, página web de verify do contrato p/ equipe, navegação comum web, as de sempre.

\- \*\*2026-06-21 · S19a — Cobrança (Charge/Installment) + Asaas: backend\*\*  ·  \*S19 DIVIDIDA em S19a (esta) + S19b (tela web)\*

  \- \*O que foi feito:\* venda → cobranças. Schema: \*\*`Charge`\*\* (budgetId `@unique` = 1 por orçamento, patientId, `totalCents`, `method` enum `PaymentMethod` PIX/BOLETO/CARD, `status` `ChargeStatus` PENDING/PARTIAL/PAID/CANCELLED, soft-delete) + \*\*`Installment`\*\* (number, `amountCents`, dueDate, `status` `InstallmentStatus`, e os artefatos de pagamento CONSOLIDADOS: `asaasPaymentId`/`pixPayload`/`boletoBarcode` — §6 lista PixCharge/Boleto/CardTransaction separados; uni no Installment p/ o MVP, §8) + migration aditiva. \*\*`AsaasService`\*\* (integrations/asaas, proxy §7 espelhando a Evolution): `createPayment` POST `${ASAAS_API_URL}/payments` (header `access_token`, valor em REAIS convertido dos centavos, billingType por método), \*\*anti-SSRF\*\* (URL só da base, bloqueia host interno em prod), timeout 10s, \*\*fail-closed\*\* sem config; getter `configured`. `BillingService`: `createCharge` valida orçamento \*\*APPROVED\*\* + owned (anti-IDOR), 1 por orçamento (409), \*\*split EXATO no servidor\*\* (`splitCents` — resto distribuído 1c nas primeiras; util puro testável) + vencimentos mensais (`monthlyDueDates`), gera a cobrança Asaas por parcela ANTES de persistir (fail-closed limpo) e cria Charge+Installments em `$transaction`; se Asaas não configurado, gera só as parcelas (warn). `BillingController` (POST /charges, GET /charges, GET /charges/:id, gated `billing:write/read`). Envs `ASAAS_API_URL`/`ASAAS_API_KEY` opcionais (env.validation + .env.example).

  \- \*Arquivos tocados:\* `apps/api/prisma/schema.prisma` (+Charge +Installment +3 enums +back-relations), `apps/api/prisma/migrations/*_s19_charge/` (aditiva), `apps/api/src/config/env.validation.ts` + `apps/api/.env.example` (+Asaas), `apps/api/src/integrations/asaas/asaas.service.ts` (novo), `apps/api/src/billing/{billing.util,billing.service,billing.controller,billing.module}.ts` + `billing/dto/billing.dto.ts` (novos), `apps/api/src/app.module.ts` (+BillingModule), testes `apps/api/test/{billing.util,billing.service}.spec.ts` (7 casos). Sem dep nova. \*Permissions `billing:*` já existiam — sem re-seed.\*

  \- \*Decisões:\* \*\*split no servidor\*\* (`splitCents` soma exata; §S19 "valores conferidos no servidor") — o front NUNCA manda valor de parcela. PixCharge/Boleto/CardTransaction consolidados em campos do Installment (MVP; separar depois se precisar de histórico por método). Asaas como proxy fail-closed/anti-SSRF (mesmo padrão Evolution/ICP) — \*\*sem credenciais reais; validado com stub local\*\* (como S12). Cobrança Asaas feita ANTES da transação (se falhar, nada persiste). Sem credenciais → gera só as parcelas (resiliente, mas a S19 "via Asaas" exige config).

  \- \*Verificação:\* `pnpm lint` (8/8)/`test` (114 pass, 2 skip; +7)/`build`/`format:check`/`audit` (0 high/critical; 1 moderate dev-only) \*\*verdes\*\*. \*\*AO VIVO\*\* (stub Asaas em `localhost:9090`, ASAAS_API_URL apontado p/ ele): orçamento aprovado (total \*\*29000\*\*) → criar cobrança \*\*PIX 3x\*\* → parcelas \*\*9667/9667/9666 (soma exata, split no servidor)\*\*, vencimentos mensais 07-10/08-10/09-10, cada uma com \*\*pixPayload + asaasPaymentId\*\* do Asaas; re-criar → \*\*409\*\*; token de paciente em `/charges` → \*\*403\*\*.

  \- \*Pendências p/ próxima:\* \*\*S19b\*\* — tela web: no detalhe do orçamento APROVADO, "Gerar cobrança" (escolher método/nº parcelas/1º vencimento) → ver parcelas + PIX copia-e-cola/boleto; lista de cobranças. api-client +métodos. Herdadas: baixa automática (S20 webhook Asaas), Asaas real, as de sempre.

\- \*\*2026-06-21 · S19b — Cobrança: tela web (FECHA a S19)\*\*

  \- \*O que foi feito:\* UI de cobrança no web. `getBudget` passou a incluir `charge {id,status}`. \*\*api-client:\* +`createCharge`/`getCharge` + tipos `ChargeDetail`/`InstallmentDetail` + `BudgetDetail.charge`.\* No detalhe do orçamento (`budget-detail.tsx`), quando \*\*APPROVED\*\*, seção "Cobrança": se não há → form (método PIX/Boleto/Cartão + nº parcelas + 1º vencimento) → \*\*Server Action `createChargeAction`\*\* (redireciona p/ `/cobrancas/[id]`; trata 503 = Asaas não configurado); se há → link "Ver cobrança". Nova página \*\*`/cobrancas/[id]`\*\* (Server Component): cabeçalho (paciente, método, total) + lista de parcelas (número, vencimento, valor, status) com \*\*PIX copia-e-cola\*\* e linha do boleto (mono, `break-all`).

  \- \*Arquivos tocados:\* `apps/api/src/budget/budget.service.ts` (getBudget +charge), `packages/api-client/src/index.ts` (+2 métodos +tipos), `apps/web/app/orcamentos/{actions.ts,[id]/budget-detail.tsx}`, `apps/web/app/cobrancas/[id]/page.tsx` (novo). Sem migration, sem dep nova.

  \- \*Decisões:\* o front \*\*só escolhe método/parcelas/1º vencimento\*\* — os valores das parcelas vêm calculados do backend (S19a). Página de cobrança separada (`/cobrancas/[id]`) p/ não inchar o detalhe do orçamento. PIX/boleto exibidos como texto copiável (mono); copy-button fica como melhoria.

  \- \*Verificação:\* `pnpm lint` (8/8)/`test` (114 pass)/`format:check`/`audit` (0 high/critical; 1 moderate dev-only) \*\*verdes\*\*. \*\*AO VIVO (web, Playwright, stub Asaas):\* orçamento aprovado (R$160) → "Gerar cobrança" PIX 2x venc 15/08 → redireciona p/ `/cobrancas/[id]` mostrando \*\*Parcela 1 (15/08, R$80,00, PIX copia-e-cola) + Parcela 2 (15/09, R$80,00)\*\*, ambas Pendente.\*

  \- \*Pendências p/ próxima:\* \*\*S19 COMPLETA.\*\* Próxima no backlog: \*\*S20 — Baixa automática (reconciler)\*\* (`billing/asaas.webhook.controller.ts` valida assinatura; fila `payment-reconciler` idempotente; +`Payment`+`Reconciliation`; webhook de pagamento dá baixa na parcela; reprocesso não dá baixa dupla). Depende de S19. Herdadas: Asaas real, copy-button PIX, lista de cobranças no web, navegação comum web, as de sempre.

\- \*\*2026-06-21 · S20 — Baixa automática (reconciler) — webhook Asaas + fila idempotente\*\*

  \- \*O que foi feito:\* conciliação automática de pagamento. Schema: \*\*`Payment`\*\* (`installmentId @unique` → 1 pagamento por parcela = idempotência DURÁVEL; chargeId, amountCents, asaasPaymentId, paidAt) + \*\*`Reconciliation`\*\* (`paymentId @unique`, `@@unique([tenantId, eventKey])` — 2ª camada; eventKey = `event:asaasPaymentId`) + migration aditiva. \*\*`AsaasWebhookController`\*\* (`POST /integrations/asaas/webhook`, `@Public`, valida `ASAAS_WEBHOOK_SECRET` via header `asaas-access-token` em tempo constante, fail-closed; só PAYMENT_RECEIVED/CONFIRMED; enfileira e responde 200). Fila \*\*`payment-reconciler`\*\* (BullMQ, jobId `asaas-{event}-{paymentId}` dedup + DLQ ao esgotar). \*\*`ReconcileService.reconcile`\*\*: acha a parcela pelo `asaasPaymentId`, IDEMPOTENTE (já PAID → no-op; P2002 no create → no-op); em `$transaction` cria Payment + Reconciliation, marca parcela PAID+paidAt, e \*\*recalcula o status da Charge\*\* (PENDING/PARTIAL/PAID). Envs `ASAAS_WEBHOOK_SECRET` opcional.

  \- \*Arquivos tocados:\* `apps/api/prisma/schema.prisma` (+Payment +Reconciliation +back-relations), `apps/api/prisma/migrations/*_s20_payment/` (aditiva), `apps/api/src/config/env.validation.ts` + `.env.example` (+ASAAS_WEBHOOK_SECRET), `apps/api/src/billing/{reconcile.service,payment-reconciler,asaas.webhook.controller,billing.module}.ts` (novos/+queue), teste `apps/api/test/reconcile.service.spec.ts` (4 casos). Sem dep nova (BullMQ já existia). \*Permissions: webhook é `@Public` (segredo compartilhado), sem permission.\*

  \- \*Decisões:\* idempotência em \*\*2 camadas\*\* — estado (`Installment.status === PAID` → no-op rápido) + DB (`Payment.installmentId @unique` → P2002 no reprocesso → no-op). Webhook \*\*enfileira\*\* (não processa síncrono) — resiliente a retempestade do Asaas; jobId determinístico deduplica. Parcela resolvida por `asaasPaymentId` (não vem tenant no webhook; o id é único na conta Asaas) — multi-conta Asaas por tenant é futuro. `eventKey` na Reconciliation como 2ª barreira. Status da Charge recalculado a cada baixa.

  \- \*Verificação:\* `pnpm lint` (8/8)/`test` (118 pass, 2 skip; +4)/`build`/`format:check`/`audit` (0 high/critical; 1 moderate dev-only) \*\*verdes\*\*. \*\*AO VIVO\*\* (stub Asaas + ASAAS_WEBHOOK_SECRET, parcela da S19 asaasPaymentId `pay_stub_2`): webhook sem/segredo errado → \*\*401\*\*; webhook válido → \*\*enqueued\*\* → parcela \*\*PAID\*\*+paidAt + \*\*1 Payment\*\*; reprocesso do mesmo evento → \*\*ainda 1 Payment (sem baixa dupla)\*\*; status da Charge → \*\*PARTIAL\*\* (1 de 3 parcelas).

  \- \*Pendências p/ próxima:\* \*\*S20 COMPLETA.\*\* Próxima no backlog: \*\*S21 — App do Paciente: financeiro\*\* (endpoint "minhas parcelas" owner-scoped; telas mobile: ver próxima parcela, copiar PIX copia-e-cola / código de barras do boleto; teste anti-IDOR — paciente não vê parcela de outro). Depende de S19+S8. Herdadas: Asaas real, copy-button PIX no web, lista de cobranças no web, navegação comum web, as de sempre.

\- \*\*2026-06-21 · S21 — App do Paciente: financeiro (ver parcelas + copiar PIX/boleto)\*\*

  \- \*O que foi feito:\* o paciente vê e copia o pagamento das próprias parcelas. \*\*Backend:\* `MeService.myInstallments` + `GET /me/installments` (\*\*`@Patient`\*\*, owner-scoped) — lista as parcelas das cobranças DO paciente via filtro `charge.patientId` (anti-IDOR), pendentes primeiro (enum) e por vencimento; retorna valor/venc/status + `pixPayload`/`boletoBarcode` + método.\* \*\*Mobile:\* `lib/api.ts` +`myInstallments` (+tipo `InstallmentSummary`); +dep \*\*`expo-clipboard`\*\*; tela `app/financeiro.tsx` (cards: Parcela N · valor · status, "Vence em DD/MM", botões \*\*"Copiar PIX copia-e-cola"\*\* e "Copiar código do boleto" só em parcela não-paga → `Clipboard.setStringAsync` + Alert "Copiado"); link "Financeiro" na home.\*

  \- \*Arquivos tocados:\* `apps/api/src/me/{me.service,me.controller}.ts`, `apps/api/test/me.service.spec.ts` (+1 anti-IDOR), `apps/mobile-patient/{lib/api.ts,app/financeiro.tsx (novo),app/index.tsx,package.json}` + `pnpm-lock.yaml`. Sem migration, sem backend novo além do endpoint.

  \- \*Decisões:\* owner-scope por \*\*`charge.patientId`\*\* (Installment não tem patientId direto — filtra pela relação charge). `expo-clipboard` (módulo Expo padrão) p/ copiar PIX/boleto — copy-button é o cerne do "paciente paga". Botões de cópia só em parcela não-paga. `@Patient` garante 403 p/ token de equipe. Sem ação de "pagar no app" (PIX/boleto são pagos fora; o app só exibe/copia) — alinhado ao aceite.

  \- \*Verificação:\* `pnpm lint` (8/8, inclui `tsc` do mobile)/`test` (119 pass, 2 skip; +1)/`format:check`/`audit` (0 high/critical; 1 moderate dev-only) \*\*verdes\*\*; \*\*expo-doctor 21/21\*\* + \*\*`expo export`\*\* empacotou (financeiro + expo-clipboard resolvem no Metro). \*\*AO VIVO\*\* (paciente demo, cobrança 3x da S19 com 1 parcela paga na S20): `GET /me/installments` → \*\*3 parcelas\*\* (2 PENDING com PIX + 1 PAID, pendentes primeiro); token de equipe → \*\*403\*\*. Anti-IDOR coberto por unit test (filtro tenant+charge.patientId).

  \- \*Pendências p/ próxima:\* \*\*S21 COMPLETA.\*\* Próxima no backlog: \*\*S22 — Régua de cobrança\*\* (`CollectionRule`+`CollectionEvent`; fila `collection-ruler` cron diário; lembretes D-3/D0/D+X via WhatsApp, idempotente por (parcela, etapa), respeita opt-out). Depende de S19+S12. Herdadas: Asaas real, copy-button PIX no web, navegação comum web, as de sempre.

\- \*\*2026-06-21 · S22 — Régua de cobrança (cron + lembretes WhatsApp escalonados)\*\*

  \- \*O que foi feito:\* lembretes/cobranças automáticos. Schema: \*\*`CollectionRule`\*\* (tenantId, active, `steps Json` = `[{offsetDays, template}]`, offsetDays<0 antes do venc/0 no venc/>0 após) + \*\*`CollectionEvent`\*\* (`@@unique([installmentId, stepKey])` → IDEMPOTÊNCIA por parcela+etapa) + `Patient.messagingOptOut` (opt-out de mensagens automáticas) + migration aditiva. \*\*`CollectionService.runDueCollections(now)`\*\*: p/ cada régua ativa × etapa, acha parcelas PENDENTES cujo vencimento = `hoje − offsetDays` (`dueDateRangeForStep`), \*\*excluindo paciente com `messagingOptOut`\*\* (filtro na query), registra `CollectionEvent` (unique → não reenvia) e envia WhatsApp (`WhatsAppService.sendText`, best-effort/registrado). Fila \*\*`collection-ruler`\*\* (`CollectionRulerScheduler` adiciona repeatable job cron `0 8 * * *` no boot; `CollectionRulerProcessor` chama o service). Utils puros (`parseSteps`/`dueDateRangeForStep`/`renderTemplate`).

  \- \*Arquivos tocados:\* `apps/api/prisma/schema.prisma` (+CollectionRule +CollectionEvent +Patient.messagingOptOut +back-relations), `apps/api/prisma/migrations/*_s22_collection/` (aditiva), `apps/api/src/collection/{collection.util,collection.service,collection-ruler,collection.module}.ts` (novos), `apps/api/src/app.module.ts` (+CollectionModule), testes `apps/api/test/{collection.util,collection.service}.spec.ts` (8 casos). Sem dep nova (BullMQ/WhatsApp já existiam). \*Permissions: nenhuma (cron interno).\*

  \- \*Decisões:\* etapas como \*\*JSON\*\* na régua (flexível, sem modelo Step; §8). Idempotência por \*\*unique (installmentId, stepKey)\*\* — registra o evento ANTES de enviar; se já existe → pula (não reenvia, mesmo aceite). Envio \*\*best-effort\*\* (evento registrado garante não-reenvio; falha de WhatsApp é logada, não retenta no mesmo dia — reminder, não crítico). Opt-out via novo `Patient.messagingOptOut` (filtrado na query). Régua resolvida por tenant; 1 régua padrão por tenant (criável via seed/script). Cron via repeatable job BullMQ (jobId fixo não duplica).

  \- \*Verificação:\* `pnpm lint` (8/8)/`test` (127 pass, 2 skip; +8)/`build`/`format:check`/`audit` (0 high/critical; 1 moderate dev-only) \*\*verdes\*\*. \*\*AO VIVO\*\* (contexto Nest + stub Evolution na 9091 + régua D-3/D0/D+5 semeada): 1ª execução no dia do venc (D0) → \*\*enviou + 1 CollectionEvent\*\*; 2ª execução mesmo dia → \*\*skipped, ainda 1 evento (não reenvia)\*\*; paciente com \*\*opt-out\*\* → \*\*0 eventos\*\* p/ a parcela dele. Script descartável removido.

  \- \*Pendências p/ próxima:\* \*\*S22 COMPLETA.\*\* Próxima no backlog: \*\*S23 — NFS-e\*\* (`integrations/nfse/nfse.service.ts` via integrador; fila `nfse-emitter` retry/backoff; +`Invoice`; emitir NFS-e em homologação a partir de um pagamento; falha → DLQ com motivo). Depende de S20. Herdadas: CRUD de régua na web (hoje via seed/script), `cron diário da confirmação D-1` (S12, ainda sem disparador — agora há padrão de cron p/ reusar), Asaas/Evolution reais, as de sempre.

\- \*\*2026-06-22 · S23 — NFS-e (emissão fiscal via integrador + fila)\*\*

  \- \*O que foi feito:\* emissão de nota fiscal a partir de um pagamento. Schema: \*\*`Invoice`\*\* (`paymentId @unique` → 1 NFS-e por pagamento, amountCents, `status` enum `InvoiceStatus` PENDING/ISSUED/FAILED, `externalId`/`number`/`pdfUrl`/`error` = retorno persistido) + migration aditiva. \*\*`NfseService`\*\* (integrations/nfse, proxy §7 espelha Asaas): `emit` POST `${NFSE_API_URL}/nfse` (Bearer, valor em reais convertido dos centavos, customer name/cpf), \*\*anti-SSRF\*\* (URL só da base, bloqueia host interno em prod), timeout 15s, \*\*fail-closed\*\* sem config. `InvoiceService.createForPayment`: valida pagamento owned (anti-IDOR 403), 1 por pagamento (409), cria Invoice PENDING e enfileira (`jobId nfse-{id}`). Fila \*\*`nfse-emitter`\*\* (BullMQ): `NfseEmitterProcessor` emite via integrador, marca \*\*ISSUED\*\* + número/pdf/externalId; \*\*idempotente\*\* (já ISSUED → no-op); falha → \*\*retry/backoff → DLQ + Invoice FAILED com o motivo\*\* (o `error` é gravado em TODA tentativa). `InvoiceController` (POST /invoices, GET /invoices/:id, gated `billing:write/read`). Envs `NFSE_API_URL`/`NFSE_API_KEY` opcionais.

  \- \*Arquivos tocados:\* `apps/api/prisma/schema.prisma` (+Invoice +enum +back-relations Tenant/Payment), `apps/api/prisma/migrations/*_s23_invoice/` (aditiva), `apps/api/src/config/env.validation.ts` + `.env.example` (+NFSE_*), `apps/api/src/integrations/nfse/nfse.service.ts` (novo), `apps/api/src/invoice/{invoice.service,invoice.controller,nfse-emitter,invoice.module}.ts` + `invoice/dto/invoice.dto.ts` (novos), `apps/api/src/app.module.ts` (+InvoiceModule), teste `apps/api/test/invoice.service.spec.ts` (3 casos). Sem dep nova. \*Permissions `billing:*` reusadas.\*

  \- \*Decisões:\* `Invoice.paymentId @unique` = idempotência (1 NFS-e por pagamento; re-emitir → 409). Emissão \*\*manual via endpoint\*\* (não auto no reconcile da S20) — explícito; auto-trigger fica como melhoria. PixCharge/Boleto não envolvidos. Proxy fail-closed/anti-SSRF (mesmo padrão Asaas/Evolution) — \*\*sem credenciais reais; validado com stub local\*\* (9092). `error` persistido em toda tentativa (observabilidade), DLQ + FAILED ao esgotar (mesmo mecanismo do push-sender S13b).

  \- \*Verificação:\* `pnpm lint` (8/8)/`test` (130 pass, 2 skip; +3)/`build`/`format:check`/`audit` (0 high/critical; 1 moderate dev-only) \*\*verdes\*\*. \*\*AO VIVO\*\* (stub NFS-e 9092, pagamento da S20): `POST /invoices` → worker emite → \*\*ISSUED, número 2026/2, pdf, externalId\*\* persistidos; \*\*falha\*\* (stub down) → Invoice ficou PENDING com \*\*`error: "fetch failed"` (motivo registrado)\*\*; re-emitir mesmo pagamento → \*\*409\*\*; token de paciente → \*\*403\*\*. \*Nota infra:\* processos `node ... &` morriam por SIGHUP ao sair o shell; reiniciados com `nohup`+`disown`.

  \- \*Pendências p/ próxima:\* \*\*S23 COMPLETA.\*\* Próxima no backlog: \*\*S24 — Recibos\*\* (`receipt/receipt.service.ts` gera PDF de um pagamento; endpoint; upload p/ DO Spaces com URL assinada de expiração curta). Depende de S20. Herdadas: auto-emitir NFS-e no reconcile, CRUD de régua na web, Asaas/Evolution/NFS-e reais, navegação comum web, as de sempre.

\- \*\*2026-06-22 · S24 — Recibos (PDF + URL assinada de expiração curta)\*\*

  \- \*O que foi feito:\* comprovante PDF de pagamento. Schema: \*\*`Receipt`\*\* (`paymentId @unique` → 1 recibo por pagamento, `number`) + migration aditiva. \*\*Dep nova `pdfkit`\*\* (+`@types/pdfkit`). `ReceiptService`: `issue` (valida pagamento owned anti-IDOR, cria/reusa Receipt com número sequencial `REC-00001`, devolve URL assinada); `generatePdf` (gera o PDF SOB DEMANDA com pdfkit — nome da clínica, RECIBO, paciente, valor, data do pagamento; NÃO persiste blob); \*\*URL assinada própria\*\* (token = `receiptId.exp.HMAC-SHA256` com o JWT_SECRET; TTL 5min) — `signedUrl`/`verifyToken` (valida assinatura em tempo constante + expiração). `ReceiptController`: `POST /receipts` (`billing:read`) → `{url, expiresAt}`; \*\*`GET /receipts/file/:token`\*\* (`@Public`, valida o token → stream `application/pdf` via `StreamableFile`).

  \- \*Arquivos tocados:\* `apps/api/prisma/schema.prisma` (+Receipt +back-relations), `apps/api/prisma/migrations/*_s24_receipt/` (aditiva), `apps/api/src/receipt/{receipt.service,receipt.controller,receipt.module}.ts` + `receipt/dto/receipt.dto.ts` (novos), `apps/api/src/app.module.ts` (+ReceiptModule), `apps/api/package.json` (+pdfkit/@types/pdfkit) + lockfile, teste `apps/api/test/receipt.service.spec.ts` (4 casos). \*Permissions `billing:read` reusada.\*

  \- \*Decisões:\* \*\*URL assinada própria (HMAC+exp)\*\* em vez do upload ao DO Spaces — entrega exatamente "URL assinada de expiração curta" (mesmo conceito da presigned URL do S3) sem credenciais; o \*\*upload ao Spaces fica como troca de produção\*\* (desvio do §7 documentado, como PixCharge na S19). PDF gerado \*\*sob demanda\*\* ao acessar a URL (não persiste blob — recibo é pequeno e determinístico). Rota do arquivo é `@Public` (o token É a credencial). `paymentId @unique` → idempotência. Número sequencial por tenant (`count+1`; pequena corrida aceita no MVP).

  \- \*Verificação:\* `pnpm lint` (8/8)/`test` (134 pass, 2 skip; +4)/`build`/`format:check`/`audit` (0 high/critical; 1 moderate dev-only — pdfkit sem vulns) \*\*verdes\*\*. \*\*AO VIVO\*\*: `POST /receipts` → `{url assinada, expiresAt 5min}`; baixar a URL \*\*sem auth\*\* → \*\*200 `application/pdf`, começa com `%PDF-` (1602 bytes)\*\*; token adulterado → \*\*404\*\*; token expirado/receiptId trocado → 404 (unit); token de paciente em POST → \*\*403\*\*.

  \- \*Pendências p/ próxima:\* \*\*S24 COMPLETA.\*\* \*\*FECHA a FASE 2 financeira/comercial (S16–S24).\*\* Próxima no backlog: \*\*S25 — SPC consulta + inclusão\*\* (`integrations/spc/spc.service.ts` anti-SSRF + fila `spc-query`; +`CreditCheck`; consultar score (sandbox) antes de parcelar; inclusão de inadimplente registrada e auditada; consentimento/base legal). Depende de S5+S19. Herdadas: upload real ao DO Spaces, auto-emitir NFS-e/recibo no reconcile, CRUD de régua na web, integrações reais, navegação comum web, as de sempre.

\- \*\*2026-06-22 · S25 — SPC/Serasa: consulta de score + inclusão de inadimplente\*\*

  \- \*O que foi feito:\* bureau de crédito. \*\*Auditoria:\* +2 ações `CREDIT_CHECK`/`CREDIT_INCLUSION` (fonte única em @vero/types AUDIT_ACTIONS + enum `AuditAction` espelhado no schema, migration `ALTER TYPE ADD VALUE`).\* Schema: \*\*`CreditCheck`\*\* (patientId, `kind` enum QUERY/INCLUSION, `status` PENDING/DONE/FAILED, `consent` Boolean = base legal, `score?` (consulta), `amountCents?` (inclusão), externalId/error) + migration. \*\*`SpcService`\*\* (integrations/spc, proxy §7 espelha Asaas): `query(cpf)`→score, `include({cpf,amount,desc})`→protocolo; \*\*anti-SSRF\*\* (URL só da base), timeout 12s, \*\*fail-closed\*\* sem config. `CreditService.create`: \*\*exige consentimento\*\* (senão 400), valida paciente owned (anti-IDOR 403) + com CPF, INCLUSION exige valor; cria CreditCheck PENDING, \*\*AUDITA\*\* (CREDIT_CHECK/CREDIT_INCLUSION, sem PII — só ids), enfileira (`spc-query`). Fila \*\*`spc-query`\*\* (`SpcQueryProcessor`): por kind chama query/include → DONE+score/externalId; idempotente (DONE→no-op); falha → retry/backoff → DLQ + FAILED com motivo. `CreditController` (POST /credit-checks billing:write, GET /:id billing:read). Envs `SPC_*` opcionais.

  \- \*Arquivos tocados:\* `packages/types/src/rbac.ts` (+2 ações), `apps/api/prisma/schema.prisma` (+CreditCheck +2 enums +AuditAction +2 valores +back-relations), `apps/api/prisma/migrations/*_s25_credit_check/` (aditiva), `apps/api/src/config/env.validation.ts` + `.env.example` (+SPC_*), `apps/api/src/integrations/spc/spc.service.ts` (novo), `apps/api/src/credit/{credit.service,credit.controller,credit.module,spc-query}.ts` + `credit/dto/credit.dto.ts` (novos), `apps/api/src/app.module.ts` (+CreditModule), teste `apps/api/test/credit.service.spec.ts` (5 casos). Sem dep nova. \*Permissions `billing:*` reusadas; sem re-seed (audit enum não precisa de seed).\*

  \- \*Decisões:\* +2 ações de auditoria dedicadas (não SENSITIVE_READ genérico) p/ rastrear crédito (consulta E inclusão) — mesmo padrão do ACCOUNT_DELETED (S10a). \*\*Consentimento obrigatório\*\* (LGPD/base legal) validado no service. CPF do paciente vai no corpo (anti-SSRF). Processamento \*\*assíncrono\*\* (fila spc-query) — bureau instável; o caller cria e depois consulta o resultado (GET). `actorId` da auditoria vem do `@CurrentPrincipal` (staff.userId). Stub local valida (sem credenciais reais).

  \- \*Verificação:\* `pnpm lint` (8/8)/`test` (139 pass, 2 skip; +5)/`build`/`format:check`/`audit` (0 high/critical; 1 moderate dev-only) \*\*verdes\*\*. \*\*AO VIVO\*\* (stub SPC 9093): consultar SEM consentimento → \*\*400\*\*; consulta → worker → \*\*DONE score=742 + externalId\*\*; inclusão (R$500) → \*\*DONE + externalId\*\*; \*\*AuditLog: CREDIT_CHECK=1, CREDIT_INCLUSION=1\*\* (tudo auditado); token de paciente → \*\*403\*\*. Anti-IDOR/guards por unit test.

  \- \*Pendências p/ próxima:\* \*\*S25 COMPLETA.\*\* Próxima no backlog: \*\*S26 — Prontuário (MedicalRecord) + anexos\*\* (início da FASE 3 clínica: `MedicalRecord`/`RecordEntry`/`Attachment`; upload p/ Spaces URL assinada; cifra em repouso; acesso gera `SENSITIVE_READ` no AuditLog; anti-IDOR). Depende de S5. Herdadas: integrações reais (Asaas/Evolution/NFS-e/SPC), upload real ao Spaces, CRUD de régua na web, navegação comum web, as de sempre.

\- \*\*2026-06-22 · S26 — Prontuário (MedicalRecord) + anexos — INÍCIO DA FASE 3 (clínica)\*\*

  \- \*O que foi feito:\* registro clínico seguro. Schema: \*\*`MedicalRecord`\*\* (1 por paciente, `patientId @unique`) + \*\*`RecordEntry`\*\* (`contentEnc` = evolução CIFRADA em repouso, `authorId`=profissional) + \*\*`Attachment`\*\* (`dataEnc Bytes` = imagem/exame CIFRADO, filename/contentType) + migration. \*\*`CryptoService`\*\* (AES-256-GCM, §4 cifra em repouso): chave = `sha256(JWT_SECRET)` (sem nova env), IV aleatório por cifragem, authTag GCM = tamper-evident; `encrypt/decrypt` (Buffer) + `encryptString/decryptString`; formato `base64(iv|tag|ciphertext)`. `RecordService` tenant-scoped (anti-IDOR `ensureOwned` no paciente ANTES de tocar o prontuário): `viewRecord` (decifra entradas + devolve anexos com \*\*URL assinada fresca\*\* + \*\*AUDITA SENSITIVE_READ\*\*), `addEntry`/`addAttachment` (cifram), `serveAttachment` (valida token → decifra → AUDITA SENSITIVE_READ). Anexos por \*\*URL assinada\*\* própria (HMAC+exp 5min, como S24). `RecordController`: `GET /records/:patientId` (`record:read`), `POST /records/:patientId/{entries,attachments}` (`record:write`), \*\*`GET /records/attachments/:token`\*\* (`@Public`, stream `StreamableFile` com contentType do anexo).

  \- \*Arquivos tocados:\* `apps/api/prisma/schema.prisma` (+3 modelos +back-relations Tenant/Patient/User), `apps/api/prisma/migrations/*_s26_medical_record/` (aditiva), `apps/api/src/record/{crypto.service,record.service,record.controller,record.module}.ts` + `record/dto/record.dto.ts` (novos), `apps/api/src/app.module.ts` (+RecordModule), teste `apps/api/test/crypto.service.spec.ts` (4 casos). Sem dep nova (`crypto` nativo). \*Permissions `record:*` reusadas.\*

  \- \*Decisões:\* \*\*cifra AES-256-GCM\*\* com chave derivada do JWT_SECRET (sha256) — sem nova env/segredo; o authTag dá integridade (decifrar adulterado falha). Anexos: bytes \*\*cifrados no DB\*\* + servidos por URL assinada de exp curta (upload ao \*\*DO Spaces\*\* = troca de produção, desvio §7 documentado como S24). Upload via \*\*base64 no JSON\*\* (não multipart) p/ simplicidade/testabilidade (limite 8MB). `SENSITIVE_READ` auditado em TODA leitura (ver prontuário + baixar anexo). `viewRecord` faz `upsert` do prontuário (cria na 1ª visualização).

  \- \*Verificação:\* `pnpm lint` (8/8)/`test` (143 pass, 2 skip; +4 crypto round-trip/tamper)/`build`/`format:check`/`audit` (0 high/critical; 1 moderate dev-only) \*\*verdes\*\*. \*\*AO VIVO\*\*: add entrada+anexo → ver prontuário \*\*decifra\*\* o conteúdo; baixar anexo pela \*\*URL assinada sem auth\*\* → bytes originais (image/png); \*\*cifra em repouso confirmada no banco\*\* (`contentEnc LIKE '%dente%'` = false); \*\*AuditLog SENSITIVE_READ\*\* gravado; token adulterado → 404; token de paciente → 403.

  \- \*Pendências p/ próxima:\* \*\*S26 COMPLETA.\*\* Próxima no backlog: \*\*S27 — Odontograma\*\* (`Odontogram`/`ToothCondition`; `odontogram/service.ts`; componente SVG interativo no web; marcar condição por dente/face e persistir vinculado ao prontuário). Depende de S26. Herdadas: tela web do prontuário (hoje só API), upload real ao Spaces, integrações reais, CRUD de régua na web, as de sempre.

\- \*\*2026-06-22 · S27a — Odontograma: backend (mapa dental vinculado ao prontuário)\*\*  ·  \*S27 DIVIDIDA em S27a (esta) + S27b (SVG no web)\*

  \- \*O que foi feito:\* base do odontograma. \*\*`@vero/types/odontogram`\*\* (fonte única reusada no web S27b): `TOOTH_FACES` (MESIAL/DISTAL/OCCLUSAL/VESTIBULAR/LINGUAL/WHOLE), `TOOTH_CONDITIONS` (HEALTHY/CARIES/RESTORATION/ABSENT/EXTRACTED/IMPLANT/CROWN/ROOT_CANAL/FRACTURE/SEALANT — cada uma com `label`+`color` p/ o SVG), `FDI_PERMANENT_TEETH` (32 dentes), schemas Zod + `isValidToothNumber`. Schema: \*\*`Odontogram`\*\* (`recordId @unique` = 1 por prontuário) + \*\*`ToothCondition`\*\* (`toothNumber` Int FDI, `face`/`condition` String validados contra @vero/types, `@@unique([odontogramId, toothNumber, face])`) + migration. `OdontogramService` tenant-scoped (anti-IDOR `ensureOwned` no paciente; cria prontuário+odontograma sob demanda): `view` (lista condições + \*\*AUDITA SENSITIVE_READ\*\*), `setCondition` (upsert por dente/face; \*\*`HEALTHY` → delete\*\* = saudável é o padrão; devolve a lista atualizada). `OdontogramController`: `GET /odontogram/:patientId` (`record:read`), `PUT /odontogram/:patientId/conditions` (`record:write`).

  \- \*Arquivos tocados:\* `packages/types/src/{odontogram.ts (novo),index.ts}`, `apps/api/prisma/schema.prisma` (+Odontogram +ToothCondition +back-relations Tenant/MedicalRecord), `apps/api/prisma/migrations/*_s27_odontogram/` (aditiva), `apps/api/src/odontogram/{odontogram.service,odontogram.controller,odontogram.module}.ts` + `odontogram/dto/odontogram.dto.ts` (novos), `apps/api/src/app.module.ts` (+OdontogramModule), teste `apps/api/test/odontogram.service.spec.ts` (3 casos). Sem dep nova. \*Permissions `record:*` reusadas.\*

  \- \*Decisões:\* faces/condições como \*\*String validado contra const de @vero/types\*\* (não enum Prisma) — sem migration p/ novas condições e a MESMA lista alimenta o SVG do web (cores/labels). `HEALTHY` não persiste (= limpar) → o odontograma guarda só o que tem condição. `@@unique([odontogramId, toothNumber, face])` → setar substitui. Odontograma é 1:1 com o prontuário (reusa o MedicalRecord da S26). `setCondition` devolve a lista completa p/ o web re-renderizar.

  \- \*Verificação:\* `pnpm lint` (8/8)/`test` (146 pass, 2 skip; +3)/`build`/`format:check`/`audit` (0 high/critical; 1 moderate dev-only) \*\*verdes\*\*. \*\*AO VIVO\*\*: marcar 11/OCCLUSAL=CARIES e 21/WHOLE=IMPLANT → \*\*GET persiste ambas (render ao reabrir)\*\*; `HEALTHY` no 11 → \*\*removido\*\* (só 21 resta); dente FDI 99 → \*\*400\*\*; \*\*SENSITIVE_READ auditado\*\*; token de paciente → \*\*403\*\*.

  \- \*Pendências p/ próxima:\* \*\*S27b\*\* — componente SVG interativo no web: render dos 32 dentes (FDI), clicar dente/face → escolher condição → `PUT /odontogram/:patientId/conditions`; cores de @vero/types; reabrir mostra o estado salvo. api-client +`getOdontogram`/`setToothCondition`. Herdadas: tela web do prontuário (S26 só API), as de sempre.



\## 12. BIBLIOTECA DE INSTRUÇÕES PRONTAS (colar nos prompts de sessão)



\## 12. BIBLIOTECA DE INSTRUÇÕES PRONTAS (colar nos prompts de sessão)



\## 12. BIBLIOTECA DE INSTRUÇÕES PRONTAS (colar nos prompts de sessão)



\## 12. BIBLIOTECA DE INSTRUÇÕES PRONTAS (colar nos prompts de sessão)



\## 12. BIBLIOTECA DE INSTRUÇÕES PRONTAS (colar nos prompts de sessão)



\## 12. BIBLIOTECA DE INSTRUÇÕES PRONTAS (colar nos prompts de sessão)



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

